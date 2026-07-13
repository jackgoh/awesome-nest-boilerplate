import { type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { ClsService } from 'nestjs-cls';

import { IAMController } from './modules/iam/iam.controller';
import { IAMService } from './modules/iam/iam.service';
import { UserLifecycleService } from './modules/iam/user-lifecycle.service';
import { UserController } from './modules/user/user.controller';
import { UserService } from './modules/user/user.service';

describe('OpenAPI contract', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [IAMController, UserController],
      providers: [
        { provide: IAMService, useValue: {} },
        { provide: UserLifecycleService, useValue: {} },
        { provide: ClsService, useValue: { getId: jest.fn() } },
        { provide: UserService, useValue: {} },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('documents the users page as UserDto data plus page metadata', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    );

    expect(document.paths['/users']?.get?.responses['200']).toMatchObject({
      content: {
        'application/json': {
          schema: {
            allOf: [
              { $ref: '#/components/schemas/PageDto' },
              {
                properties: {
                  data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/UserDto' },
                  },
                },
              },
            ],
          },
        },
      },
    });

    expect(document.components?.schemas?.PageDto).toMatchObject({
      properties: {
        data: { type: 'array' },
        meta: { $ref: '#/components/schemas/PageMetaDto' },
      },
    });
  });

  it('documents IAM creation and deletion success statuses accurately', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    );

    expect(document.paths['/iam/roles']?.post?.responses).toMatchObject({
      201: { description: 'Created custom role' },
    });
    expect(document.paths['/iam/roles']?.post?.responses).not.toHaveProperty(
      '200',
    );
    expect(document.paths['/iam/roles/{id}']?.delete?.responses).toMatchObject({
      204: { description: 'Deleted custom role' },
      403: { description: 'System role is protected' },
      409: { description: 'Role still has assigned members' },
    });
    expect(
      document.paths['/iam/roles/{id}']?.delete?.responses,
    ).not.toHaveProperty('200');
    expect(document.paths['/iam/permissions']?.post).toBeUndefined();
  });
});
