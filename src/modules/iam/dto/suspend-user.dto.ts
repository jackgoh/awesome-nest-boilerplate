import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

import { StringField } from '../../../decorators';

export class SuspendUserDto {
  @StringField({ maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
