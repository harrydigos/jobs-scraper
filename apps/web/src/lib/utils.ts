/* eslint-disable @typescript-eslint/no-explicit-any */

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
