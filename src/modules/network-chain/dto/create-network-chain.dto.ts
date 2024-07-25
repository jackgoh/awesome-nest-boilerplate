import { NumberField, StringField } from '@/decorators';

export class CreateNetworkChainDto {
  @StringField({ maximum: 100 })
  chain_name!: string;

  @NumberField({ isPositive: true, min: 1 })
  chain_id!: number;
}
