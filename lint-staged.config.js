module.exports = {
  '*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}': ['oxlint --fix', 'prettier --write'],
  '*.{json,jsonc,md,yml,yaml}': ['prettier --write'],
};
