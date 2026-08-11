import { ConfigService } from '@nestjs/config';

import { ApiConfigService } from './api-config.service';

jest.mock('../../entity-subscribers/user-subscriber', () => ({
  UserSubscriber: jest.fn(),
}));
jest.mock('../../snake-naming.strategy', () => ({
  SnakeNamingStrategy: jest.fn(),
}));
jest.mock('parse-duration', () => ({
  default: jest.fn(() => null),
}));

describe('ApiConfigService', () => {
  describe('throttlerConfigs', () => {
    it('rejects an invalid duration', () => {
      const configService = new ConfigService({
        THROTTLER_LIMIT: '10',
        THROTTLER_TTL: 'invalid',
      });
      const apiConfigService = new ApiConfigService(configService);

      expect(() => apiConfigService.throttlerConfigs).toThrow(
        'THROTTLER_TTL environment variable is not a valid duration',
      );
    });
  });
});
