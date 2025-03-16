/* eslint-disable @typescript-eslint/no-explicit-any */
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function parseJsonArray(jsonString: string | null): string[] {
  if (!jsonString) return [];
  try {
    const parsed = JSON.parse(jsonString);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    console.error('Error parsing JSON array:', error);
    return [];
  }
}

export function omit<T extends Record<string, any>, Key extends keyof T>(
  object: T,
  keys: Key[],
  mutate = false,
): Omit<T, Key> {
  const result = mutate ? object : { ...object };

  for (const key of keys) {
    Reflect.deleteProperty(result, key);
  }

  return result;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

  // Create a map to store aggregated values
  const aggregationMap = new Map<string, T>();

  primaryArray.forEach((item) => {
    aggregationMap.set(keyFn(item), { ...item });
  });

  // Process secondaryArray items
  secondaryArray.forEach((item) => {
    const key = keyFn(item);

    if (aggregationMap.has(key)) {
      const existingItem = aggregationMap.get(key)!;

      Object.entries(aggregators).forEach(([key, fn]) => {
        Reflect.set(existingItem, key, fn(existingItem[key], item[key], item));
      });
    } else if (includeUnmatched) {
      // Add unmatched item from secondaryArray if option is enabled
      aggregationMap.set(key, { ...item });
    }
  });

  // Convert the map values back to an array
  return Array.from(aggregationMap.values());
}
