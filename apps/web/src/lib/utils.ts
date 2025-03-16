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

// TODO: it works but still worth revisiting
/**
 * Merges and aggregates two arrays of objects based on specified properties using a custom key function
 * @param primaryArray The primary array of objects that defines the return structure
 * @param secondaryArray The secondary array of objects to merge and aggregate values from
 * @param aggregateProps Array of property names to aggregate (must be numeric properties)
 * @param keyFn Function that returns a unique key for each object to determine which objects should be merged
 * @param options Additional configuration options
 * @returns A new array with merged and aggregated values, maintaining the structure of primaryArray
 */
export function mergeAggregate<T extends Record<string, any>>(
  primaryArray: T[],
  secondaryArray: T[],
  aggregateProps: (keyof T)[],
  keyFn: (item: T) => string,
  options: {
    /** Custom aggregation functions by property name */
    customAggregators?: Partial<Record<keyof T, (a: any, b: any) => any>>;
    /** Properties to merge (non-numeric) from secondaryArray when found */
    mergeProps?: (keyof T)[];
    /** Whether to include items from secondaryArray that don't exist in primaryArray */
    includeUnmatched?: boolean;
    /** Function to determine precedence when merging non-aggregate properties (defaults to primary) */
    mergePrecedence?: 'primary' | 'secondary' | ((primary: any, secondary: any) => any);
  } = {},
): T[] {
  const {
    customAggregators,
    mergeProps = [],
    includeUnmatched = false,
    mergePrecedence = 'primary',
  } = options;

  // Create a map to store aggregated values
  const aggregationMap = new Map<string, T>();

  // Initialize the map with primaryArray items
  primaryArray.forEach((item) => {
    const key = keyFn(item);
    aggregationMap.set(key, { ...item });
  });

  // Process secondaryArray items
  secondaryArray.forEach((item) => {
    const key = keyFn(item);

    if (aggregationMap.has(key)) {
      // Merge with existing item
      const existingItem = aggregationMap.get(key)!;

      // Aggregate numeric properties
      aggregateProps.forEach((prop) => {
        // Use custom aggregator if provided
        if (customAggregators?.[prop]) {
          existingItem[prop] = customAggregators[prop](existingItem[prop], item[prop]);
        }
        // Default numeric aggregation
        else if (
          item[prop] !== undefined &&
          typeof existingItem[prop] === 'number' &&
          typeof item[prop] === 'number'
        ) {
          existingItem[prop] = (existingItem[prop] + item[prop]) as any;
        }
      });

      // Merge non-aggregate properties if specified
      mergeProps.forEach((prop) => {
        if (item[prop] !== undefined) {
          if (mergePrecedence === 'secondary') {
            existingItem[prop] = item[prop];
          } else if (mergePrecedence === 'primary') {
            // Keep existing value (do nothing)
          } else if (typeof mergePrecedence === 'function') {
            existingItem[prop] = mergePrecedence(existingItem[prop], item[prop]);
          }
        }
      });
    } else if (includeUnmatched) {
      // Add unmatched item from secondaryArray if option is enabled
      aggregationMap.set(key, { ...item });
    }
  });

  // Convert the map values back to an array
  return Array.from(aggregationMap.values());
}
