export const TRANSLATION_LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
] as const;

const languageNames = Object.fromEntries(
  TRANSLATION_LANGUAGE_OPTIONS.map(({ value, label }) => [value, label])
) as Record<string, string>;

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
  return /\b(herr|gott|vater|für|und|die|der|das|mit|auf|ich|du|wir)\b/i.test(text);
}

function likelyItalian(text: string): boolean {
  return /\b(signore|dio|padre|per|con|che|gli|dei|sul|nel|alla)\b/i.test(text);
}

export function normalizeLanguageCode(language: string | null | undefined): string {
  const code = language?.trim().toLowerCase().replace('_', '-').split('-')[0];
  return code && /^[a-z]{2,3}$/.test(code) ? code : 'en';
}

export function resolveTranslationLanguage(preference: string, deviceLocale: string): string {
  return normalizeLanguageCode(preference === 'auto' ? deviceLocale : preference);
}

export function getLanguageName(language: string): string {
  const code = normalizeLanguageCode(language);
  return languageNames[code] || code.toUpperCase();
}

export function detectLanguage(text: string): string {
  if (likelySpanish(text)) return 'es';
  if (likelyFrench(text)) return 'fr';
  if (likelyPortuguese(text)) return 'pt';
  if (likelyGerman(text)) return 'de';
  if (likelyItalian(text)) return 'it';
  return 'en';
}

export function needsTranslation(text: string, targetLanguage: string): boolean {
  return detectLanguage(text) !== normalizeLanguageCode(targetLanguage);
}
