import { CreateDateColumn, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import { type AbstractDto } from './dto/abstract.dto';
import { generateUuid } from './uuid';

/**
 * Abstract Entity
 * @author Narek Hakobyan <narek.hakobyan.07@gmail.com>
 *
 * @description This class is an abstract class for all entities.
 * It's experimental and recommended using it only in microservice architecture,
 * otherwise just delete and use your own entity.
 */
export abstract class AbstractEntity<
  DTO extends AbstractDto = AbstractDto,
  O = never,
> {
  @PrimaryColumn({ type: 'uuid' })
  id: Uuid = generateUuid();

  @CreateDateColumn({
    type: 'timestamp',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    type: 'timestamp',
  })
  updatedAt!: Date;

  toDto(options?: O): DTO {
    const prototype = Object.getPrototypeOf(this) as {
      dtoClass?: new (entity: AbstractEntity<DTO, O>, options?: O) => DTO;
    };
    const { dtoClass } = prototype;

    if (!dtoClass) {
      throw new Error(
        `You need to use @UseDto on class (${this.constructor.name}) be able to call toDto function`,
      );
    }

    return new dtoClass(this, options);
  }
}
