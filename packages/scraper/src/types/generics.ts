export type Prettify<T> = { [K in keyof T]: T[K] };

export type RequiredFieldsOnly<T> = Prettify<{
  [K in keyof T as T[K] extends Required<T>[K] ? K : never]: T[K];
}>;

export type OptionalFieldsOnly<T> = Prettify<{
  [K in keyof T as T[K] extends Required<T>[K] ? never : K]: T[K];
}>;

export type RequiredByKeys<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends Record<PropertyKey, any>,
  Keys extends keyof T = keyof T,
> = Prettify<
  {
    [K in keyof Pick<T, Keys>]-?: T[K];
  } & {
    [K in keyof Omit<T, Keys>]: T[K];
  }
>;

export type Nullish<T> = T | null | undefined;

export type MergeTuple<T extends unknown[]> = T extends [infer First, ...infer Rest]
  ? First & MergeTuple<Rest>
  : unknown;
