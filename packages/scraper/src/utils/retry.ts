export type RetryResponse = {
  success: boolean;
  errorMsg?: string;
};

export type RetryOptions = {
  maxAttempts: number;
  /**
   * Base delay in milliseconds between retry attempts.
   * The actual delay will increase exponentially with each attempt.
   *
   * @example
   * // With delayMs = 1000:
   * // 1st retry: 1 second delay
   * // 2nd retry: 2 seconds delay
   * // 3rd retry: 4 seconds delay
   */
  delayMs: number;
  onRetry?: (error: Error | string, attempt: number) => void;
  timeout?: number;
};

/**
 * Retries a promise-based operation only when the promise rejects
 */
export async function retry<T extends RetryResponse>(
  operation: () => Promise<T>,
  config: RetryOptions,
): Promise<T> {
  const { maxAttempts, delayMs, onRetry, timeout } = config;
  const startTime = Date.now();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Check timeout before attempting
      if (timeout && Date.now() - startTime > timeout) {
        throw new Error(`🔴 Operation timeout after ${timeout}ms`);
      }

      return await operation();
    } catch (e) {
      const lastError = e instanceof Error ? e : String(e);

      if (attempt === maxAttempts) {
        return {
          success: false,
          errorMsg: `🔴 All ${maxAttempts} retry attempts failed. Last error: ${lastError}`,
        } as T;
      }

      onRetry?.(lastError, attempt);

      await new Promise(
        (res) => setTimeout(res, delayMs * Math.pow(2, attempt - 1)), // Wait with exponential backoff
      );
    }
  }

  return {
    success: false,
    errorMsg: '🔴 Retry failed',
  } as T;
}
