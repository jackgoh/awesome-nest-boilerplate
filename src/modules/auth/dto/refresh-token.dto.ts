import { StringField } from '../../../decorators';

export class RefreshTokenDto {
  @StringField()
  readonly refreshToken!: string;
}
