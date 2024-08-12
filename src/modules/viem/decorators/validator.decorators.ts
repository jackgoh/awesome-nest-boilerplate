import { Injectable } from '@nestjs/common';
import {
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';
import { ViemService } from '../viem.service';

@ValidatorConstraint({ name: 'IsValidChain', async: true })
@Injectable() // this is needed in order to the class be injected into the module
export class IsValidChainValidatorConstraint
  implements ValidatorConstraintInterface
{
  constructor(private viemService: ViemService) {}

  async validate(chainId: string | number) {
    return this.viemService.isValidChain(Number(chainId));
  }

  defaultMessage(validationArguments?: ValidationArguments): string {
    return `Chain ${validationArguments?.value} is not supported in this platform.`;
  }
}

export function isValidChain(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object, propertyName) => {
    registerDecorator({
      propertyName: propertyName as string,
      name: 'HexDecimal',
      target: object.constructor,
      options: validationOptions,
      validator: IsValidChainValidatorConstraint,
    });
  };
}
