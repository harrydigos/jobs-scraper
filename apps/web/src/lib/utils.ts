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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
