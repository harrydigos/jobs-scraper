// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mergeAggregate<T extends Record<string, any>>(
  primaryArray: T[],
  secondaryArray: T[],
  aggregators: {
    [K in keyof T]?: (a: T[K], b: T[K], ctx: T) => T[K];
  },
  keyFn: (item: T) => string,
  options: {
    /** Whether to include items from secondaryArray that don't exist in primaryArray */
    includeUnmatched?: boolean;
  } = {},
): T[] {
  const { includeUnmatched = false } = options;

  const aggMap = new Map<string, T>();

  primaryArray.forEach((item) => {
    aggMap.set(keyFn(item), { ...item });
  });

  // Process secondaryArray items
  secondaryArray.forEach((item) => {
    const key = keyFn(item);

    if (aggMap.has(key)) {
      const existingItem = aggMap.get(key)!;

      Object.entries(aggregators).forEach(([key, fn]) => {
        Reflect.set(existingItem, key, fn(existingItem[key], item[key], item));
      });
    } else if (includeUnmatched) {
      aggMap.set(key, { ...item });
    }
  });

  return Array.from(aggMap.values());
}

export const aggUtils = Object.freeze({
  arrays: {
    uniqueConcat: <T>(a: T[] = [], b: T[] = []) => {
      if (!Array.isArray(a)) a = [];
      if (!Array.isArray(b)) b = [];

      // handle primitives
      if (a.every((item) => typeof item !== 'object' || item === null)) {
        return [...new Set([...a, ...b])];
      }

      // handle objects
      const result = [...a];
      const stringifiedA = a.map((item) => JSON.stringify(item));

      b.forEach((item) => {
        const stringified = JSON.stringify(item);
        if (!stringifiedA.includes(stringified)) {
          result.push(item);
        }
      });

      return result;
    },
    concat: <T>(a: T[] = [], b: T[] = []) => {
      if (!Array.isArray(a)) a = [];
      if (!Array.isArray(b)) b = [];
      return [...a, ...b];
    },
    replace: <T>(_a: T[] = [], b: T[] = []) => {
      if (!Array.isArray(b)) b = [];
      return [...b];
    },
    keep: <T>(a: T[] = [], _b: T[] = []) => {
      if (!Array.isArray(a)) a = [];
      return [...a];
    },
  },

  objects: {
    merge: <T extends object>(a: T = {} as T, b: T = {} as T) => ({ ...a, ...b }),
    replace: <T extends object>(_a: T = {} as T, b: T = {} as T) => ({ ...b }),
    keep: <T extends object>(a: T = {} as T, _b: T = {} as T) => ({ ...a }),
  },

  numbers: {
    sum: (a = 0, b = 0) => (+a || 0) + (+b || 0),
    max: (a = 0, b = 0) => Math.max(+a || 0, +b || 0),
    min: (a = 0, b = 0) => Math.min(+a || 0, +b || 0),
  },
});
