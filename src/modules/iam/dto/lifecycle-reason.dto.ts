import { IsOptional, IsString, MaxLength } from 'class-validator';

import { StringFieldOptional } from '../../../decorators';

export class LifecycleReasonDto {
  @StringFieldOptional({ maxLength: 500 })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  reason?: string;
}
