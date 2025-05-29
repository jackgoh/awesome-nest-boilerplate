import { StringField } from '@/decorators';

export class SiweMessagePayload {
  @StringField()
  message: string;

  constructor(message: string) {
    this.message = message;
  }
}
