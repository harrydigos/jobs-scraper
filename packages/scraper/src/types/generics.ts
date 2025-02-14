export type RequiredFieldsOnly<T> = {
  [K in keyof T as T[K] extends Required<T>[K] ? K : never]: T[K];
};

export type OptionalFieldsOnly<T> = {
  [K in keyof T as T[K] extends Required<T>[K] ? never : K]: T[K];
};
