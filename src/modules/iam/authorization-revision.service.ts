import { Injectable } from '@nestjs/common';
import { type EntityManager, In } from 'typeorm';

import { UserEntity } from '../user/user.entity';

@Injectable()
export class AuthorizationRevisionService {
  async advanceForUsers(
    manager: EntityManager,
    userIds: Uuid[],
  ): Promise<void> {
    const uniqueUserIds = [...new Set(userIds)];

    if (uniqueUserIds.length === 0) {
      return;
    }

    await manager
      .createQueryBuilder()
      .update(UserEntity)
      .set({
        authorizationRevision: () => '"authorization_revision" + 1',
      })
      .where({ id: In(uniqueUserIds) })
      .execute();
  }
}
