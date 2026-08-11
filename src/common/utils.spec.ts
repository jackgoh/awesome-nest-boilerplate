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
