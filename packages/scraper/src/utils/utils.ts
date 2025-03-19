import type { Nullish } from '~/types/generics';

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

export function deepMerge<T extends object>(...objects: Nullish<T>[]): T {
  const validObjects = objects.filter(Boolean) as T[];

  if (validObjects.length === 0) {
    return {} as T;
  }

  if (validObjects.length === 1) {
    return structuredClone(validObjects[0]);
  }

  const target = structuredClone(validObjects[0]);

  for (let i = 1; i < validObjects.length; i++) {
    const source = validObjects[i];

    for (const key of [
      ...Object.getOwnPropertyNames(source),
      ...Object.getOwnPropertySymbols(source),
    ]) {
      const sDesc = Object.getOwnPropertyDescriptor(source, key);
      const tDesc = Object.getOwnPropertyDescriptor(target, key);

      // Skip if source descriptor is undefined (shouldn't happen)
      if (!sDesc) continue;

      const sVal = sDesc.value;
      const tVal = tDesc?.value;
      if (
        sVal !== null &&
        tVal !== null &&
        sVal !== undefined &&
        tVal !== undefined &&
        Object.getPrototypeOf(sVal) === Object.prototype &&
        Object.getPrototypeOf(tVal) === Object.prototype &&
        !Array.isArray(sVal) &&
        !Array.isArray(tVal)
      ) {
        Object.defineProperty(target, key, {
          ...sDesc,
          value: deepMerge(tVal, sVal),
        });
      } else {
        Object.defineProperty(target, key, sDesc);
      }
    }
  }

  return target;
}
