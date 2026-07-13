import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

import { CacheService } from '../cache/cache.service';
import { OutboxEventEntity } from './outbox-event.entity';
import { type AuthorizationChangedPayload } from './outbox.service';

const DISPATCH_INTERVAL_MS = 1_000;
const MAX_BACKOFF_SECONDS = 300;
const OUTBOX_SLO_MS = 5 * 60 * 1000;

@Injectable()
export class OutboxDispatcherService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(OutboxDispatcherService.name);
  private timer?: NodeJS.Timeout;
  private dispatching = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly cacheService: CacheService,
  ) {}

  onApplicationBootstrap(): void {
    this.timer = setInterval(
      () => void this.dispatchSafely(),
      DISPATCH_INTERVAL_MS,
    );
    this.timer.unref();
    void this.dispatchSafely();
  }

  onApplicationShutdown(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async dispatch(): Promise<void> {
    if (this.dispatching) {
      return;
    }
    this.dispatching = true;

    try {
      await this.dataSource.transaction(async (manager) => {
        const repository = manager.getRepository(OutboxEventEntity);
        const events = await repository
          .createQueryBuilder('event')
          .setLock('pessimistic_write')
          .setOnLocked('skip_locked')
          .where('event.processed_at IS NULL')
          .andWhere('event.next_attempt_at <= NOW()')
          .orderBy('event.occurred_at', 'ASC')
          .take(20)
          .getMany();

        for (const event of events) {
          if (Date.now() - event.occurredAt.getTime() > OUTBOX_SLO_MS) {
            this.logger.warn(
              `Outbox event ${event.id} is older than the five-minute delivery SLO`,
            );
          }

          try {
            await this.deliver(event);
            event.processedAt = new Date();
            event.lastError = null;
          } catch (error: unknown) {
            event.attemptCount += 1;
            event.lastError =
              error instanceof Error ? error.message : String(error);
            const delay = Math.min(
              2 ** event.attemptCount,
              MAX_BACKOFF_SECONDS,
            );
            event.nextAttemptAt = new Date(Date.now() + delay * 1000);
            this.logger.error(
              `Outbox delivery failed for ${event.id}: ${event.lastError}`,
            );
          }

          await repository.save(event);
        }
      });
    } finally {
      this.dispatching = false;
    }
  }

  private async dispatchSafely(): Promise<void> {
    try {
      await this.dispatch();
    } catch (error: unknown) {
      this.logger.error(
        `Outbox dispatch failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async deliver(event: OutboxEventEntity): Promise<void> {
    if (event.type !== 'authorization.changed') {
      return;
    }
    const payload = event.payload as unknown as AuthorizationChangedPayload;

    for (const userId of payload.userIds) {
      await this.cacheService.deleteUserAuthorizationCache(userId);
      if (payload.revokeSessions) {
        await this.cacheService.revokeUserSessions(userId);
      }
    }
  }
}
