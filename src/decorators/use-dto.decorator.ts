import { type Constructor } from '../types';

export function UseDto<T>(dtoClass: Constructor<T>): ClassDecorator {
  return (target) => {
    const decoratedTarget = target as unknown as { prototype: object };

    Object.defineProperty(decoratedTarget.prototype, 'dtoClass', {
      configurable: false,
      enumerable: false,
      value: dtoClass,
      writable: false,
    });
  };
}
