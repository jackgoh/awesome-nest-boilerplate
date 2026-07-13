# Architecture

The application is a modular NestJS HTTP service backed by PostgreSQL and Redis.

## Runtime composition

`AppModule` owns the global infrastructure integrations:

- `ConfigModule` loads and validates environment variables before providers are
  created.
- `TypeOrmModule` creates the shared TypeORM 1 data source.
- `ClsModule` and the TypeORM transactional adapter propagate the current
  entity manager through async call chains.
- Global guards enforce throttling, JWT authentication, and permissions in that
  order. Routes are private unless explicitly marked `@Public()`.
- Redis provides application caching and atomic refresh-token rotation.
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

CORS uses an explicit, validated origin allowlist. Proxy forwarding headers are
trusted only when `TRUST_PROXY_HOPS` is greater than zero.

## Authentication boundary

The HTTP API uses bearer tokens only. Login returns access and refresh tokens in
JSON and never creates authentication cookies. Access tokens are accepted only
from the `Authorization` header. Refresh and logout requests carry the refresh
token in a validated JSON body.

Both token types use RS256 and require the configured issuer and audience.
Runtime claim validation rejects missing or unknown claims. `sub` identifies the
user, `jti` identifies the individual token, and `sid` identifies the login and
refresh-token family shared by its access and refresh tokens.

Each login creates a refresh-token family. Rotation compares and replaces the
active token through one Redis script. A replayed token revokes every active
token in its family and blacklists that session's access tokens. Logout also
validates that the refresh-token subject and session match the authenticated
access token before atomically revoking the family and blacklisting its `sid`.

Redis keeps an expiring sorted index of active session IDs per user. The
`/auth/logout-all` endpoint uses that index in one script to revoke every
refresh-token family and blacklist every corresponding `sid`. Each blacklist
expires with its refresh session; configuration validation guarantees that a
refresh session cannot expire before its access tokens. JWT validation fails
closed if Redis cannot verify revocation state. A new login receives a new
`sid`, so it is not blocked by an earlier user-wide logout.

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
Role synchronization returns affected user IDs and advances their authorization
cache generations only after the seed transaction commits.

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
