# Final Fix-Wave Report

## Scope

Implemented only the two approved Important final-review findings against
`docs/superpowers/specs/2026-08-12-full-dependency-and-argon2-upgrade-design.md`:

1. Make the TypeORM user subscriber safe for partial or missing update-event
   entities and database snapshots while preserving awaited Argon2id hashing.
2. Prevent sensitive/local state from entering broad Docker build contexts by
   excluding `.env`, `.yarn/`, and `*.tsbuildinfo`.

No final-review Minor findings were addressed.

## Files Changed

- `.dockerignore`
- `src/entity-subscribers/user-subscriber.ts`
- `src/entity-subscribers/user-subscriber.spec.ts`
- `.superpowers/sdd/2026-08-12-full-dependency-and-argon2-upgrade/final-fix-report.md`

## TDD Evidence

### RED

Tests were added before production code for:

- a non-password partial update;
- an update with no entity or database snapshot;
- a supplied password with no database snapshot;
- an empty password on insert; and
- an empty password supplied in an update.

Command:

```text
yarn test user-subscriber.spec.ts --runInBand
```

Result before implementation: exit 1, 1 failed suite, 4 failed tests and 4
passed tests. The failures matched the missing behavior:

- the partial update attempted to hash `undefined`;
- the absent entity/snapshot dereferenced `undefined`;
- the password-without-snapshot case dereferenced `databaseEntity`;
- the empty insert remained the empty string instead of an Argon2id hash.

The empty update regression already passed because the previous update branch
did not use a truthiness check.

### GREEN

The same command after the implementation returned exit 0:

```text
Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
Snapshots:   0 total
```

## Implementation

`beforeInsert` and `beforeUpdate` now treat event entities as
`Partial<UserEntity> | undefined`. Both hooks hash only when the supplied
password value is a string, which includes the empty string and prevents it
from being persisted unhashed. The update hook compares the supplied string
against an explicitly optional partial database snapshot. Missing entities,
missing snapshots, and partial updates without a password return without
throwing; a supplied password without a snapshot is awaited and replaced by
its Argon2id hash.

`.dockerignore` now excludes `.env`, `.yarn/`, and all `*.tsbuildinfo` files.

## Docker Context Verification

A disposable scratch Dockerfile performed `COPY . /context` with an allowed
probe plus probes at `.env`, `.yarn/.dockerignore-probe`, and
`.dockerignore-probe.tsbuildinfo`. The exported context inspection returned:

```text
included: .dockerignore-visible-probe
excluded: .env
excluded: .yarn
excluded: .dockerignore-probe.tsbuildinfo
excluded: tsconfig.build.tsbuildinfo
```

The probes, Dockerfile, and exported context were removed after inspection.

## Verification Commands and Results

- `yarn test user-subscriber.spec.ts --runInBand`: exit 0, 8/8 tests passed.
- `yarn build:prod`: exit 0.
- `yarn lint`: exit 0, no output.
- Initial e2e attempt with `.env.example`: exit 1 because the unrelated
  container bound to port 5432 did not contain `nest_boilerplate`.
- `DB_PORT=55432 DOTENV_CONFIG_PATH=.env.example NODE_OPTIONS='-r dotenv/config' yarn test:e2e --runInBand --no-cache` against a disposable PostgreSQL 16.8
  container: exit 0, 3/3 tests passed. The container was stopped and
  auto-removed afterward.
- `docker build --no-cache --progress=plain -t awesome-nest-boilerplate:final-fix-verification .`:
  exit 0; the build context was 15.57 kB and the production image was created.
- Container runtime Argon2 smoke check: exit 0,
  `argon2id runtime smoke passed`.
- Final diff and whitespace checks are recorded in the commit handoff.

## Self-Review

- Password presence is determined by `typeof password === 'string'`, not
  truthiness, so both non-empty and empty supplied strings are hashed.
- The database snapshot is optional at runtime even though TypeORM's declared
  event type presents it as required.
- Unchanged passwords are not rehashed; supplied changed passwords and
  passwords with no comparison snapshot are awaited and hashed.
- Test mutations that remove the entity guard, restore the snapshot
  dereference, restore the insert truthiness check, or skip hashing without a
  snapshot are all caught by focused regressions.
- Docker ignore behavior was tested through the Docker context consumer rather
  than by checking source text alone.
- The diff is limited to the two Important findings and their tests/report.

## Concerns

- The default e2e command depends on a correctly initialized local database on
  port 5432. Verification succeeded against an isolated disposable database,
  so this is an environment prerequisite rather than a change regression.
- The fresh Docker install emitted pre-existing Yarn peer-dependency and
  disabled-build-script warnings. The image build succeeded and an in-image
  Argon2id hashing smoke check passed.
