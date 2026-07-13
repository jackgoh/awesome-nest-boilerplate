import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { PageOptionsDto } from './page-options.dto';

describe('PageOptionsDto', () => {
  it.each([
    ['page', { page: 0 }, 'min'],
    ['take', { take: 0 }, 'min'],
    ['take', { take: 51 }, 'max'],
  ])(
    'rejects %s values outside the configured bounds',
    async (property, input, constraint) => {
      const dto = plainToInstance(PageOptionsDto, input);

      const errors = await validate(dto);
      const fieldError = errors.find((error) => error.property === property);

      expect(fieldError?.constraints).toHaveProperty(constraint);
    },
  );

  it.each([
    { page: 1, take: 1 },
    { page: 1, take: 50 },
  ])('accepts valid boundary values: %o', async (input) => {
    const dto = plainToInstance(PageOptionsDto, input);

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
