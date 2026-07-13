import { applyDecorators, type Type, UseInterceptors } from '@nestjs/common';
import {
  PARAMTYPES_METADATA,
  ROUTE_ARGS_METADATA,
} from '@nestjs/common/constants';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  type ApiBodyOptions,
  ApiConsumes,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import _ from 'lodash';

import { type IApiFile } from '../interfaces';

type ApiBodySchema = Extract<ApiBodyOptions, { schema: unknown }>['schema'];

interface IRouteArgumentMetadata {
  data?: string;
  index: number;
}

const BODY_ROUTE_PARAM_TYPE = 3;

function explore(
  instance: object,
  propertyKey: string | symbol,
): Type<unknown> | undefined {
  const types =
    (Reflect.getMetadata(PARAMTYPES_METADATA, instance, propertyKey) as
      Array<Type<unknown>> | undefined) ?? [];
  const routeArgsMetadata =
    (Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      instance.constructor,
      propertyKey,
    ) as Record<string, IRouteArgumentMetadata> | undefined) ?? {};

  for (const [key, parameter] of Object.entries(routeArgsMetadata).reverse()) {
    const keyPair = key.split(':');

    if (Number(keyPair[0]) === BODY_ROUTE_PARAM_TYPE) {
      return types[parameter.index];
    }
  }
}

function RegisterModels(): MethodDecorator {
  return (target, propertyKey, descriptor: PropertyDescriptor) => {
    const body = explore(target, propertyKey);

    if (body) {
      ApiExtraModels(body)(target, propertyKey, descriptor);
    }
  };
}

function ApiFileDecorator(
  files: IApiFile[] = [],
  options: Partial<{ isRequired: boolean }> = {},
): MethodDecorator {
  return (target, propertyKey, descriptor: PropertyDescriptor) => {
    const { isRequired = false } = options;
    const fileSchema: ApiBodySchema = {
      type: 'string',
      format: 'binary',
    };
    const properties: Record<string, ApiBodySchema> = {};

    for (const file of files) {
      properties[file.name] = file.isArray
        ? {
            type: 'array',
            items: fileSchema,
          }
        : fileSchema;
    }

    let schema: ApiBodySchema = {
      properties,
      type: 'object',
    };
    const body = explore(target, propertyKey);

    if (body) {
      schema = {
        allOf: [
          {
            $ref: getSchemaPath(body),
          },
          { properties, type: 'object' },
        ],
      };
    }

    return ApiBody({
      schema,
      required: isRequired,
    })(target, propertyKey, descriptor);
  };
}

export function ApiFile(
  files: _.Many<IApiFile>,
  options: Partial<{ isRequired: boolean }> = {},
): MethodDecorator {
  const filesArray = _.castArray(files);
  const apiFileInterceptors = filesArray.map((file) =>
    file.isArray
      ? UseInterceptors(FilesInterceptor(file.name))
      : UseInterceptors(FileInterceptor(file.name)),
  );

  return applyDecorators(
    RegisterModels(),
    ApiConsumes('multipart/form-data'),
    ApiFileDecorator(filesArray, options),
    ...apiFileInterceptors,
  );
}
