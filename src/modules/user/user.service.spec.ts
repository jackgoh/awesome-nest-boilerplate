import { type TransactionHost } from '@nestjs-cls/transactional';
import { type TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

import { PageDto } from '../../common/dto/page.dto';
import { PageMetaDto } from '../../common/dto/page-meta.dto';
import { Order } from '../../constants';
import { type AwsS3Service } from '../../shared/services/aws-s3.service';
import { type ApiConfigService } from '../../shared/services/api-config.service';
import { type ValidatorService } from '../../shared/services/validator.service';
import { type IAMService } from '../iam/iam.service';
import { UsersPageOptionsDto } from './dtos/users-page-options.dto';
import { UserService } from './user.service';
import { UserSettingsEntity } from './user-settings.entity';

describe('UserService', () => {
  const queryBuilder = {
    addOrderBy: jest.fn(),
    addSelect: jest.fn(),
    getCount: jest.fn(),
    getMany: jest.fn(),
    leftJoin: jest.fn(),
    orderBy: jest.fn(),
    select: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
  };
  const userRepository = {
    createQueryBuilder: jest.fn(() => queryBuilder),
  };
  const userSettingsRepository = {
    create: jest.fn((input: object) => input),
    save: jest.fn((input: object) => Promise.resolve(input)),
  };
  const transactionalManager = {
    getRepository: jest.fn((entity: unknown) =>
      entity === UserSettingsEntity ? userSettingsRepository : userRepository,
    ),
  };
  let service: UserService;

  beforeEach(() => {
    jest.clearAllMocks();

    for (const method of [
      queryBuilder.addOrderBy,
      queryBuilder.addSelect,
      queryBuilder.leftJoin,
      queryBuilder.orderBy,
      queryBuilder.select,
      queryBuilder.skip,
      queryBuilder.take,
    ]) {
      method.mockReturnValue(queryBuilder);
    }

    queryBuilder.getMany.mockResolvedValue([]);
    queryBuilder.getCount.mockResolvedValue(0);
    service = new UserService(
      {
        tx: transactionalManager,
      } as unknown as TransactionHost<TransactionalAdapterTypeOrm>,
      {} as unknown as ValidatorService,
      {} as unknown as AwsS3Service,
      {} as unknown as IAMService,
      {
        authConfig: { bcryptRounds: 12 },
      } as unknown as ApiConfigService,
    );
  });

  it.each([Order.ASC, Order.DESC])(
    'orders users by creation time and id in %s order',
    async (order) => {
      const pageOptionsDto = Object.assign(new UsersPageOptionsDto(), {
        order,
      });

      const result = await service.getUsers(pageOptionsDto);

      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'user.createdAt',
        order,
      );
      expect(queryBuilder.addOrderBy).toHaveBeenCalledWith('user.id', order);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.orderBy.mock.invocationCallOrder[0]).toBeLessThan(
        queryBuilder.getMany.mock.invocationCallOrder[0],
      );
      expect(result).toEqual(
        new PageDto([], new PageMetaDto({ itemCount: 0, pageOptionsDto })),
      );
    },
  );

  it('builds the page explicitly without global prototype helpers', async () => {
    const userDto = { id: 'a2ac8e6f-fe45-4d77-bcaa-c4b190b81b95' };
    const user = { toDto: jest.fn(() => userDto) };
    const pageOptionsDto = Object.assign(new UsersPageOptionsDto(), {
      page: 2,
      take: 5,
    });
    queryBuilder.getMany.mockResolvedValueOnce([user]);
    queryBuilder.getCount.mockResolvedValueOnce(11);

    const result = await service.getUsers(pageOptionsDto);

    expect(queryBuilder.skip).toHaveBeenCalledWith(5);
    expect(queryBuilder.take).toHaveBeenCalledWith(5);
    expect(queryBuilder.getMany.mock.invocationCallOrder[0]).toBeLessThan(
      queryBuilder.getCount.mock.invocationCallOrder[0],
    );
    expect(user.toDto).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      new PageDto(
        [userDto],
        new PageMetaDto({ itemCount: 11, pageOptionsDto }),
      ),
    );
  });

  it('creates settings directly through the transactional repository', async () => {
    const userId = '57f9af62-eabc-4ee8-9a1c-b010a51ae31e' as Uuid;

    await expect(
      service.createSettings(userId, { isEmailVerified: false }),
    ).resolves.toEqual({ userId, isEmailVerified: false });
    expect(transactionalManager.getRepository).toHaveBeenCalledWith(
      UserSettingsEntity,
    );
    expect(userSettingsRepository.create).toHaveBeenCalledWith({
      userId,
      isEmailVerified: false,
    });
    expect(userSettingsRepository.save).toHaveBeenCalledWith({
      userId,
      isEmailVerified: false,
    });
  });
});
