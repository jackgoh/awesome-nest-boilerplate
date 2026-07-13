import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import { ACCEPTED_UUID_VERSIONS } from '../../../common/uuid';

export class CreateRoleDto {
  @ApiProperty({
    description: 'The name of the role',
    example: 'Administrator',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    description: 'A brief description of the role',
    example: 'Has full system access',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'List of permission IDs associated with this role',
    type: [String],
    format: 'uuid',
    example: ['019f5ce3-ccca-7790-9b07-346175d5a0c0'],
  })
  @IsArray()
  @IsUUID([...ACCEPTED_UUID_VERSIONS], { each: true })
  @IsOptional()
  permissionIds?: string[];
}
