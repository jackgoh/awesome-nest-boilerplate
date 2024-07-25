import { AbstractEntity } from '@/common/abstract.entity';
import { UseDto } from '@/decorators';
import { Column, Entity, ManyToOne } from 'typeorm';
import { Address } from 'viem';
import { NetworkChainEntity } from '../network-chain/network-chain.entity';
import { TokenDto } from './dtos/token.dto';

@Entity({ name: 'tokens' })
@UseDto(TokenDto)
export class TokenEntity extends AbstractEntity<TokenDto> {
  @Column({ length: 10 })
  name!: string;

  @Column({ length: 10 })
  symbol!: string;

  @Column()
  decimals!: number; // whole number e.g. 3 (3%)

  @Column({ length: 100, unique: true })
  contract_address!: Address;

  @ManyToOne(() => NetworkChainEntity, (chainEntity) => chainEntity.tokens)
  chain!: NetworkChainEntity;
}
