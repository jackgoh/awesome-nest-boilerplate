import { Injectable } from '@nestjs/common';
import { type EntityManager } from 'typeorm';

import { OutboxEventEntity } from './outbox-event.entity';

export interface AuthorizationChangedPayload extends Record<string, unknown> {
  userIds: Uuid[];
  cause: string;
  revokeSessions?: boolean;
}

@Injectable()
export class OutboxService {
  enqueue(
    manager: EntityManager,
    type: string,
    payload: AuthorizationChangedPayload,
  ): Promise<OutboxEventEntity> {
    const repository = manager.getRepository(OutboxEventEntity);

    return repository.save(repository.create({ type, payload }));
  }
}
