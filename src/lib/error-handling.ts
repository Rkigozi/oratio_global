/**
 * Basic error handling utilities for Oratio
 */



/**
 * Safely parse JSON with error handling
 */
export function safeJsonParse<T = any>(
  jsonString: string | null,
  defaultValue: T
): T {
  if (!jsonString || jsonString.trim() === '') {
    return defaultValue;
  }

  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    return defaultValue;
  }
}

/**
 * Safely get item from localStorage with error handling
 */
export function safeGetItem<T = any>(
  key: string,
  defaultValue: T
): T {
  if (typeof window === 'undefined' || !window.localStorage) {
    return defaultValue;
  }

  try {
    const item = localStorage.getItem(key);
    return safeJsonParse(item, defaultValue);
  } catch (error) {
    console.error(`Failed to get item from localStorage (${key}):`, error);
    return defaultValue;
  }
}

/**
 * Safely set item in localStorage with error handling
 */
export function safeSetItem(
  key: string,
  value: any
): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    const jsonString = JSON.stringify(value);
    localStorage.setItem(key, jsonString);
    return true;
  } catch (error) {
    console.error(`Failed to set item in localStorage (${key}):`, error);
    return false;
  }
}

/**
 * Handle async operations with basic error handling
 */
export async function safeAsync<T>(
  promise: Promise<T>,
  errorMessage?: string
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const data = await promise;
    return { data, error: null };
  } catch (error) {
    console.error(errorMessage || 'Async operation failed:', error);
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}
