const cache = new Map<string, string>();

function likelySpanish(text: string): boolean {
  const spanishPattern = /[áéíóúüñ¿¡]/i;
  const commonWords = /\b(señor|dios|padre|por|para|con|los|las|que|del|tú|te|tu)\b/i;
  return spanishPattern.test(text) || commonWords.test(text);
}

export async function translateText(text: string): Promise<string | null> {
  const target = likelySpanish(text) ? "en" : "es";

  const key = `${text}_${target}`;
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
          target,
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
