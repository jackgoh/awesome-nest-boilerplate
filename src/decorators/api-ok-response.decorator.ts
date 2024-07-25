import { ApiResponseDTO } from '@/common/dto/api-response.dto';
import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse as DefaultApiOkResponse,
  getSchemaPath,
} from '@nestjs/swagger';

export function ApiOkResponse<T extends Type>(options: {
  type: T;
  description?: string;
}): MethodDecorator {
  return applyDecorators(
    ApiExtraModels(ApiResponseDTO),
    ApiExtraModels(options.type),
    DefaultApiOkResponse({
      description: options.description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseDTO) },
          {
            properties: {
              data: { $ref: getSchemaPath(options.type) },
            },
          },
        ],
      },
    }),
  );
}
