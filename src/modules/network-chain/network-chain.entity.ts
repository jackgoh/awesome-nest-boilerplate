import { AbstractEntity } from '@/common/abstract.entity';
import { Column, Entity, OneToMany } from 'typeorm';
import { TokenDto } from '../token/dtos/token.dto';
import { TokenEntity } from '../token/token.entity';

@Entity({ name: 'network_chains' })
export class NetworkChainEntity extends AbstractEntity<TokenDto> {
  @Column({ length: 100 })
  chain_name!: string;

  @Column()
  chain_id!: number;

  @OneToMany(() => TokenEntity, (tokenEntity) => tokenEntity.chain)
  tokens!: TokenEntity;
}
