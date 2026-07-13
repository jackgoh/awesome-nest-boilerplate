# Setup and development

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [PostgreSQL and Redis](#postgresql-and-redis)
- [Database operations](#database-operations)
- [Development server](#development-server)
- [Generators](#generators)
- [Docker image](#docker-image)

## Prerequisites

Install the following tools:

- [Node.js](https://nodejs.org/) 24.16 or newer
- [pnpm](https://pnpm.io/installation) 11.12 or newer
- [Docker](https://docs.docker.com/get-docker/) with Docker Compose, if you
  want to run the backing services in containers

Node includes Corepack, which can install the pnpm version pinned by this
repository:

```bash
corepack enable
corepack install
```

## Installation

Install exactly the dependency versions recorded in `pnpm-lock.yaml`:

```bash
pnpm install --frozen-lockfile
```

Do not delete or manually edit `pnpm-lock.yaml`. Commit lockfile changes made by
pnpm whenever dependencies change.

## Configuration

Create a local environment file:

```bash
cp .env.example .env
```

The application validates and converts environment variables during startup.
Invalid ports, durations, booleans, or missing required values cause startup to
fail with a configuration error.

The default local service settings are:

```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=nest_boilerplate

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Explicit cross-origin allowlist; omit to disable CORS
CORS_ORIGINS=http://localhost:3000

# Keep zero unless the API is behind exactly this many trusted proxies
TRUST_PROXY_HOPS=0
```

Generate a dedicated JWT RSA key pair for every environment. Never deploy the
placeholder key material from `.env.example`. Set `JWT_ISSUER` to the service
that creates tokens and `JWT_AUDIENCE` to the API that accepts them. Use distinct
values per environment so a token issued for one deployment cannot be replayed
against another.

The API uses bearer authentication and does not set authentication cookies.
Public routes must be explicitly marked with `@Public()`. The default global
rate limit is configured through `THROTTLER_TTL` and `THROTTLER_LIMIT`; login,
registration, and refresh use stricter route policies.

## PostgreSQL and Redis

The application uses PostgreSQL as its database and Redis for caching. Start
both services with:

```bash
docker compose up -d
docker compose ps
```

Compose reads database and Redis port/password values from `.env` and provides
safe local defaults when they are absent. Both containers include health checks;
wait for them to report `healthy` before starting the application.

To stop the services while retaining their data:

```bash
docker compose down
```

To also delete the local PostgreSQL and Redis data volumes:

```bash
docker compose down --volumes
```

## Database operations

This project uses TypeORM with the Data Mapper pattern. Schema synchronization
is disabled; evolve the database through reviewed migrations.

```bash
# Create an empty migration
pnpm migration:create ./src/database/migrations/migration-name

# Generate a migration from entity changes
pnpm migration:generate ./src/database/migrations/migration-name

# Inspect and run pending migrations
pnpm migration:show
pnpm migration:run

# Revert the most recently applied migration
pnpm migration:revert

# Seed roles and permissions idempotently
pnpm seed:run
```

`pnpm schema:drop` is intentionally destructive and should only be used against
an expendable local or test database.

## Development server

```bash
# Start once
pnpm start:dev

# Rebuild and restart when files change
pnpm watch:dev

# Watch with the Node debugger enabled
pnpm debug:dev
```

The API is available at <http://localhost:3000> by default. When documentation
is enabled, Swagger is available at <http://localhost:3000/documentation>.

Run the complete local verification suite before opening a pull request:

```bash
pnpm verify
```

The complete suite includes database-backed end-to-end and CLS rollback tests.
Start PostgreSQL and Redis, replace the JWT placeholders in `.env`, then run
`pnpm migration:run` and `pnpm seed:run` before `pnpm verify`.

## Generators

The Nest CLI is installed as a project development dependency, so no global
installation is needed:

```bash
pnpm exec nest generate service users
pnpm exec nest generate class users
```

See the [Nest CLI documentation](https://docs.nestjs.com/cli/usages) for the
available generators.

## Docker image

Build the production image from the repository root:

```bash
docker build --tag awesome-nest-boilerplate .
```

The image uses Node.js 24.16, installs frozen pnpm dependencies in separate
build stages, contains only the compiled application and production
dependencies, and runs as the unprivileged `node` user.

The Compose file intentionally runs only PostgreSQL and Redis. Run the API on
the host during development, or deploy the application image using your
environment's container platform and secret management.
