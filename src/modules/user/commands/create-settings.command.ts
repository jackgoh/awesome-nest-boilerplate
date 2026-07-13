import {
  CommandHandler,
  type ICommand,
  type ICommandHandler,
} from '@nestjs/cqrs';
import { TransactionHost } from '@nestjs-cls/transactional';
import { type TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { type Repository } from 'typeorm';

import { type CreateSettingsDto } from '../dtos/create-settings.dto';
import { UserSettingsEntity } from '../user-settings.entity';

export class CreateSettingsCommand implements ICommand {
  constructor(
    public readonly userId: Uuid,
    public readonly createSettingsDto: CreateSettingsDto,
  ) {}
}

@CommandHandler(CreateSettingsCommand)
export class CreateSettingsHandler implements ICommandHandler<
  CreateSettingsCommand,
  UserSettingsEntity
> {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {}

  private get userSettingsRepository(): Repository<UserSettingsEntity> {
    return this.txHost.tx.getRepository(UserSettingsEntity);
  }

  execute(command: CreateSettingsCommand) {
    const { userId, createSettingsDto } = command;
    const userSettingsEntity =
      this.userSettingsRepository.create(createSettingsDto);

    userSettingsEntity.userId = userId;

    return this.userSettingsRepository.save(userSettingsEntity);
  }
}
