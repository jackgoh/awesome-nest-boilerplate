import { z } from 'zod';

const emptyStringToUndefined = (value: unknown): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const integerFromEnvironment = z.preprocess((value) => {
  const normalized = emptyStringToUndefined(value);

  if (typeof normalized === 'string') {
    return Number(normalized);
  }

  return normalized;
}, z.number().int());

const positiveIntegerFromEnvironment = integerFromEnvironment.pipe(
  z.number().int().positive(),
);

const nonNegativeIntegerFromEnvironment = integerFromEnvironment.pipe(
  z.number().int().nonnegative(),
);

const portFromEnvironment = integerFromEnvironment.pipe(
  z.number().int().positive().max(65_535),
);

const bcryptRoundsFromEnvironment = integerFromEnvironment.pipe(
  z.number().int().min(10).max(15),
);

const corsOriginsFromEnvironment = z.preprocess((value) => {
  const normalized = emptyStringToUndefined(value);

  if (typeof normalized !== 'string') {
    return [];
  }

  return normalized
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}, z.array(z.url()));

const booleanFromEnvironment = z.preprocess((value) => {
  const normalized = emptyStringToUndefined(value);

  if (typeof normalized !== 'string') {
    return normalized;
  }

  const normalizedBoolean = normalized.trim().toLowerCase();

  if (['true', '1', 'yes'].includes(normalizedBoolean)) {
    return true;
  }

  if (['false', '0', 'no'].includes(normalizedBoolean)) {
    return false;
  }

  return normalized;
}, z.boolean());

const durationMultipliers = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
} as const;

function parseDurationInMilliseconds(value: string): number | undefined {
  const match = /^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d)$/i.exec(value.trim());

  if (!match) {
    return undefined;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase() as keyof typeof durationMultipliers;

  return amount * durationMultipliers[unit];
}

const durationInMillisecondsFromEnvironment = z.preprocess((value) => {
  const normalized = emptyStringToUndefined(value);

  if (typeof normalized === 'number') {
    return normalized;
  }

  if (typeof normalized === 'string') {
    return parseDurationInMilliseconds(normalized);
  }

  return normalized;
}, z.number().int().positive());

const privateKeyFromEnvironment = z
  .string()
  .refine(
    (value) =>
      /-----BEGIN (?:RSA )?PRIVATE KEY-----/.test(value) &&
      /-----END (?:RSA )?PRIVATE KEY-----/.test(value),
    'must be a PEM-encoded private key',
  );

const publicKeyFromEnvironment = z
  .string()
  .refine(
    (value) =>
      value.includes('-----BEGIN PUBLIC KEY-----') &&
      value.includes('-----END PUBLIC KEY-----'),
    'must be a PEM-encoded public key',
  );

export const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: portFromEnvironment.default(3000),
    API_VERSION: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).optional(),
    ),
    ENABLE_DOCUMENTATION: booleanFromEnvironment.default(false),
    CORS_ORIGINS: corsOriginsFromEnvironment,
    TRUST_PROXY_HOPS: nonNegativeIntegerFromEnvironment.default(0),

    JWT_PRIVATE_KEY: privateKeyFromEnvironment,
    JWT_PUBLIC_KEY: publicKeyFromEnvironment,
    JWT_ISSUER: z.string().trim().min(1),
    JWT_AUDIENCE: z.string().trim().min(1),
    JWT_EXPIRATION_TIME: positiveIntegerFromEnvironment.default(900),
    JWT_REFRESH_EXPIRATION_TIME:
      positiveIntegerFromEnvironment.default(604_800),
    BCRYPT_ROUNDS: bcryptRoundsFromEnvironment.default(12),

    DB_HOST: z.string().trim().min(1),
    DB_PORT: portFromEnvironment.default(5432),
    DB_USERNAME: z.string().trim().min(1),
    DB_PASSWORD: z.string(),
    DB_DATABASE: z.string().trim().min(1),
    DB_SSL: booleanFromEnvironment.default(false),
    DB_SSL_REJECT_UNAUTHORIZED: booleanFromEnvironment.default(true),
    DB_DROP_SCHEMA: booleanFromEnvironment.default(false),
    ENABLE_ORM_LOGS: booleanFromEnvironment.default(false),

    AWS_S3_BUCKET_REGION: z.string().trim().min(1),
    AWS_S3_API_VERSION: z.string().trim().min(1).default('2006-03-01'),
    AWS_S3_BUCKET_NAME: z.string().trim().min(1),

    REDIS_HOST: z.string().trim().min(1).default('localhost'),
    REDIS_PORT: portFromEnvironment.default(6379),
    REDIS_PASSWORD: z.preprocess(emptyStringToUndefined, z.string().optional()),
    REDIS_DB: nonNegativeIntegerFromEnvironment.default(0),

    CACHE_USER_PERMISSIONS_TTL: positiveIntegerFromEnvironment.default(300),

    THROTTLER_TTL: durationInMillisecondsFromEnvironment.default(60_000),
    THROTTLER_LIMIT: positiveIntegerFromEnvironment.default(10),
  })
  .loose()
  .superRefine((environment, context) => {
    if (
      environment.JWT_REFRESH_EXPIRATION_TIME < environment.JWT_EXPIRATION_TIME
    ) {
      context.addIssue({
        code: 'custom',
        path: ['JWT_REFRESH_EXPIRATION_TIME'],
        message: 'must be greater than or equal to JWT_EXPIRATION_TIME',
      });
    }
  });

export type Environment = z.infer<typeof environmentSchema>;

let validatedEnvironment: Environment | undefined;

export function validateEnvironment(
  environment: Record<string, unknown>,
): Environment {
  const result = environmentSchema.safeParse(environment);

  if (!result.success) {
    const details = result.error.issues
      .map(
        (issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`,
      )
      .join('; ');

    throw new Error(`Environment validation failed: ${details}`);
  }

  validatedEnvironment = result.data;

  return result.data;
}

export function getValidatedEnvironment(): Environment {
  // ConfigModule calls validateEnvironment during application bootstrap. The
  // fallback is for standalone entry points such as the TypeORM CLI.
  return validatedEnvironment ?? validateEnvironment(process.env);
}
