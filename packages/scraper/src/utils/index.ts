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

export * from './retry.ts';
export * from './logger.ts';
