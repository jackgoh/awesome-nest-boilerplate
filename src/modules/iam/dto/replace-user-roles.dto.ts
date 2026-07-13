import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

import { ACCEPTED_UUID_VERSIONS } from '../../../common/uuid';

export class ReplaceUserRolesDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayUnique()
  @IsUUID([...ACCEPTED_UUID_VERSIONS], { each: true })
  roleIds!: string[];

  @ApiPropertyOptional({ maxLength: 500 })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  reason?: string;
}
