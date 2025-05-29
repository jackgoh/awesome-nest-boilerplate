import { Column, Entity } from 'typeorm';

import { AbstractEntity } from '@/common/abstract.entity';
import { RoleType } from '@/constants';
import { UseDto } from '@/decorators';
import { Address, Hex } from 'viem';
import { UserDto, type UserDtoOptions } from './dtos/user.dto';

@Entity({ name: 'wallet_users' })
@UseDto(UserDto)
export class UserEntity extends AbstractEntity<UserDto, UserDtoOptions> {
  @Column({ type: 'varchar', length: 100 })
  wallet_address!: Address;

  @Column({ type: 'varchar', nullable: true })
  wallet_key?: Hex;

  @Column({ type: 'enum', enum: RoleType, default: RoleType.USER })
  role!: RoleType;
}
