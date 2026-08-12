import {
  type EntitySubscriberInterface,
  EventSubscriber,
  type InsertEvent,
  type UpdateEvent,
} from 'typeorm';

import { generateHash } from '../common/utils';
import { UserEntity } from '../modules/user/user.entity';

@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface<UserEntity> {
  listenTo(): typeof UserEntity {
    return UserEntity;
  }

  async beforeInsert(event: InsertEvent<UserEntity>): Promise<void> {
    const entity = event.entity as Partial<UserEntity> | undefined;
    const password = entity?.password;

    if (entity && typeof password === 'string') {
      entity.password = await generateHash(password);
    }
  }

  async beforeUpdate(event: UpdateEvent<UserEntity>): Promise<void> {
    const entity = event.entity as Partial<UserEntity> | undefined;
    const databaseEntity = event.databaseEntity as
      Partial<UserEntity> | undefined;
    const password = entity?.password;

    if (
      entity &&
      typeof password === 'string' &&
      password !== databaseEntity?.password
    ) {
      entity.password = await generateHash(password);
    }
  }
}
