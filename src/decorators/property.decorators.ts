import { ApiProperty, type ApiPropertyOptions } from '@nestjs/swagger';

import { getVariableName } from '../common/utils';

export function ApiBooleanProperty(
  options: Omit<ApiPropertyOptions, 'type' | 'enum' | 'enumName'> = {}, // Exclude enum properties
): PropertyDecorator {
  return ApiProperty({
    type: Boolean,
    description: options.description,
    required: options.required as boolean | undefined, // Cast required
    nullable: options.nullable,
    deprecated: options.deprecated,
    example: options.example,
    examples: options.examples,
    default: options.default,
  });
}

export function ApiBooleanPropertyOptional(
  options: Omit<ApiPropertyOptions, 'type' | 'required'> = {},
): PropertyDecorator {
  return ApiBooleanProperty({ required: false, ...options });
}

export function ApiUUIDProperty(
  options: Omit<ApiPropertyOptions, 'type' | 'format' | 'enum' | 'enumName'> & // Exclude enum properties
    Partial<{ each: boolean }> = {},
): PropertyDecorator {
  // Explicitly pass common properties
  return ApiProperty({
    type: options.each ? [String] : String,
    format: 'uuid',
    isArray: options.each,
    description: options.description,
    required: options.required as boolean | undefined, // Cast required
    nullable: options.nullable,
    deprecated: options.deprecated,
    example: options.example,
    examples: options.examples,
    default: options.default,
  });
}

export function ApiUUIDPropertyOptional(
  options: Omit<ApiPropertyOptions, 'type' | 'format' | 'required'> &
    Partial<{ each: boolean }> = {},
): PropertyDecorator {
  return ApiUUIDProperty({ required: false, ...options });
}

export function ApiEnumProperty<TEnum extends object>(
  getEnum: () => TEnum,
  options: Omit<ApiPropertyOptions, 'type'> & { each?: boolean } = {},
): PropertyDecorator {
  const enumValue = getEnum() as Record<string, unknown>;

  return ApiProperty({
    enum: enumValue,
    enumName: getVariableName(getEnum),
    isArray: options.each, // Set isArray based on options.each
    description: options.description,
    required: options.required as boolean | undefined, // Cast required
    nullable: options.nullable,
    deprecated: options.deprecated,
    example: options.example,
    examples: options.examples,
    default: options.default,
    // Add other safe properties from options if needed
  });
}

export function ApiEnumPropertyOptional<TEnum extends object>(
  getEnum: () => TEnum,
  options: Omit<
    ApiPropertyOptions,
    'type' | 'required' | 'enum' | 'enumName'
  > & {
    // Keep Omit consistent
    each?: boolean;
  } = {},
): PropertyDecorator {
  // Pass required: false explicitly
  return ApiEnumProperty(getEnum, { ...options, required: false });
}
