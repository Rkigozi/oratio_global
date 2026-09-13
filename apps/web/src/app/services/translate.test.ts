import { beforeEach, describe, expect, it, vi } from 'vitest';
import { detectLanguage, needsTranslation, translateText } from './translate';
import {
  getLanguageName,
  normalizeLanguageCode,
  resolveTranslationLanguage,
} from '@oratio/shared/translation';

vi.mock('./supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

import { supabase } from './supabase';

const invoke = vi.mocked(supabase.functions.invoke);

beforeEach(() => {
  invoke.mockReset();
});

describe('detectLanguage', () => {
  it('detects Spanish via accented characters', () => {
    expect(detectLanguage('áéíóúüñ')).toBe('es');
    expect(detectLanguage('¿Cómo estás?')).toBe('es');
  });

  it('detects Spanish via common words', () => {
    expect(detectLanguage('por los las que del')).toBe('es');
    expect(detectLanguage('Señor Dios padre')).toBe('es');
  });

  it('detects French via accented characters', () => {
    expect(detectLanguage('très bien')).toBe('fr');
  });

  it('detects French via common words', () => {
    expect(detectLanguage('Je suis avec vous')).toBe('fr');
    expect(detectLanguage('dans sur tout nous')).toBe('fr');
  });

  it('detects Portuguese via accented characters', () => {
    expect(detectLanguage('amanhã')).toBe('pt');
  });

  it('detects Portuguese via common words', () => {
    expect(detectLanguage('senhor com')).toBe('pt');
    expect(detectLanguage('dos seu')).toBe('pt');
  });

  it('detects German via common words', () => {
    expect(detectLanguage('Herr Gott Vater')).toBe('de');
    expect(detectLanguage('auf ich du wir')).toBe('de');
  });

  it('detects Italian via common words', () => {
    expect(detectLanguage('Signore per che gli')).toBe('it');
    expect(detectLanguage('sul nel alla')).toBe('it');
  });

  it('defaults to English for unknown', () => {
    expect(detectLanguage('Lord God please help me')).toBe('en');
    expect(detectLanguage('')).toBe('en');
    expect(detectLanguage('12345')).toBe('en');
  });
});

describe('needsTranslation', () => {
  it('returns false when text language matches user language', () => {
    expect(needsTranslation('Hello world', 'en')).toBe(false);
  });

  it('returns true when text language differs from user language', () => {
    expect(needsTranslation('¿Cómo estás?', 'en')).toBe(true);
    expect(needsTranslation('éèêëàâùûüç', 'en')).toBe(true);
  });
});

describe('translation language preferences', () => {
  it('normalizes regional language codes', () => {
    expect(normalizeLanguageCode('pt-BR')).toBe('pt');
    expect(normalizeLanguageCode('EN_gb')).toBe('en');
  });

  it('uses the device locale only for the auto preference', () => {
    expect(resolveTranslationLanguage('auto', 'fr-FR')).toBe('fr');
    expect(resolveTranslationLanguage('de', 'fr-FR')).toBe('de');
  });

  it('provides readable language names', () => {
    expect(getLanguageName('es-MX')).toBe('Spanish');
    expect(getLanguageName('nl')).toBe('NL');
  });
});

describe('translateText', () => {
  it('uses the authenticated Supabase function client', async () => {
    invoke.mockResolvedValue({
      data: { data: { translations: [{ translatedText: 'Ora por la esperanza' }] } },
      error: null,
    } as never);

    await expect(translateText('Pray for hope', 'es')).resolves.toBe('Ora por la esperanza');
    expect(invoke).toHaveBeenCalledWith('translate', {
      body: { q: 'Pray for hope', target: 'es' },
    });
  });

  it('keeps the original path recoverable when the function fails', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'Unavailable' } } as never);

    await expect(translateText('Pray for patience', 'fr')).resolves.toBeNull();
  });
});
