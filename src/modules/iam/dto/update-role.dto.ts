import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

import { ACCEPTED_UUID_VERSIONS } from '../../../common/uuid';

export class UpdateRoleDto {
  @ApiPropertyOptional({
    description: 'The updated name of the role',
    example: 'Moderator',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'The updated description of the role',
    example: 'Manages user comments',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description:
      'List of permission IDs to set for this role (replaces existing)',
    type: [String],
    format: 'uuid',
    example: [
      '019f5ce3-cccb-7631-a9a1-cbacc12fb192',
      '019f5ce3-cccb-7386-8125-0ee358ec6417',
    ],
  })
  @IsArray()
  @ArrayUnique()
  @IsUUID([...ACCEPTED_UUID_VERSIONS], { each: true })
  @IsOptional()
  permissionIds?: string[];

  @ApiPropertyOptional({
    description: 'Administrative reason recorded in the audit event',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  reason?: string;
}
