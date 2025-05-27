import { StringFieldOptional } from '../../../decorators';

export class UpdatePostDto {
  @StringFieldOptional()
  title?: string;

  @StringFieldOptional()
  description?: string;
}
