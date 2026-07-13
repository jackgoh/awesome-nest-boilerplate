import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

import { ACCEPTED_UUID_VERSIONS } from '../../../common/uuid';

export class AuditEventsQueryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  action?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID([...ACCEPTED_UUID_VERSIONS])
  @IsOptional()
  actorId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID([...ACCEPTED_UUID_VERSIONS])
  @IsOptional()
  subjectId?: string;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit = 50;
}
