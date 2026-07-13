import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import { type UserRegisterDto } from '../src/modules/auth/dto/user-register.dto';
import { UserEntity } from '../src/modules/user/user.entity';
import { UserService } from '../src/modules/user/user.service';
import { UserSettingsEntity } from '../src/modules/user/user-settings.entity';

describe('CLS transaction propagation (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let userService: UserService;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get(DataSource);
    userService = moduleFixture.get(UserService);
  });

  it('rolls back the user, role junction, and settings across CQRS calls', async () => {
    const userRepository = dataSource.getRepository(UserEntity);
    const settingsRepository = dataSource.getRepository(UserSettingsEntity);
    const email = 'transaction-rollback@example.com';
    const settingsCountBefore = await settingsRepository.count();
    const userRoleCountBefore = await dataSource.query<
      Array<{ count: string }>
    >('SELECT COUNT(*) AS count FROM user_roles');
    const createSettings = userService.createSettings.bind(userService);

    jest
      .spyOn(userService, 'createSettings')
      .mockImplementation(async (userId, createSettingsDto) => {
        await createSettings(userId, createSettingsDto);

        throw new Error('Force rollback after settings persistence');
      });

    const registration: UserRegisterDto = {
      firstName: 'Transaction',
      lastName: 'Rollback',
      email,
      password: 'secure-password',
    };

    await expect(userService.createUser(registration)).rejects.toThrow(
      'Force rollback after settings persistence',
    );

    expect(await userRepository.findOneBy({ email })).toBeNull();
    expect(await settingsRepository.count()).toBe(settingsCountBefore);

    const userRoleCountAfter = await dataSource.query<Array<{ count: string }>>(
      'SELECT COUNT(*) AS count FROM user_roles',
    );

    expect(userRoleCountAfter[0].count).toBe(userRoleCountBefore[0].count);
  });

  afterAll(async () => {
    await app.close();
  });
});
