import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  type EntityManager,
  type FindOptionsWhere,
  type Repository,
} from 'typeorm';

import { AuditEventEntity } from './audit-event.entity';

export interface RecordAuditEvent {
  action: string;
  actorId: Uuid | null;
  subjectType: string;
  subjectId: Uuid | null;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
  correlationId: Uuid;
  systemAdminBypass?: boolean;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditEventEntity)
    private readonly repository: Repository<AuditEventEntity>,
  ) {}

  record(
    manager: EntityManager,
    event: RecordAuditEvent,
  ): Promise<AuditEventEntity> {
    const repository = manager.getRepository(AuditEventEntity);

    return repository.save(
      repository.create({
        ...event,
        before: event.before ?? null,
        after: event.after ?? null,
        reason: event.reason ?? null,
        systemAdminBypass: event.systemAdminBypass ?? false,
      }),
    );
  }

  find(options: {
    action?: string;
    actorId?: Uuid;
    subjectId?: Uuid;
    limit: number;
  }): Promise<AuditEventEntity[]> {
    const where: FindOptionsWhere<AuditEventEntity> = {};

    if (options.action) {
      where.action = options.action;
    }

    if (options.actorId) {
      where.actorId = options.actorId;
    }

    if (options.subjectId) {
      where.subjectId = options.subjectId;
    }

    return this.repository.find({
      where,
      order: { createdAt: 'DESC' },
      take: options.limit,
    });
  }
}
