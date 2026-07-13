module.exports = {
  // TypeScript/JavaScript files - run ESLint with auto-fix
  '*.{ts,tsx,js,jsx}': ['eslint --fix'],

  // All supported files - run Prettier with auto-format
  '*.{ts,tsx,js,jsx,json,md,yml,yaml}': ['prettier --write'],

  // Lockfile integrity and dependency installation are verified in CI.
  'package.json': ['prettier --write'],
};
