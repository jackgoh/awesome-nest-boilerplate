import {
  createConfiguration,
  getEnvironmentFilePaths,
  validateEnvironment,
} from './index';

const validEnvironment = (): Record<string, unknown> => ({
  NODE_ENV: 'test',
  PORT: '3000',
  JWT_PRIVATE_KEY:
    '-----BEGIN PRIVATE KEY-----\\nprivate\\n-----END PRIVATE KEY-----',
  JWT_PUBLIC_KEY:
    '-----BEGIN PUBLIC KEY-----\\npublic\\n-----END PUBLIC KEY-----',
  DB_HOST: 'localhost',
  DB_USERNAME: 'postgres',
  DB_PASSWORD: 'postgres',
  DB_DATABASE: 'boilerplate',
  AWS_S3_BUCKET_REGION: 'ca-central-1',
  AWS_S3_BUCKET_NAME: 'test-bucket',
});

describe('environment configuration', () => {
  it('coerces validated scalar values and applies defaults', () => {
    const environment = validateEnvironment({
      ...validEnvironment(),
      ENABLE_DOCUMENTATION: 'yes',
      REDIS_DB: '0',
      THROTTLER_TTL: '1m',
    });

    expect(environment).toMatchObject({
      PORT: 3000,
      ENABLE_DOCUMENTATION: true,
      REDIS_DB: 0,
      JWT_REFRESH_EXPIRATION_TIME: 604_800,
      THROTTLER_TTL: 60_000,
    });
  });

  it('expands escaped PEM newlines once', () => {
    const environment = validateEnvironment(validEnvironment());
    const configuration = createConfiguration(environment);

    expect(configuration.auth.privateKey).toContain(
      '-----BEGIN PRIVATE KEY-----\nprivate\n',
    );
    expect(configuration.app.port).toBe(3000);
  });

  it('reports all invalid variables without their values', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment(),
        DB_PORT: 'not-a-port',
        ENABLE_ORM_LOGS: 'sometimes',
      }),
    ).toThrow(/DB_PORT:.*ENABLE_ORM_LOGS:/);
  });

  it('rejects an out-of-range application port', () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment(), PORT: '65536' }),
    ).toThrow(/PORT:/);
  });

  it('uses deterministic environment-file precedence and isolates production', () => {
    expect(getEnvironmentFilePaths('test')).toEqual([
      '.env.test.local',
      '.env.test',
      '.env.local',
      '.env',
    ]);
    expect(getEnvironmentFilePaths('development')).toEqual([
      '.env.local',
      '.env',
    ]);
    expect(getEnvironmentFilePaths('production')).toEqual([]);
  });
});
