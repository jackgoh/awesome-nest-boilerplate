import {
  DataSource,
  type EntitySubscriberInterface,
  type InsertEvent,
  type UpdateEvent,
} from 'typeorm';

import { UserEntity } from '@/modules/user-v2/user.entity';
import { EncryptionService } from '@/shared/services/encryption.service';
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';

@Injectable()
export class UserV2Subscriber implements EntitySubscriberInterface<UserEntity> {
  private logger = new Logger();

  constructor(
    @InjectDataSource() readonly dataSource: DataSource,
    private encryptionService: EncryptionService,
  ) {
    dataSource.subscribers.push(this);
  }

  listenTo(): typeof UserEntity {
    return UserEntity;
  }

  beforeInsert(event: InsertEvent<UserEntity>): void {
    this.logger.verbose('`BeforeInsert` event initiated.');

    if (event.entity.wallet_key) {
      const encrypted_data = this.encryptionService.encrypt(
        event.entity.wallet_key,
      );

      event.entity.wallet_key = encrypted_data;
    }
  }

  beforeUpdate(event: UpdateEvent<UserEntity>): void {
    this.logger.verbose('`beforeUpdate` event initiated.');

    const entity = event.entity as UserEntity;

    if (entity.wallet_key !== event.databaseEntity.wallet_key) {
      const encrypted_data = this.encryptionService.encrypt(entity.wallet_key!);

      entity.wallet_key = encrypted_data;
    }
  }

  afterLoad(entity: UserEntity): Promise<any> | void {
    this.logger.verbose('`afterLoad` event initiated.');

    if (entity.wallet_key) {
      entity.wallet_key = this.encryptionService.decrypt(entity.wallet_key);
    }
  }
}
