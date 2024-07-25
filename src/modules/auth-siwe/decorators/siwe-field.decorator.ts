import { StringField } from '@/decorators';
import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { ValidationOptions, registerDecorator } from 'class-validator';
import { SiweMessage, parseSiweMessage, validateSiweMessage } from 'viem/siwe';

export function IsSiweMessage(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object, propertyName) => {
    registerDecorator({
      propertyName: propertyName as string,
      target: object.constructor,
      options: validationOptions,
      validator: {
        validate(message: SiweMessage) {
          // ensure required fields are defined

          // validate siwe message
          return validateSiweMessage({ message });
        },
      },
    });
  };
}

export function ToSiwe(): PropertyDecorator {
  return Transform((params) => parseSiweMessage(params.value));
}

export function SiweField() {
  const decorators = [StringField(), ToSiwe(), IsSiweMessage()];

  return applyDecorators(...decorators);
}
