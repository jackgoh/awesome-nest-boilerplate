import { NumberField, StringField } from '@/decorators';
import { IApiResponseFormat } from '@/interfaces';

export class ApiResponseDTO<DTO> implements IApiResponseFormat<DTO> {
  @NumberField({ example: 200 })
  status!: number;

  @StringField({ example: 'success' })
  message!: string;

  data!: DTO;
}
