# Linting and formatting

The project uses [Oxlint](https://oxc.rs/docs/guide/usage/linter.html) for static analysis and [Prettier](https://prettier.io/) for formatting. Oxlint runs with TypeScript-aware rules through `oxlint-tsgolint`; Prettier remains separate so linting does not duplicate formatting work.

## Commands

```bash
# Report lint violations
pnpm lint

# Apply safe automatic lint fixes
pnpm lint:fix

# Check formatting without changing files
pnpm format:check

# Format supported files
pnpm format

# Run the complete local quality gate
pnpm verify
```

`pnpm lint` treats warnings as failures. The configuration also reports unused disable directives, so temporary suppressions must remain necessary.

## Rule policy

The default rules focus on backend correctness and security boundaries:

- unsafe `any` propagation, unsafe calls, member access, arguments, and returns;
- ignored or incorrectly handled promises;
- unnecessary conditions and assertions that often hide stale assumptions;
- unsafe enum comparisons, non-`Error` throws, dynamic evaluation, and implicit async behavior;
- focused, disabled, malformed, or assertion-free Jest tests.

Test files relax only the type-aware rules that cannot reliably resolve Jest's transformed project through Oxlint's current project discovery. TypeScript still checks tests independently with both the TypeScript 7 and TypeScript 6 compatibility compilers.

`typescript/consistent-type-imports` is intentionally disabled. NestJS dependency injection relies on runtime imports in emitted decorator metadata, and an automatic type-only conversion can break providers at runtime.

## Pre-commit checks

Husky runs `lint-staged` before each commit. Staged JavaScript and TypeScript files receive Oxlint's safe fixes followed by Prettier; structured text files are formatted with Prettier. Full-project type checks, builds, and tests stay in CI and `pnpm verify` to keep commits responsive.

Commit messages are checked separately with commitlint.

## Editor setup

The workspace recommends the Oxc and Prettier VS Code extensions. Keep Prettier as the formatter and use Oxc for diagnostics and lint fixes. Other editors should run the same `pnpm lint` and `pnpm format:check` commands rather than maintaining editor-specific rule sets.

## Configuration

- `.oxlintrc.jsonc` owns lint rules, overrides, ignored output directories, and TypeScript-aware analysis.
- `.prettierrc` owns formatting.
- `lint-staged.config.js` owns staged-file checks.
- `.github/workflows/lint.yml` owns the CI quality gates.

When adding a suppression, prefer the narrowest possible line-level directive and include a short reason. Do not disable a rule for a whole file unless the entire file represents a deliberate exception.
