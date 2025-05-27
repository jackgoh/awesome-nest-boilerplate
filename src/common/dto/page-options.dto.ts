import { Order } from '../../constants';
import {
  DateFieldOptional,
  EnumFieldOptional,
  NumberFieldOptional,
  StringFieldOptional,
} from '../../decorators';

export class BasePageOptionsDto {
  @EnumFieldOptional(() => Order, {
    default: Order.ASC,
  })
  readonly order: Order = Order.ASC;

  @NumberFieldOptional({
    minimum: 1,
    default: 1,
    int: true,
  })
  readonly page: number = 1;

  @NumberFieldOptional({
    minimum: 1,
    maximum: 50,
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

export class PageOptionsDto extends BasePageOptionsDto {
  @DateFieldOptional()
  readonly createdAtStart?: Date;

  @DateFieldOptional()
  readonly createdAtEnd?: Date;

  @DateFieldOptional()
  readonly updatedAtStart?: Date;

  @DateFieldOptional()
  readonly updatedAtEnd?: Date;
}
