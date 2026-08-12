import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';

import { ApiEnumProperty } from './property.decorators';

enum Status {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

class StatusDto {
  @ApiEnumProperty(() => Status)
  status!: Status;
}

describe('ApiEnumProperty', () => {
  it('generates a string schema for string enums', async () => {
    const moduleReference = await Test.createTestingModule({}).compile();
    const application = moduleReference.createNestApplication();

    const document = SwaggerModule.createDocument(
      application,
      new DocumentBuilder().build(),
      { extraModels: [StatusDto] },
    );

    expect(document.components?.schemas?.Status).toMatchObject({
      enum: ['active', 'inactive'],
      type: 'string',
    });

    await application.close();
  });
});
