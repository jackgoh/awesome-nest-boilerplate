import { Injectable } from '@nestjs/common';
import {
  FindOptionsRelations,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { Transactional } from 'typeorm-transactional';

import { Order } from '../constants';
import { AbstractEntity } from './abstract.entity';
import { AbstractDto } from './dto/abstract.dto';
import { PageDto } from './dto/page.dto';
import { BasePageOptionsDto, PageOptionsDto } from './dto/page-options.dto';

@Injectable()
export class AbstractService<Entity extends AbstractEntity> {
  constructor(private readonly repository: Repository<Entity>) {}

  getEntityName(): string {
    return this.repository.metadata.tableName;
  }

  async findOne(options: {
    findData?: FindOptionsWhere<Entity>;
    relations?: FindOptionsRelations<Entity>;
  }): Promise<Entity | null> {
    return this.repository.findOne({
      where: options.findData,
      relations: options.relations,
    });
  }

  async findOneOrThrowException(
    options: {
      findData?: FindOptionsWhere<Entity>;
      relations?: FindOptionsRelations<Entity>;
    },
    errorResponse: Error,
  ): Promise<Entity> {
    const foundData = await this.findOne(options);

    if (!foundData) {
      throw errorResponse;
    }

    return foundData;
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  async paginate<
    EntityPageOptionsDto extends PageOptionsDto,
    EntityDto extends AbstractDto,
  >(
    entityPageOptionsDto: EntityPageOptionsDto,
    leftJoinArr?: string[],
    relationFilter: Array<[string, ObjectLiteral]> = [],
    sortingArr: Array<[string, Order]> = [],
  ): Promise<PageDto<EntityDto>> {
    const basePageOptionsKeys = Object.getOwnPropertyNames(
      new BasePageOptionsDto(),
    );
    const entityName = this.getEntityName();

    const query = this.repository.createQueryBuilder(entityName);

    if (leftJoinArr) {
      for (const leftJoin of leftJoinArr) {
        query.leftJoinAndSelect(`${entityName}.${leftJoin}`, leftJoin);
      }
    }

    // filter the data
    for (const [key, value] of Object.entries(entityPageOptionsDto)) {
      // skip if the key is from PageOptionsDto or value is undefined or null
      if (
        basePageOptionsKeys.includes(key) ||
        value === undefined ||
        value === null
      ) {
        continue;
      }

      const date = new Date(value);
      const isValidDate = !Number.isNaN(date.getTime());

      if (key.endsWith('Start') && isValidDate) {
        const newKey = key.replace(/Start$/, '');

        query.andWhere(`${entityName}.${newKey} >= :${key}`, {
          [key]: date,
        });
      } else if (key.endsWith('End') && isValidDate) {
        const newKey = key.replace(/End$/, '');

        query.andWhere(`${entityName}.${newKey} <= :${key}`, {
          [key]: date,
        });
      } else {
        query.andWhere({ [key]: value });
      }
    }

    for (const relation of relationFilter) {
      query.andWhere(relation[0], relation[1]);
    }

    if (sortingArr.length <= 0) {
      query.orderBy(`${entityName}.createdAt`, entityPageOptionsDto.order);
    } else {
      for (const [index, [sortKey, sortOrder]] of sortingArr.entries()) {
        if (index === 0) {
          query.orderBy(`${entityName}.${sortKey}`, sortOrder);
        } else {
          query.addOrderBy(`${entityName}.${sortKey}`, sortOrder);
        }
      }
    }

    const [items, pageMetaDto] = await query.paginate(entityPageOptionsDto);

    return items.toPageDto(pageMetaDto);
  }

  @Transactional()
  async delete(findData: FindOptionsWhere<Entity>): Promise<boolean> {
    let isSuccess = false;
    const entities: Entity[] = await this.repository.findBy(findData);

    if (entities.length > 0) {
      await this.repository.softRemove(entities);
      isSuccess = true;
    }

    return isSuccess;
  }
}
