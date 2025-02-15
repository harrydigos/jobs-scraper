export function sanitizeText(rawText: string | null | undefined) {
  return (
    rawText
      ?.replace(/[\r\n\t]+/g, ' ')
      .replace(/\s\s+/g, ' ')
      .trim() || ''
  );
}

export function sleep(ms = 1000) {
  if (ms < 0) {
    throw new Error('Sleep duration must be non-negative');
  }

  return new Promise((res) => setTimeout(res, ms));
}

export function getRandomArbitrary(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

/**
 * Splits an array into smaller chunks of a specified size.
 *
 * @example
 * const result = chunkArray([1, 2, 3, 4, 5], 2);
 * console.log(result); // [[1, 2], [3, 4], [5]]
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  return array.reduce((chunks: T[][], item: T, index: number) => {
    const chunkIndex = Math.floor(index / size);
    if (!chunks[chunkIndex]) {
      chunks[chunkIndex] = [];
    }
    chunks[chunkIndex].push(item);
    return chunks;
  }, []);
}
