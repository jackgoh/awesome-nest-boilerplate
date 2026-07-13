import { Transform, TransformationType } from 'class-transformer';
import { parsePhoneNumberWithError } from 'libphonenumber-js';
import { castArray, isNil } from 'lodash';

import { GeneratorProvider } from '../providers';

function transformStringValue(
  value: unknown,
  transform: (value: string) => string,
): unknown {
  if (typeof value === 'string') {
    return transform(value);
  }

  if (Array.isArray(value)) {
    const items = value as unknown[];

    return items.map((item) =>
      typeof item === 'string' ? transform(item) : item,
    );
  }

  return value;
}

/**
 * @description trim spaces from start and end, replace multiple spaces with one.
 * @example
 * @ApiProperty()
 * @IsString()
 * @Trim()
 * name: string;
 * @returns PropertyDecorator
 * @constructor
 */
export function Trim(): PropertyDecorator {
  return Transform((params) => {
    const value: unknown = params.value;

    return transformStringValue(value, (item) =>
      item.trim().replaceAll(/\s\s+/g, ' '),
    );
  });
}

export function ToBoolean(): PropertyDecorator {
  return Transform(
    (params) => {
      const value: unknown = params.value;

      switch (value) {
        case 'true': {
          return true;
        }

        case 'false': {
          return false;
        }

        default: {
          return value;
        }
      }
    },
    { toClassOnly: true },
  );
}

/**
 * @description convert string or number to integer
 * @example
 * @IsNumber()
 * @ToInt()
 * name: number;
 * @returns PropertyDecorator
 * @constructor
 */
export function ToInt(): PropertyDecorator {
  return Transform(
    (params) => {
      const value: unknown = params.value;

      return typeof value === 'string' ? Number.parseInt(value, 10) : value;
    },
    { toClassOnly: true },
  );
}

/**
 * @description transforms to array, specially for query params
 * @example
 * @IsNumber()
 * @ToArray()
 * name: number;
 * @constructor
 */
export function ToArray(): PropertyDecorator {
  return Transform(
    (params) => {
      const value: unknown = params.value;

      if (isNil(value)) {
        return [];
      }

      return castArray(value);
    },
    { toClassOnly: true },
  );
}

export function ToLowerCase(): PropertyDecorator {
  return Transform(
    (params) => {
      const value: unknown = params.value;

      if (!value) {
        return;
      }

      return transformStringValue(value, (item) => item.toLowerCase());
    },
    {
      toClassOnly: true,
    },
  );
}

export function ToUpperCase(): PropertyDecorator {
  return Transform(
    (params) => {
      const value: unknown = params.value;

      if (!value) {
        return;
      }

      return transformStringValue(value, (item) => item.toUpperCase());
    },
    {
      toClassOnly: true,
    },
  );
}

export function S3UrlParser(): PropertyDecorator {
  return Transform((params) => {
    const key: unknown = params.value;

    if (typeof key !== 'string') {
      return key;
    }

    switch (params.type) {
      case TransformationType.CLASS_TO_PLAIN: {
        return GeneratorProvider.getS3PublicUrl(key);
      }

      case TransformationType.PLAIN_TO_CLASS: {
        return GeneratorProvider.getS3Key(key);
      }

      case TransformationType.CLASS_TO_CLASS: {
        return key;
      }
    }
  });
}

export function PhoneNumberSerializer(): PropertyDecorator {
  return Transform((params) => {
    const value: unknown = params.value;

    return typeof value === 'string'
      ? parsePhoneNumberWithError(value).number
      : value;
  });
}
