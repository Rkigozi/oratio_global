import { afterEach, describe, expect, it, vi } from 'vitest';
import { logError, setExceptionSink } from '@oratio/shared/logger';

describe('shared error sink isolation', () => {
  afterEach(() => {
    setExceptionSink(null);
    vi.restoreAllMocks();
  });
  it('keeps the console fallback and original operation alive if the sink throws', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    setExceptionSink(() => {
      throw new Error('provider unavailable');
    });
    expect(() => logError('create prayer', new Error('original error'))).not.toThrow();
    expect(consoleError).toHaveBeenCalledWith('[create prayer]', 'original error', '');
  });
  it('handles a rejected asynchronous sink without an unhandled rejection', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    setExceptionSink(async () => {
      throw new Error('provider unavailable');
    });
    logError('create prayer', { message: 'original error' });
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  it('preserves the existing web sink contract', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const sink = vi.fn();
    setExceptionSink(sink);
    const error = { message: 'original error', code: '42501' };
    logError('create prayer', error, { retry: false });
    expect(sink).toHaveBeenCalledWith(expect.any(Error), 'create prayer', {
      originalError: error,
      retry: false,
    });
  });
});
