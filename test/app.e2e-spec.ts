import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource, type Repository } from 'typeorm';

import { AppModule } from '../src/app.module';
import { UserEntity } from '../src/modules/user/user.entity';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;
  let rotatedRefreshToken: string;
  let dataSource: DataSource;
  let userRepository: Repository<UserEntity>;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    userRepository = dataSource.getRepository(UserEntity);
  });

  it('/health (GET) remains explicitly public', () =>
    request(app.getHttpServer()).get('/health').expect(200));

  it('/users (GET) is protected by default', () =>
    request(app.getHttpServer()).get('/users').expect(401));

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
    refreshToken = response.body.token.refreshToken;
  });

  it('/auth/me (GET)', () =>
    request(app.getHttpServer())
      .get('/auth/me')
      .set({ Authorization: `Bearer ${accessToken}` })
      .expect(200));

  it('/auth/refresh (POST) atomically rotates a refresh token', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    rotatedRefreshToken = response.body.refreshToken;
    expect(rotatedRefreshToken).not.toBe(refreshToken);
  });

  it('/auth/refresh (POST) detects replay and revokes the token family', async () => {
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: rotatedRefreshToken })
      .expect(401);
  });

  it('/auth/logout (POST) requires matching bearer and refresh identities', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'john@smith.com',
        password: 'password',
      })
      .expect(200);
    const logoutAccessToken = loginResponse.body.token.accessToken;
    const logoutRefreshToken = loginResponse.body.token.refreshToken;

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set({ Authorization: `Bearer ${logoutAccessToken}` })
      .send({ refreshToken: logoutRefreshToken })
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: logoutRefreshToken })
      .expect(401);
  });

  it('/auth/login (POST) enforces its stricter rate limit', async () => {
    await Promise.all(
      Array.from({ length: 3 }, () =>
        request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'missing@example.com', password: 'invalid-password' })
          .expect(401),
      ),
    );

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'missing@example.com', password: 'invalid-password' })
      .expect(429);
  });

  afterAll(async () => {
    await userRepository.delete({ email: 'john@smith.com' });
    await app.close();
  });
});
