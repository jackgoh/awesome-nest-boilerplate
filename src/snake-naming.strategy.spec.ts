import { snakeCase, SnakeNamingStrategy } from './snake-naming.strategy';

describe('SnakeNamingStrategy', () => {
  it.each([
    ['UserSettings', 'user_settings'],
    ['createdAt', 'created_at'],
    ['XMLHttpRequest', 'xml_http_request'],
  ])('converts %s to %s', (input, expected) => {
    expect(snakeCase(input)).toBe(expected);
  });

  it('preserves explicit table names', () => {
    const strategy = new SnakeNamingStrategy();

    expect(strategy.tableName('UserEntity', 'accounts')).toBe('accounts');
  });
});
