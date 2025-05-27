import bcrypt from 'bcrypt';

/**
 * generate hash from password or string
 * @param {string} password
 * @returns {string}
 */
export function generateHash(password: string): string {
  return bcrypt.hashSync(password, 10);
}

/**
 * validate text with hash
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export function validateHash(
  password: string | undefined,
  hash: string | undefined | null,
): Promise<boolean> {
  if (!password || !hash) {
    return Promise.resolve(false);
  }

  return bcrypt.compare(password, hash);
}

export function getVariableName<TResult>(
  getVar: () => TResult,
): string | undefined {
  const m = /\(\)=>(.*)/.exec(
    getVar.toString().replaceAll(/(\r\n|\n|\r|\s)/gm, ''),
  );

  if (!m) {
    throw new Error(
      "The function does not contain a statement matching 'return variableName;'",
    );
  }

  const fullMemberName = m[1];

  const memberParts = fullMemberName.split('.');

  return memberParts.at(-1);
}

export function assignDefined<
  K extends keyof T & keyof U, // Add this to define K
  V extends keyof T & keyof U, // Add this to define K
  T extends Record<K, V>,
  U extends Record<K, V>,
>(target: T, source: U): void {
  for (const key of Object.keys(source)) {
    const value = source[key];

    // Ensure the value is not undefined, null, or an empty object
    if (value !== undefined) {
      target[key as keyof T] = value as T[keyof T];
    }
  }
}
