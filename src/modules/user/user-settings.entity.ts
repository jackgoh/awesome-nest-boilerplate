import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';

import { AbstractEntity } from '../../common/abstract.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'user_settings' })
export class UserSettingsEntity extends AbstractEntity {
  @Column({ default: false })
  isEmailVerified?: boolean;

  @Column({ default: false })
  isPhoneVerified?: boolean;

  @Column({ type: 'uuid' })
  userId!: Uuid;

  @OneToOne(() => UserEntity, (user) => user.settings, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;
}
