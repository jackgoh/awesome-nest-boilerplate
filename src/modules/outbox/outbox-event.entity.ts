import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

import { generateUuid } from '../../common/uuid';

@Entity({ name: 'outbox_events' })
export class OutboxEventEntity {
  @PrimaryColumn({ type: 'uuid' })
  id: Uuid = generateUuid();

  @Column({ type: 'varchar', length: 100 })
  @Index()
  type!: string;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  @Index()
  occurredAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  @Index()
  processedAt!: Date | null;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  @Index()
  nextAttemptAt!: Date;

  @Column({ type: 'integer', default: 0 })
  attemptCount!: number;

  @Column({ type: 'text', nullable: true })
  lastError!: string | null;
}
