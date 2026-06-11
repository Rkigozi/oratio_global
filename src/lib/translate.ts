const cache = new Map<string, string>();

function likelySpanish(text: string): boolean {
  const spanishPattern = /[áéíóúüñ¿¡]/i;
  const commonWords = /\b(señor|dios|padre|por|para|con|los|las|que|del|tú|te|tu)\b/i;
  return spanishPattern.test(text) || commonWords.test(text);
}

function likelyFrench(text: string): boolean {
  const frenchPattern = /[éèêëàâùûüçôœîï]/i;
  const commonWords = /\b(seigneur|dieu|père|pour|avec|dans|sur|tout|nous|vous|leur)\b/i;
  return frenchPattern.test(text) || commonWords.test(text);
}

function likelyPortuguese(text: string): boolean {
  const ptPattern = /[áâãàéêíóôõúç]/i;
  const commonWords = /\b(senhor|deus|pai|por|para|com|dos|das|nós|vos|seu)\b/i;
  return ptPattern.test(text) || commonWords.test(text);
}

function likelyGerman(text: string): boolean {
  const commonWords = /\b(herr|gott|vater|für|und|die|der|das|mit|auf|ich|du|wir)\b/i;
  return commonWords.test(text);
}

function likelyItalian(text: string): boolean {
  const commonWords = /\b(signore|dio|padre|per|con|che|gli|dei|dei|sul|nel|alla)\b/i;
  return commonWords.test(text);
}

export function detectLanguage(text: string): string {
  if (likelySpanish(text)) return "es";
  if (likelyFrench(text)) return "fr";
  if (likelyPortuguese(text)) return "pt";
  if (likelyGerman(text)) return "de";
  if (likelyItalian(text)) return "it";
  return "en";
}

export function needsTranslation(text: string, userLang: string): boolean {
  const detected = detectLanguage(text);
  return detected !== userLang;
}

export async function translateText(text: string, targetLang: string): Promise<string | null> {
  const key = `${text}_${targetLang}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const apiKey = import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: text.slice(0, 500),
          target: targetLang,
          format: "text",
        }),
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const translated = data.data?.translations?.[0]?.translatedText as string;
    if (translated && translated !== text) {
      cache.set(key, translated);
      return translated;
    }
    return null;
  } catch {
    return null;
  }
}
