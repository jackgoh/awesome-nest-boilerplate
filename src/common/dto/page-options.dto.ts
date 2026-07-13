import { Order } from '../../constants';
import {
  EnumFieldOptional,
  NumberFieldOptional,
  StringFieldOptional,
} from '../../decorators/field.decorators';

export class PageOptionsDto {
  @EnumFieldOptional(() => Order, {
    default: Order.ASC,
  })
  readonly order: Order = Order.ASC;

  @NumberFieldOptional({
    min: 1,
    default: 1,
    int: true,
  })
  readonly page: number = 1;

  @NumberFieldOptional({
    min: 1,
    max: 50,
    default: 10,
    int: true,
  })
  readonly take: number = 10;

  get skip(): number {
    return (this.page - 1) * this.take;
  }

  @StringFieldOptional()
  readonly q?: string;
}
