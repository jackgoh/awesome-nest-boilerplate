import { NumberField } from '@/decorators';
import { isValidChain } from '@/modules/viem/decorators/validator.decorators';

export class Web3ParamsDto {
  @NumberField({ int: true, isPositive: true })
  @isValidChain()
  chain_id!: number;
}
