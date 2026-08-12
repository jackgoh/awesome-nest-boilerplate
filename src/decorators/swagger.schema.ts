import { applyDecorators, type Type, UseInterceptors } from '@nestjs/common';
import {
  PARAMTYPES_METADATA,
  ROUTE_ARGS_METADATA,
} from '@nestjs/common/constants';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  type ApiBodyOptions,
  ApiConsumes,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { type Many } from 'lodash';
import castArray from 'lodash/castArray';

import { type IApiFile } from '../interfaces';

interface IRouteArgumentMetadata {
  index: number;
}

type SwaggerSchema = Extract<ApiBodyOptions, { schema: unknown }>['schema'];
type MetadataTarget = Parameters<typeof Reflect.getMetadata>[1];

function explore(instance: MetadataTarget, propertyKey: string | symbol) {
  const types: Array<Type<unknown>> = Reflect.getMetadata(
    PARAMTYPES_METADATA,
    instance,
    propertyKey,
  );
  const routeArgsMetadata = (Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    instance.constructor,
    propertyKey,
  ) || {}) as Record<string, IRouteArgumentMetadata>;
  const routeArgumentKeys = Object.keys(routeArgsMetadata);
  let remainingKeys = routeArgumentKeys.length;

  while (remainingKeys > 0) {
    remainingKeys -= 1;
    const key = routeArgumentKeys[remainingKeys];
    const keyPair = key.split(':');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    if (Number(keyPair[0]) === RouteParamtypes.BODY) {
      return types[routeArgsMetadata[key].index];
    }
  }
}

const registerModels: MethodDecorator = (target, propertyKey, descriptor) => {
  const body = explore(target, propertyKey);

  return body && ApiExtraModels(body)(target, propertyKey, descriptor);
};

function RegisterModels(): MethodDecorator {
  return registerModels;
}

function ApiFileDecorator(
  files: IApiFile[] = [],
  options: Partial<{ isRequired: boolean }> = {},
): MethodDecorator {
  return (target, propertyKey, descriptor: PropertyDescriptor) => {
    const { isRequired = false } = options;
    const fileSchema: SwaggerSchema = {
      type: 'string',
      format: 'binary',
    };
    const properties: Record<string, SwaggerSchema> = {};

    for (const file of files) {
      properties[file.name] = file.isArray
        ? {
            type: 'array',
            items: fileSchema,
          }
        : fileSchema;
    }

    let schema: SwaggerSchema = {
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
  files: Many<IApiFile>,
  options: Partial<{ isRequired: boolean }> = {},
): MethodDecorator {
  const filesArray = castArray(files);
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
