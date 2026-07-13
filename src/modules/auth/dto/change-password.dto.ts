import { PasswordField } from '../../../decorators';

export class ChangePasswordDto {
  @PasswordField({ minLength: 6 })
  currentPassword!: string;

  @PasswordField({ minLength: 12 })
  newPassword!: string;
}
