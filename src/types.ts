export type Constructor<
  T = object,
  Arguments extends unknown[] = never[],
> = new (...arguments_: Arguments) => T;

/**
 * Represents a universally unique identifier (UUID).
 * Uses a branded type to prevent accidental assignment of regular strings.
 */
export type Uuid = string & { readonly _uuidBrand: undefined };
