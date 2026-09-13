import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { clearPrayerTranslationCache, translatePrayerText } from './prayer-translation';

jest.mock('./supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
  },
}));

import { supabase } from './supabase';

const invoke = supabase.functions.invoke as jest.MockedFunction<typeof supabase.functions.invoke>;

describe('translatePrayerText', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearPrayerTranslationCache();
  });

  it('returns translated text and detected source language', async () => {
    invoke.mockResolvedValue({
      data: {
        data: {
          translations: [
            { translatedText: 'Por favor, ora por mi familia', detectedSourceLanguage: 'en' },
          ],
        },
      },
      error: null,
    } as never);

    await expect(
      translatePrayerText({
        prayerId: 'prayer-1',
        text: 'Please pray for my family',
        targetLanguage: 'es',
      })
    ).resolves.toEqual({
      status: 'translated',
      text: 'Por favor, ora por mi familia',
      sourceLanguage: 'en',
    });
    expect(invoke).toHaveBeenCalledWith('translate', {
      body: { q: 'Please pray for my family', target: 'es' },
    });
  });

  it('caches a successful translation without storing prayer text in the cache key', async () => {
    invoke.mockResolvedValue({
      data: {
        data: {
          translations: [{ translatedText: 'Seigneur, aide-moi', detectedSourceLanguage: 'en' }],
        },
      },
      error: null,
    } as never);
    const request = {
      prayerId: 'prayer-2',
      text: 'Lord, please help me',
      targetLanguage: 'fr',
    };

    await translatePrayerText(request);
    await translatePrayerText(request);

    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('identifies a translation that is unnecessary', async () => {
    invoke.mockResolvedValue({
      data: {
        data: {
          translations: [{ translatedText: 'Please pray for me', detectedSourceLanguage: 'en' }],
        },
      },
      error: null,
    } as never);

    await expect(
      translatePrayerText({
        prayerId: 'prayer-3',
        text: 'Please pray for me',
        targetLanguage: 'en',
      })
    ).resolves.toEqual({ status: 'not-needed', sourceLanguage: 'en' });
  });

  it('returns null without exposing content when translation fails', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'Unavailable' } } as never);

    await expect(
      translatePrayerText({
        prayerId: 'prayer-4',
        text: 'A private prayer remains readable',
        targetLanguage: 'de',
      })
    ).resolves.toBeNull();
  });
});
