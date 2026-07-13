import { Test, type TestingModule } from '@nestjs/testing';
import { TransactionHost } from '@nestjs-cls/transactional';

import { UserSettingsEntity } from '../user-settings.entity';
import {
  CreateSettingsCommand,
  CreateSettingsHandler,
} from './create-settings.command';

describe('CreateSettingsHandler', () => {
  const settings = new UserSettingsEntity();
  const repository = {
    create: jest.fn(() => settings),
    save: jest.fn(async (entity: UserSettingsEntity) => entity),
  };
  const transactionalManager = {
    getRepository: jest.fn(() => repository),
  };
  let handler: CreateSettingsHandler;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateSettingsHandler,
        {
          provide: TransactionHost,
          useValue: { tx: transactionalManager },
        },
      ],
    }).compile();

    handler = module.get(CreateSettingsHandler);
  });

  it('saves settings through the current transactional manager', async () => {
    const userId = '3a0ead2e-71f7-4f33-81db-e20c65ec8fd0' as Uuid;
    const dto = { isEmailVerified: false, isPhoneVerified: false };

    await expect(
      handler.execute(new CreateSettingsCommand(userId, dto)),
    ).resolves.toBe(settings);

    expect(transactionalManager.getRepository).toHaveBeenCalledWith(
      UserSettingsEntity,
    );
    expect(repository.create).toHaveBeenCalledWith(dto);
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ userId }),
    );
  });
});
