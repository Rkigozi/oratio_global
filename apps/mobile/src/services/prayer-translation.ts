import { normalizeLanguageCode } from '@oratio/shared/translation';
import { supabase } from './supabase';

interface TranslateFunctionResponse {
  data?: {
    translations?: Array<{
      detectedSourceLanguage?: unknown;
      translatedText?: unknown;
    }>;
  };
  error?: unknown;
}

export type PrayerTranslation =
  | {
      status: 'translated';
      text: string;
      sourceLanguage: string;
    }
  | {
      status: 'not-needed';
      sourceLanguage: string;
    };

interface TranslatePrayerTextInput {
  prayerId: string;
  text: string;
  targetLanguage: string;
}

const cache = new Map<string, PrayerTranslation>();

function textFingerprint(text: string): string {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${text.length}-${(hash >>> 0).toString(36)}`;
}

export function clearPrayerTranslationCache(): void {
  cache.clear();
}

export async function translatePrayerText({
  prayerId,
  text,
  targetLanguage,
}: TranslatePrayerTextInput): Promise<PrayerTranslation | null> {
  const target = normalizeLanguageCode(targetLanguage);
  const cacheKey = `${prayerId}:${target}:${textFingerprint(text)}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await supabase.functions.invoke<TranslateFunctionResponse>(
      'translate',
      {
        body: { q: text.slice(0, 500), target },
      }
    );
    if (error || data?.error) return null;

    const translation = data?.data?.translations?.[0];
    const translatedText = translation?.translatedText;
    if (typeof translatedText !== 'string' || !translatedText.trim()) return null;

    const sourceLanguage =
      typeof translation?.detectedSourceLanguage === 'string'
        ? normalizeLanguageCode(translation.detectedSourceLanguage)
        : '';
    const result: PrayerTranslation =
      translatedText.trim() === text.trim() || (sourceLanguage !== '' && sourceLanguage === target)
        ? { status: 'not-needed', sourceLanguage }
        : { status: 'translated', text: translatedText, sourceLanguage };
    cache.set(cacheKey, result);
    return result;
  } catch {
    return null;
  }
}
