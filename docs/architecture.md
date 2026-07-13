# Architecture

The application is a modular NestJS HTTP service backed by PostgreSQL and Redis.

## Runtime composition

`AppModule` owns the global infrastructure integrations:

- `ConfigModule` loads and validates environment variables before providers are
  created.
- `TypeOrmModule` creates the shared TypeORM 1 data source.
- `ClsModule` and the TypeORM transactional adapter propagate the current
  entity manager through async call chains.
- Redis provides application caching.
- Feature modules own their controllers, services, entities, commands, and
  authorization rules.

The HTTP process is bootstrapped by `src/main.ts`. TypeORM CLI operations use
`src/data-source.ts`; both runtime and CLI configuration are built from the same
validated config functions under `src/config`.

## Configuration boundary

All environment parsing lives in `src/config`. Zod validates required values,
coerces numbers and booleans, and rejects invalid duration strings. Production
does not load local dotenv files. Application providers use the typed
`ApiConfigService` facade instead of reading `process.env` directly.

## Persistence and transactions

Entities and migrations live under `src/modules` and `src/database`. Database
names are converted to snake case by the local naming strategy without imports
from TypeORM internals.

Transactional services use `TransactionHost<TransactionalAdapterTypeOrm>` and
obtain repositories from `txHost.tx`. This is important: repositories created
from the global data source do not automatically join the CLS transaction.
Methods that define a unit of work use the `@Transactional()` decorator.

Seed functions live in `src/database/seeds`; `pnpm seed:run` initializes one
data source and executes all seeds as one transaction.

## Project layout

- `src/config`: validated environment and database configuration.
- `src/common`: shared entities, DTOs, and pagination primitives.
- `src/modules`: domain modules such as auth, IAM, and users.
- `src/database`: migrations and transactional seed orchestration.
- `src/shared`: global infrastructure services.
- `src/decorators`, `src/guards`, `src/filters`, `src/interceptors`: HTTP and
  framework cross-cutting concerns.
- `test`: end-to-end tests.
- `docs`: development and maintenance guidance.

## Deployment

The multi-stage Docker image uses Node 24 and pnpm, builds the TypeScript output,
installs production dependencies separately, and runs as the unprivileged
`node` user. Docker Compose provides PostgreSQL and Redis with health checks for
local development.
