# Full Dependency and Argon2 Upgrade Design

## Objective

Modernize the boilerplate as a coherent stack: upgrade every direct runtime and development dependency to its latest stable compatible release, migrate from Yarn Classic to Yarn 4, standardize on Node.js 24 LTS, and replace bcrypt password hashing with Argon2id.

This is a boilerplate refresh. Existing bcrypt password hashes do not need to remain valid, and the implementation will not include a transitional bcrypt verification path.

## Upgrade Policy

- Upgrade all direct dependencies and development dependencies to their latest stable releases available at implementation time.
- Exclude alpha, beta, release-candidate, canary, and other prerelease versions.
- Keep related packages on compatible major versions, especially the NestJS package family and its integrations.
- Resolve incompatibilities in application code and configuration instead of pinning old majors, unless no stable compatible release exists. Any unavoidable exception must be documented in the implementation result.
- Regenerate and commit the dependency lockfile with the selected package-manager version.

## Runtime and Package Manager

The repository will target Node.js 24 LTS consistently across local metadata, GitHub Actions, and Docker. NestJS will be upgraded from version 10 to the latest stable version 11 release and all first-party Nest packages will be aligned with it.

Yarn Classic will be replaced with the latest stable Yarn 4 release managed through Corepack. The project will use Yarn's `node-modules` linker to preserve compatibility with the existing NestJS, TypeScript, Jest, and script conventions rather than introducing Plug'n'Play as an unrelated migration.

The `packageManager` and Node engine constraints in `package.json` will make the expected toolchain explicit. CI and container installs will use immutable lockfile behavior.

## Dependency Compatibility Work

The upgrade will include source and configuration changes required by stable major releases. Expected compatibility areas include:

- NestJS 11 and its Express 5 platform behavior;
- Swagger decorators and document generation;
- TypeORM and NestJS TypeORM integration;
- validation and transformation packages;
- AWS SDK, authentication, throttling, cache, and request middleware integrations;
- TypeScript, ESLint, Prettier, Jest, ts-jest, Supertest, and their type packages;
- VuePress documentation tooling and release/development scripts.

Only compatibility changes caused by the dependency and toolchain upgrade are in scope. Unrelated feature development or broad refactoring is excluded.

## Argon2 Password Hashing

The `bcrypt` runtime package and `@types/bcrypt` development package will be removed. The stable `argon2` package will be added; it publishes its own TypeScript declarations.

`generateHash(password)` will become asynchronous and return `Promise<string>`. It will call `argon2.hash` using Argon2id. The package's maintained secure defaults will be used rather than embedding custom cost values that may age poorly.

`validateHash(password, hash)` will remain asynchronous. It will return `false` when either input is missing, when the password does not match, or when verification rejects because the stored value is malformed. Authentication must fail closed rather than leaking hashing-library errors through the login endpoint.

The TypeORM user subscriber's insert and update hooks will become asynchronous and await hashing before persistence continues. The existing rule remains: hash a supplied password on insert and rehash only when an update changes the password value. No bcrypt-format detection, fallback verification, or login-time rehashing will be implemented.

## Data Flow

For registration or password updates, a plain-text password enters the user entity, the TypeORM subscriber awaits `generateHash`, and only the resulting Argon2id PHC string is sent to the database.

For login, the authentication service loads the user and passes the submitted password and stored hash to `validateHash`. A successful Argon2 verification returns the user; a mismatch, missing input, or malformed hash follows the existing invalid-credentials path.

## Error Handling

- Installation or peer-dependency conflicts will be resolved by selecting mutually compatible stable versions.
- Argon2 hashing errors during persistence will reject the database operation; an unhashed password must never be stored as a fallback.
- Argon2 verification errors will be converted to `false` so authentication fails through the existing `UserNotFoundException` behavior.
- Breaking framework behavior will be handled explicitly in source or configuration and covered by focused tests where it changes observable behavior.

## Testing and Verification

The implementation will follow test-driven development for behavior changes. Focused tests will prove that:

- generated hashes use the Argon2id PHC format and do not contain the plain-text password;
- a correct password verifies successfully;
- an incorrect password returns `false`;
- missing password or hash values return `false`;
- malformed hashes return `false`;
- user subscriber insert and password-change update hooks await hashing and replace the plain-text value before persistence;
- unchanged passwords are not hashed again during updates.

After focused tests pass, the repository will be verified with a clean immutable install, production build/type-check, lint, unit tests, and end-to-end tests. Docker configuration and GitHub Actions will be checked against Node.js 24 and Yarn 4 commands.

## Success Criteria

- All direct packages use latest stable mutually compatible releases, with any necessary exception explicitly reported.
- NestJS 11, Node.js 24 LTS, and Yarn 4 are consistently configured.
- Neither `bcrypt` nor `@types/bcrypt` remains in manifests, lockfiles, imports, or source.
- All newly stored password hashes are Argon2id hashes.
- Authentication fails safely for invalid and malformed hashes.
- Install, build, lint, unit-test, and end-to-end verification pass, or any environment-only blocker is clearly evidenced.
