import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

import { generateUuid } from '../../common/uuid';

@Entity({ name: 'audit_events' })
export class AuditEventEntity {
  @PrimaryColumn({ type: 'uuid' })
  id: Uuid = generateUuid();

  @Column({ type: 'uuid', nullable: true })
  @Index()
  actorId!: Uuid | null;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  action!: string;

  @Column({ type: 'varchar', length: 50 })
  subjectType!: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  subjectId!: Uuid | null;

  @Column({ type: 'jsonb', nullable: true })
  before!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  after!: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column({ type: 'uuid' })
  @Index()
  correlationId!: Uuid;

  @Column({ type: 'boolean', default: false })
  systemAdminBypass!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  @Index()
  createdAt!: Date;
}
