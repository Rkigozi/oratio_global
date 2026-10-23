# Oratio Quick Start

Use Node 22 from `.nvmrc`, then run commands from the repository root. The normal
development workflow is the iOS app in Expo Go; no Apple membership is needed
for this workflow.

## Mobile Development

```bash
npm install
npm run dev:mobile
```

Configure ignored environment files under `apps/mobile` with
`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Match the intended
backend; never use a service-role/secret server key. Do not commit environment
or signing credentials. Local environment files are not automatically EAS setup.

Open the terminal's QR code in Expo Go using an account with access to
`@oratioglobals-team/oratio-global`. The phone must be able to reach the development
host. Use the `exp://` URL from the active Metro session; local addresses can change.

Stop the server with Ctrl+C in its terminal. To reset Metro's cache:

```bash
npm run start --workspace @oratio/mobile -- --clear
```

Expo Go is the development preview channel. Signed distribution follows the
entry criteria in the [release plan](./V1_RELEASE_READINESS.md).

## Website And Admin Tools

Only start web development when working on the supporting site, moderation,
notice administration, recovery or web-link regressions:

```bash
npm run dev --workspace @oratio/web -- --port 5173
```

Vite prints its actual local URL. Web uses `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` in ignored local configuration. `/moderate` and
`/admin/service-notices` still require their separately authorised accounts.

`./start-dev.sh` is an optional web cleanup wrapper, **not the mobile server**.
It stops processes on ports 5173-5176 and matching project esbuild processes;
avoid it when another server should remain running. The ordinary npm command
above does not perform that cleanup.

## Verification

```bash
npm run type-check:mobile
npm run test:mobile
npm run format:check
```

Shared/backend changes also need the relevant web and database checks. The
[testing strategy](./guidelines/TESTING_STRATEGY.md) lists the exact scope/commands;
the [QA checklist](./QA-CHECKLIST.md) covers physical-iPhone behaviour.

## Troubleshooting

- **Old UI:** reload the Expo project and check which Metro terminal/backend it uses.
- **Cannot connect:** verify Metro is running, the current address is reachable
  from the phone, and Expo CLI/Go accounts have project access.
- **Busy port:** identify the owning process before stopping it or choose another
  port; do not terminate every Node process.
- **Permission denied:** use iOS Settings or manual city search; location remains optional.
- **Supabase errors:** verify the target project's configuration and required
  applied migrations; do not disable RLS to make a test pass.

Starting a dev server or pushing Git does not deploy mobile. See
[deployment scope](./backlog/IOS-BUILD-PIPELINE.md#push-and-deployment-scope).
