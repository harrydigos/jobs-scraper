/**
 * Creates a promise that resolves after a specified delay.
 *
 * @example
 * // With default delay
 * await sleep(); // Waits for 1 second (default)
 */
export function sleep(ms = 1000) {
  if (ms < 0) {
    throw new Error("Sleep duration must be non-negative");
  }

  return new Promise((res) => setTimeout(res, ms));
}
