import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource, type Repository } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

import { AppModule } from '../src/app.module';
import { UserEntity } from '../src/modules/user/user.entity';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let dataSource: DataSource;
  let userRepository: Repository<UserEntity>;

  beforeAll(async () => {
    initializeTransactionalContext();
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    userRepository = dataSource.getRepository(UserEntity);
  });

  it('/auth/register (POST)', () =>
    request(app.getHttpServer())
      .post('/auth/register')
      .send({
        firstName: 'John',
        lastName: 'Smith',
        email: 'john@smith.com',
        password: 'password',
      })
      .expect(200));

  it('/auth/login (POST)', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'john@smith.com',
        password: 'password',
      })
      .expect(200);

    accessToken = response.body.token.accessToken;
  });

  it('/auth/me (GET)', () =>
    request(app.getHttpServer())
      .get('/auth/me')
      .set({ Authorization: `Bearer ${accessToken}` })
      .expect(200));

  afterAll(async () => {
    await userRepository.delete({ email: 'john@smith.com' });
    await app.close();
  });
});
