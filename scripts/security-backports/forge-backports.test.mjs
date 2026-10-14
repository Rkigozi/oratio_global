import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  constants,
  createHash,
  generateKeyPairSync,
  privateEncrypt,
  sign,
  verify,
} from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { FORGE_BASE_HASH, FORGE_PATCHED_HASH, verifyForgeBackport } from './forge-backport.mjs';

// Comparison patches only touch disposable copies; installed source is verified too.
const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const root = fileURLToPath(new URL('../../', import.meta.url));
const forgeRoot = dirname(require.resolve('node-forge/package.json'));
const expoRoot = dirname(require.resolve('@expo/code-signing-certificates/package.json'));
const digest = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const sourceFiles = [
  join(root, 'package-lock.json'),
  join(forgeRoot, 'lib/rsa.js'),
  join(expoRoot, 'build/main.js'),
];
const originalHashes = sourceFiles.map(digest);

assert.equal(require('node-forge/package.json').version, '1.4.0');
assert.equal(require('@expo/code-signing-certificates/package.json').version, '0.0.6');
assert.equal(
  originalHashes[1],
  FORGE_PATCHED_HASH,
  'Forge source changed: review the candidate patches before updating this pin'
);
verifyForgeBackport();
assert.equal(
  originalHashes[2],
  '3670cfbd69934b475257649886517d0314890ca4139708d2c812efaab04bc6d1',
  'Expo helper source changed: review compatibility before updating this pin'
);

const temp = mkdtempSync(join(tmpdir(), 'oratio-forge-assessment-'));
after(() => {
  try {
    assert.deepEqual(sourceFiles.map(digest), originalHashes);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

const variants = [
  { name: 'Published 1.4.0 control', patch: null },
  {
    name: 'PR #1152 count-only',
    patch: 'forge-1152-rsa.patch',
    hash: '50d8e3f38443736858c2c81dc2b569c18083e687f81acc5f9c17a568a7e4f6f6',
  },
  {
    name: 'PR #1159 canonical',
    patch: 'forge-1159-rsa.patch',
    hash: 'be8e74c1d011bab844d9e2705f7a5f6428f444b28fa174cdad1572a45ef8f618',
  },
  { name: 'Installed verified Node backport', installed: true },
].map((variant) => {
  if (variant.installed) {
    return {
      ...variant,
      forge: require(join(forgeRoot, 'lib/index.js')),
      expo: require(join(expoRoot, 'build/main.js')),
    };
  }
  const modules = join(temp, variant.patch ?? 'baseline', 'node_modules');
  const fixtureForge = join(modules, 'node-forge');
  const fixtureExpo = join(modules, '@expo/code-signing-certificates');
  mkdirSync(fixtureForge, { recursive: true });
  mkdirSync(fixtureExpo, { recursive: true });
  for (const file of ['lib', 'package.json', 'LICENSE']) {
    cpSync(join(forgeRoot, file), join(fixtureForge, file), { recursive: true });
  }
  for (const file of ['build', 'package.json']) {
    cpSync(join(expoRoot, file), join(fixtureExpo, file), { recursive: true });
  }
  execFileSync('git', ['init', '--quiet', fixtureForge]);
  const canonical = join(here, 'forge-1159-rsa.patch');
  execFileSync('git', ['-c', 'core.autocrlf=false', 'apply', '--reverse', canonical], {
    cwd: fixtureForge,
  });
  assert.equal(digest(join(fixtureForge, 'lib/rsa.js')), FORGE_BASE_HASH);
  if (variant.patch) {
    const path = join(here, variant.patch);
    assert.equal(digest(path), variant.hash, 'Candidate differs from the pinned upstream diff');
    execFileSync('git', ['apply', '--check', '--whitespace=error', path], {
      cwd: fixtureForge,
    });
    execFileSync('git', ['apply', '--whitespace=error', path], { cwd: fixtureForge });
  }
  return {
    ...variant,
    forge: require(join(fixtureForge, 'lib/index.js')),
    expo: require(join(fixtureExpo, 'build/main.js')),
  };
});

const message = Buffer.from('Synthetic Oratio signature fixture; no user data.');
const keys = [65537, 3].map((exponent) => ({
  exponent,
  ...generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: exponent,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  }),
}));

function digestInfo(forge, algorithm, bytes, withParameters = true) {
  const { asn1 } = forge;
  const field = (type, value, constructed = false) =>
    asn1.create(asn1.Class.UNIVERSAL, type, constructed, value);
  const identifier = [field(asn1.Type.OID, asn1.oidToDer(forge.oids[algorithm]).bytes())];
  if (withParameters) identifier.push(field(asn1.Type.NULL, ''));
  return field(
    asn1.Type.SEQUENCE,
    [field(asn1.Type.SEQUENCE, identifier, true), field(asn1.Type.OCTETSTRING, bytes)],
    true
  );
}

function encode(forge, info) {
  return Buffer.from(forge.asn1.toDer(info).getBytes(), 'latin1');
}

// Use the known synthetic private key to isolate parser acceptance, not to
// claim a private-key-free forgery or exploitation of an Oratio service.
function signatureFor(key, encoded) {
  return privateEncrypt(
    { key: key.privateKey, padding: constants.RSA_PKCS1_PADDING },
    encoded
  ).toString('latin1');
}

const vectors = [
  {
    name: 'extra inner element',
    accepted: [true, false, false, false],
    mutate(forge, info) {
      info.value[0].value.push(
        forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.INTEGER, false, '\x01')
      );
    },
  },
  {
    name: 'non-NULL second element',
    accepted: [true, false, false, false],
    mutate(forge, info) {
      info.value[0].value[1].type = forge.asn1.Type.INTEGER;
      info.value[0].value[1].value = '\x01';
    },
  },
  {
    name: 'NULL with 100 content bytes',
    accepted: [true, true, false, false],
    mutate(_forge, info) {
      info.value[0].value[1].value = 'x'.repeat(100);
    },
  },
  {
    name: 'non-minimal outer length',
    accepted: [true, true, false, false],
    mutate() {},
    changeBytes(bytes) {
      assert(bytes[1] < 128);
      return Buffer.concat([bytes.subarray(0, 1), Buffer.from([0x81]), bytes.subarray(1)]);
    },
  },
  {
    name: 'non-minimal inner length',
    accepted: [true, true, false, false],
    mutate() {},
    changeBytes(bytes) {
      assert(bytes[1] < 127 && bytes[3] < 128);
      return Buffer.concat([
        Buffer.from([bytes[0], bytes[1] + 1, bytes[2], 0x81]),
        bytes.subarray(3),
      ]);
    },
  },
  {
    name: 'extra outer element',
    accepted: [false, false, false, false],
    mutate(forge, info) {
      info.value.push(
        forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.INTEGER, false, '\x01')
      );
    },
  },
  {
    name: 'trailing bytes in strict mode',
    accepted: [false, false, false, false],
    mutate() {},
    changeBytes(bytes) {
      return Buffer.concat([bytes, Buffer.from([0x00])]);
    },
  },
];

for (const [index, variant] of variants.entries()) {
  const { forge, expo } = variant;
  for (const key of keys) {
    const publicKey = forge.pki.publicKeyFromPem(key.publicKey);
    for (const algorithm of ['sha256', 'sha384', 'sha512']) {
      const hashed = createHash(algorithm).update(message).digest('latin1');
      for (const withParameters of [true, false]) {
        test(`${variant.name}: e=${key.exponent} ${algorithm} parameters=${withParameters}`, () => {
          const bytes = encode(forge, digestInfo(forge, algorithm, hashed, withParameters));
          const signature = signatureFor(key, bytes);
          assert.equal(publicKey.verify(hashed, signature), true);
          assert.equal(publicKey.verify('\x00'.repeat(hashed.length), signature), false);
        });
      }
      test(`${variant.name}: Node/OpenSSL ${algorithm} e=${key.exponent} interop`, () => {
        const signature = sign(algorithm, message, key.privateKey).toString('latin1');
        assert.equal(publicKey.verify(hashed, signature), true);
      });
    }
    for (const vector of vectors) {
      const accepts = vector.accepted[index];
      test(`${variant.name}: ${accepts ? 'ACCEPTS' : 'rejects'} ${vector.name}, e=${key.exponent}`, () => {
        const hashed = createHash('sha256').update(message).digest('latin1');
        const info = digestInfo(forge, 'sha256', hashed);
        vector.mutate(forge, info);
        let bytes = encode(forge, info);
        if (vector.changeBytes) bytes = vector.changeBytes(bytes);
        const signature = signatureFor(key, bytes);
        if (accepts) {
          assert.equal(publicKey.verify(hashed, signature), true);
        } else {
          assert.throws(() => publicKey.verify(hashed, signature), /DigestInfo|Unparsed DER bytes/);
        }
      });
    }
    test(`${variant.name}: Expo certificate/manifest round trip, e=${key.exponent}`, () => {
      const keyPair = expo.convertKeyPairPEMToKeyPair({
        privateKeyPEM: key.privateKey,
        publicKeyPEM: key.publicKey,
      });
      const now = Date.now();
      const certificate = expo.generateSelfSignedCodeSigningCertificate({
        keyPair,
        validityNotBefore: new Date(now - 60_000),
        validityNotAfter: new Date(now + 60_000),
        commonName: 'Oratio isolated synthetic fixture',
      });
      const pem = expo.convertCertificateToCertificatePEM(certificate);
      const parsed = expo.convertCertificatePEMToCertificate(pem);
      expo.validateSelfSignedCertificate(parsed, keyPair);
      const signature = expo.signBufferRSASHA256AndVerify(keyPair.privateKey, parsed, message);
      assert.equal(
        verify('sha256', message, key.publicKey, Buffer.from(signature, 'base64')),
        true
      );
      assert.equal(
        verify(
          'sha256',
          Buffer.from('altered fixture'),
          key.publicKey,
          Buffer.from(signature, 'base64')
        ),
        false
      );
    });
  }
}

test('assessment leaves installed dependencies and lockfile unchanged', () => {
  assert.deepEqual(sourceFiles.map(digest), originalHashes);
});
