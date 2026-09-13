export { detectLanguage, needsTranslation } from '@oratio/shared/translation';
import { supabase } from './supabase';

const cache = new Map<string, string>();

interface GoogleTranslateResponse {
  data?: {
    translations?: Array<{
      translatedText?: string;
    }>;
  };
}

interface TranslateFunctionResult {
  data: GoogleTranslateResponse | null;
  error: unknown;
}

export async function translateText(text: string, targetLang: string): Promise<string | null> {
  const key = `${text}_${targetLang}`;
  const cached = cache.get(key);
  if (cached) return cached;

  try {
    const result = (await supabase.functions.invoke<GoogleTranslateResponse>('translate', {
      body: { q: text.slice(0, 500), target: targetLang },
    })) as unknown as TranslateFunctionResult;
    if (result.error) return null;
    const translated = result.data?.data?.translations?.[0]?.translatedText;
    if (translated && translated !== text) {
      cache.set(key, translated);
      return translated;
    }
    return null;
  } catch {
    return null;
  }
}
