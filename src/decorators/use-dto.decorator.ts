import { type Constructor } from '../types';

export function UseDto(dtoClass: Constructor): ClassDecorator {
  return (ctor) => {
    // dtoClass remains a constructor until entity DTO factories support callbacks.

    if (!(<unknown>dtoClass)) {
      throw new Error('UseDto decorator requires dtoClass');
    }

    ctor.prototype.dtoClass = dtoClass;
  };
}
