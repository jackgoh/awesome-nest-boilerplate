# Full Dependency and Argon2 Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the boilerplate to a coherent latest-stable Node.js 24, NestJS 11, Yarn 4 stack and replace bcrypt with fail-closed Argon2id password hashing.

**Architecture:** Modernize the toolchain and dependency graph as one compatibility boundary, then migrate the password utility and TypeORM subscriber through focused tests. Keep Yarn's `node-modules` linker and the existing CommonJS application architecture so package upgrades do not turn into an unrelated module-system rewrite.

**Tech Stack:** Node.js 24 LTS, Yarn 4/Corepack, NestJS 11, Express 5, TypeScript, TypeORM, Argon2id, Jest, ESLint, Docker, GitHub Actions

## Global Constraints

- Upgrade all direct dependencies and development dependencies to their latest stable releases available at implementation time.
- Exclude alpha, beta, release-candidate, canary, and other prerelease versions.
- Keep related packages on compatible major versions, especially the NestJS package family and its integrations.
- Target Node.js 24 LTS consistently across package metadata, GitHub Actions, and Docker.
- Use the latest stable Yarn 4 release through Corepack with the `node-modules` linker.
- Do not preserve or verify existing bcrypt hashes.
- Use Argon2id through the `argon2` package's maintained defaults; do not add custom cost values.
- Do not introduce unrelated features or broad refactoring.

---

## File Structure

- Modify `package.json`: declare Node/Yarn versions, replace bcrypt, update all direct packages, and modernize scripts.
- Replace `yarn.lock`: capture the Yarn 4 latest-stable dependency graph.
- Create `.yarnrc.yml`: select the `node-modules` linker.
- Create `.nvmrc`: declare Node.js 24 for local version managers.
- Modify `.github/workflows/lint.yml`: run immutable installs and repository verification on Node.js 24 using current actions.
- Modify `Dockerfile`: use Node.js 24 and Corepack/Yarn 4 with immutable production installs.
- Replace `.eslintrc.js` with `eslint.config.mjs` if the latest stable ESLint requires flat configuration; preserve the repository's effective TypeScript/import/formatting rules.
- Modify `tsconfig.json`, `tsconfig.eslint.json`, and Jest configuration only where required by the selected latest stable TypeScript and testing packages.
- Modify `src/main.ts` and integration modules only for evidenced NestJS 11/Express 5 or upgraded-package API changes.
- Create `src/common/utils.spec.ts`: specify Argon2 password utility behavior.
- Modify `src/common/utils.ts`: implement asynchronous Argon2id hashing and fail-closed verification.
- Create `src/entity-subscribers/user-subscriber.spec.ts`: specify awaited insert/update hashing behavior.
- Modify `src/entity-subscribers/user-subscriber.ts`: await password hashing in TypeORM lifecycle hooks.
- Modify documentation only where commands or runtime requirements have become incorrect.

### Task 1: Modernize the Runtime, Package Manager, and Complete Dependency Graph

**Files:**
- Modify: `package.json`
- Replace: `yarn.lock`
- Create: `.yarnrc.yml`
- Create: `.nvmrc`
- Modify: `.gitignore` if Yarn 4 produces project-local artifacts that need an explicit policy

**Interfaces:**
- Produces: Node engine `>=24 <25`, a pinned `packageManager` value for the selected stable Yarn 4 release, and a reproducible `node_modules` install.
- Produces: `argon2` as the only password-hashing dependency; neither `bcrypt` nor `@types/bcrypt` remains.

- [ ] **Step 1: Record the pre-upgrade baseline**

Run:

```bash
node --version
yarn --version
yarn test --runInBand
yarn build:prod
yarn lint
```

Expected: record each result before changing the graph. Existing failures are baseline evidence, not permission to ignore new failures.

- [ ] **Step 2: Activate and pin stable Yarn 4**

Run:

```bash
corepack enable
corepack use yarn@stable
```

Add `.yarnrc.yml`:

```yaml
nodeLinker: node-modules
```

Add `.nvmrc`:

```text
24
```

Verify that `corepack use yarn@stable` wrote the `packageManager` field with its resolved exact Yarn version. Add the Node engine constraint so the relevant portion of `package.json` is:

```json
{
  "engines": {
    "node": ">=24 <25"
  }
}
```

Confirm separately that `packageManager` matches `^yarn@4\.[0-9]+\.[0-9]+$`; do not replace the exact value written by Corepack with a range.

- [ ] **Step 3: Replace bcrypt and upgrade every direct package**

Run:

```bash
yarn remove bcrypt @types/bcrypt
yarn add argon2@latest
yarn up '*' '@*/*'
yarn install
```

Then inspect `package.json` and `yarn.lock`. Reject any prerelease selected by a broad range, align every `@nestjs/*` package on stable version 11-compatible releases, and resolve peer warnings with stable compatible direct versions. Do not retain an old major merely to silence a source compatibility error.

- [ ] **Step 4: Prove the manifest and graph meet the policy**

Run:

```bash
yarn install --immutable
yarn why argon2
rg -n 'bcrypt|@types/bcrypt' package.json yarn.lock
yarn outdated
```

Expected: immutable install succeeds; Argon2 has one resolved stable version; the `rg` command returns no matches; `yarn outdated` shows no stable direct-package updates. Investigate peer warnings before continuing.

- [ ] **Step 5: Commit the dependency boundary**

```bash
git add package.json yarn.lock .yarnrc.yml .nvmrc .gitignore
git commit -m "build: upgrade runtime and dependencies"
```

### Task 2: Update Build, Lint, Test, CI, and Container Configuration

**Files:**
- Modify: `package.json`
- Delete: `.eslintrc.js` if migrating to flat configuration
- Create: `eslint.config.mjs` if required by the selected stable ESLint
- Modify: `.eslintignore` or fold its ignores into `eslint.config.mjs`
- Modify: `tsconfig.json`
- Modify: `tsconfig.eslint.json`
- Modify: `test/jest-e2e.json`
- Modify: `.github/workflows/lint.yml`
- Modify: `Dockerfile`

**Interfaces:**
- Consumes: Node 24 and the Yarn version pinned in Task 1.
- Produces: `yarn build:prod`, `yarn lint`, `yarn test --runInBand`, and `yarn test:e2e --runInBand` as supported verification commands.

- [ ] **Step 1: Run each tool and capture upgrade failures**

Run:

```bash
yarn build:prod
yarn lint
yarn test --runInBand
yarn test:e2e --runInBand
```

Expected: each failure must identify a removed option, incompatible configuration, type error, or application API changed by the upgraded packages. Save the exact failures to guide the minimal configuration changes.

- [ ] **Step 2: Modernize ESLint configuration without weakening checks**

If the installed ESLint uses flat configuration, create `eslint.config.mjs` using the installed plugins' flat presets and `typescript-eslint` project-aware configuration. Preserve the effective ignore patterns, TypeScript source targeting, Prettier integration, import sorting, unused-import checks, and repository-specific rule overrides from `.eslintrc.js`. Remove only rules that the installed plugin proves were deleted or replaced, selecting the documented replacement where available.

Change the lint script to:

```json
{
  "lint": "eslint .",
  "lint:fix": "eslint . --fix"
}
```

Run:

```bash
yarn lint
```

Expected: ESLint loads the new configuration successfully. Fix source violations newly exposed by stable replacement rules only when they are mechanical and behavior-preserving.

- [ ] **Step 3: Repair TypeScript and Jest configuration against installed APIs**

Update compiler/module-resolution and Jest/ts-jest settings only as required by the errors captured in Step 1. Do not convert the application to ESM. Keep production compilation rooted at `src`, exclude specs from `build:prod`, and keep unit and e2e discovery separate.

Run:

```bash
yarn build:prod
yarn test --runInBand
yarn test:e2e --runInBand
```

Expected: tools start successfully; application-level compatibility failures may remain for Task 3, but no failure is caused by a removed configuration key or incompatible transformer.

- [ ] **Step 4: Update GitHub Actions for the pinned toolchain**

Replace the third-party lint wrapper with direct repository scripts. The job steps must include current stable major releases of `actions/checkout` and `actions/setup-node`, Node 24, Corepack activation, immutable install, lint, build, and unit tests:

```yaml
- uses: actions/checkout@v6
- uses: actions/setup-node@v6
  with:
    node-version: 24
    cache: yarn
- run: corepack enable
- run: yarn install --immutable
- run: yarn lint
- run: yarn build:prod
- run: yarn test --runInBand
```

These are the current stable majors verified when this plan was written. Recheck their official release pages at execution time only if implementation occurs substantially later.

- [ ] **Step 5: Update the Docker build for Node 24 and Yarn 4**

Use `node:24` for every stage. Enable Corepack before install, copy `.yarnrc.yml` with the manifests, use `yarn install --immutable` in the build stage, and create production dependencies with Yarn 4's supported production-focused workflow. Ensure the final image contains the pinned Yarn runtime or invokes Node directly for `dist/main.js`.

Run:

```bash
docker build -t awesome-nest-boilerplate:upgrade .
```

Expected: image builds without mutating `yarn.lock` and includes the Argon2 native binding for the final Linux image.

- [ ] **Step 6: Commit toolchain compatibility**

```bash
git add package.json .eslintrc.js eslint.config.mjs .eslintignore tsconfig.json tsconfig.eslint.json test/jest-e2e.json .github/workflows/lint.yml Dockerfile
git commit -m "build: modernize project tooling"
```

Stage only paths that exist after the chosen ESLint migration.

### Task 3: Migrate Password Utilities to Argon2id

**Files:**
- Create: `src/common/utils.spec.ts`
- Modify: `src/common/utils.ts`

**Interfaces:**
- Produces: `generateHash(password: string): Promise<string>`.
- Produces: `validateHash(password: string | undefined, hash: string | undefined | null): Promise<boolean>`.
- Consumes: `argon2.hash`, `argon2.verify`, and `argon2.argon2id` from the stable `argon2` package.

- [ ] **Step 1: Write failing password utility tests**

Create `src/common/utils.spec.ts`:

```typescript
import { generateHash, validateHash } from './utils';

describe('password hash utilities', () => {
  it('generates an Argon2id hash that does not expose the password', async () => {
    const password = 'correct horse battery staple';

    const hash = await generateHash(password);

    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain(password);
  });

  it('validates the correct password', async () => {
    const hash = await generateHash('correct-password');

    await expect(validateHash('correct-password', hash)).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await generateHash('correct-password');

    await expect(validateHash('wrong-password', hash)).resolves.toBe(false);
  });

  it.each([
    [undefined, '$argon2id$v=19$m=65536,t=3,p=4$invalid$invalid'],
    ['password', undefined],
    ['password', null],
  ])('rejects missing credentials', async (password, hash) => {
    await expect(validateHash(password, hash)).resolves.toBe(false);
  });

  it('rejects a malformed hash without leaking the verifier error', async () => {
    await expect(validateHash('password', 'not-a-hash')).resolves.toBe(false);
  });
});
```

- [ ] **Step 2: Run the utility tests and verify RED**

Run:

```bash
yarn test src/common/utils.spec.ts --runInBand
```

Expected: FAIL because the current implementation returns a synchronous bcrypt hash and bcrypt has been removed. Confirm the failure is caused by the missing Argon2 behavior, not a test syntax error.

- [ ] **Step 3: Implement the minimal asynchronous Argon2 behavior**

Replace the password functions in `src/common/utils.ts` with:

```typescript
import { argon2id, hash as argon2Hash, verify as argon2Verify } from 'argon2';

export async function generateHash(password: string): Promise<string> {
  return argon2Hash(password, { type: argon2id });
}

export async function validateHash(
  password: string | undefined,
  hash: string | undefined | null,
): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }

  try {
    return await argon2Verify(hash, password);
  } catch {
    return false;
  }
}
```

Leave unrelated utilities in the file unchanged.

- [ ] **Step 4: Run the utility tests and verify GREEN**

Run:

```bash
yarn test src/common/utils.spec.ts --runInBand
```

Expected: all password utility tests PASS with no warnings or open handles.

- [ ] **Step 5: Commit the Argon2 utility**

```bash
git add src/common/utils.ts src/common/utils.spec.ts
git commit -m "feat: hash passwords with argon2id"
```

### Task 4: Await Hashing in the TypeORM User Subscriber

**Files:**
- Create: `src/entity-subscribers/user-subscriber.spec.ts`
- Modify: `src/entity-subscribers/user-subscriber.ts`

**Interfaces:**
- Consumes: `generateHash(password: string): Promise<string>` from Task 3.
- Produces: `beforeInsert(event: InsertEvent<UserEntity>): Promise<void>`.
- Produces: `beforeUpdate(event: UpdateEvent<UserEntity>): Promise<void>`.

- [ ] **Step 1: Write failing subscriber lifecycle tests**

Create `src/entity-subscribers/user-subscriber.spec.ts`. Construct minimal event objects because TypeORM owns the full event shape; assert on the real subscriber and real Argon2 output:

```typescript
import { type InsertEvent, type UpdateEvent } from 'typeorm';

import { generateHash, validateHash } from '../common/utils';
import { type UserEntity } from '../modules/user/user.entity';
import { UserSubscriber } from './user-subscriber';

describe('UserSubscriber', () => {
  const subscriber = new UserSubscriber();

  it('awaits and replaces a password before insert', async () => {
    const entity = { password: 'new-password' } as UserEntity;

    await subscriber.beforeInsert({ entity } as InsertEvent<UserEntity>);

    expect(entity.password).toMatch(/^\$argon2id\$/);
    await expect(validateHash('new-password', entity.password)).resolves.toBe(
      true,
    );
  });

  it('awaits and replaces a changed password before update', async () => {
    const entity = { password: 'changed-password' } as UserEntity;
    const databaseEntity = { password: 'previous-hash' } as UserEntity;

    await subscriber.beforeUpdate({
      entity,
      databaseEntity,
    } as UpdateEvent<UserEntity>);

    expect(entity.password).toMatch(/^\$argon2id\$/);
    await expect(
      validateHash('changed-password', entity.password),
    ).resolves.toBe(true);
  });

  it('does not replace an unchanged password during update', async () => {
    const existingHash = await generateHash('unchanged-password');
    const entity = { password: existingHash } as UserEntity;
    const databaseEntity = { password: existingHash } as UserEntity;

    await subscriber.beforeUpdate({
      entity,
      databaseEntity,
    } as UpdateEvent<UserEntity>);

    expect(entity.password).toBe(existingHash);
  });
});
```

- [ ] **Step 2: Run subscriber tests and verify RED**

Run:

```bash
yarn test src/entity-subscribers/user-subscriber.spec.ts --runInBand
```

Expected: FAIL because the subscriber assigns the unresolved `Promise<string>` instead of awaiting the hash. Confirm the assertion sees a non-string/unresolved value.

- [ ] **Step 3: Await hashing in both lifecycle hooks**

Update `src/entity-subscribers/user-subscriber.ts`:

```typescript
async beforeInsert(event: InsertEvent<UserEntity>): Promise<void> {
  if (event.entity.password) {
    event.entity.password = await generateHash(event.entity.password);
  }
}

async beforeUpdate(event: UpdateEvent<UserEntity>): Promise<void> {
  const entity = event.entity as UserEntity;

  if (entity.password !== event.databaseEntity.password) {
    entity.password = await generateHash(entity.password!);
  }
}
```

- [ ] **Step 4: Run subscriber and utility tests and verify GREEN**

Run:

```bash
yarn test src/entity-subscribers/user-subscriber.spec.ts src/common/utils.spec.ts --runInBand
```

Expected: both suites PASS with stored values in Argon2id PHC format.

- [ ] **Step 5: Commit subscriber behavior**

```bash
git add src/entity-subscribers/user-subscriber.ts src/entity-subscribers/user-subscriber.spec.ts
git commit -m "fix: await password hashing before persistence"
```

### Task 5: Resolve NestJS 11 and Stable Dependency API Changes

**Files:**
- Modify: `src/main.ts` only if an Express 5 behavior or type error is evidenced
- Modify: `src/app.module.ts` only if an upgraded integration API requires it
- Modify: `src/setup-swagger.ts`, module files, services, decorators, filters, DTOs, and tests only where a build/test/lint failure identifies an upgraded API
- Modify: `README.md` and `docs/*.md` where Node/Yarn commands or requirements are stale

**Interfaces:**
- Consumes: upgraded package graph and working tool configurations from Tasks 1–2.
- Produces: the same public HTTP routes, authentication behavior, database model, and configuration contract under NestJS 11 and Express 5.

- [ ] **Step 1: Run the full build to enumerate source compatibility failures**

Run:

```bash
yarn build:prod
```

Expected: capture every compiler diagnostic by file and package API. Group failures by dependency family; do not make speculative source edits.

- [ ] **Step 2: Fix one dependency-family failure group at a time**

For each group, consult the installed package declarations and official migration documentation, make the smallest source/configuration change that preserves current behavior, then rerun:

```bash
yarn build:prod
```

Expected: the targeted diagnostics disappear without introducing new unrelated diagnostics. Repeat until the build passes.

For Express 5 query parsing, retain existing nested-query behavior explicitly if the application expects it:

```typescript
app.set('query parser', 'extended');
```

Add this only if tests or existing request shapes demonstrate that requirement.

- [ ] **Step 3: Add a regression test before any observable behavior repair**

If an upgraded package changes observable application behavior, first add the smallest failing unit or e2e test reproducing that behavior. Run the focused test and confirm it fails for the expected compatibility reason; then implement the minimal repair and rerun it to green. Do not add tests merely to mirror type-only edits.

- [ ] **Step 4: Update runtime documentation**

Replace stale Node 16/Yarn Classic setup or install commands with Node 24, Corepack, and `yarn install --immutable`. Do not rewrite unrelated documentation.

- [ ] **Step 5: Commit source compatibility changes**

```bash
git add src test README.md docs package.json
git commit -m "fix: support upgraded NestJS dependency APIs"
```

Review the staged diff before committing so generated output and unrelated files are excluded.

### Task 6: Full Verification and Upgrade Audit

**Files:**
- Modify: only files required to correct a verification failure introduced by this upgrade

**Interfaces:**
- Consumes: all previous tasks.
- Produces: evidence that the repository installs, builds, lints, tests, and packages successfully with no bcrypt remnants or stale direct dependencies.

- [ ] **Step 1: Verify the dependency policy from a locked install**

Run:

```bash
yarn install --immutable
yarn outdated
rg -n 'bcrypt|@types/bcrypt' --glob '!docs/superpowers/**' --glob '!node_modules/**' .
```

Expected: install succeeds without lockfile changes; no stable direct dependency is outdated; no bcrypt reference remains outside historical design/plan documents.

- [ ] **Step 2: Run all static and automated checks**

Run:

```bash
yarn build:prod
yarn lint
yarn test --runInBand
yarn test:e2e --runInBand
git diff --check
```

Expected: every command exits zero with no unexpected warnings, open handles, formatting errors, or whitespace errors.

- [ ] **Step 3: Verify the production container**

Run:

```bash
docker build -t awesome-nest-boilerplate:upgrade .
docker run --rm awesome-nest-boilerplate:upgrade node --version
```

Expected: build succeeds and the image prints a Node.js 24 version. If application startup requires external services, do not claim a successful startup without providing those services.

- [ ] **Step 4: Audit the final diff**

Run:

```bash
git status --short
git diff --stat HEAD~4..HEAD
git diff HEAD~4..HEAD -- package.json .github/workflows/lint.yml Dockerfile src/common/utils.ts src/entity-subscribers/user-subscriber.ts
```

Expected: only dependency/toolchain compatibility, Argon2 migration, focused tests, and necessary documentation changes are present. Document any package that could not use latest stable and the exact peer constraint that required the exception.

- [ ] **Step 5: Commit any verification-only corrections**

If Step 1–4 required corrections:

```bash
git add -u
git status --short
git commit -m "chore: complete upgrade verification"
```

After `git add -u`, add each reviewed untracked correction by its explicit path if any exists. Inspect `git status --short`; do not create an empty commit or stage unrelated files.
