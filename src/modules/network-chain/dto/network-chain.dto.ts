import { AbstractDto } from '@/common/dto/abstract.dto';
import { NumberFieldOptional, StringFieldOptional } from '@/decorators';
import { NetworkChainEntity } from '../network-chain.entity';

export class NetworkChainDto extends AbstractDto {
  @StringFieldOptional({ maximum: 100 })
  chain_name!: string;

  @NumberFieldOptional({ isPositive: true, min: 1 })
  chain_id!: number;

  constructor(chain: NetworkChainEntity) {
    super(chain);
    this.chain_name = chain.chain_name;
    this.chain_id = chain.chain_id;
  }
}
