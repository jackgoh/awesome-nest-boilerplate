import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Transactional, TransactionHost } from '@nestjs-cls/transactional';
import { type TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { plainToClass } from 'class-transformer';
import { type FindOneOptions, type Repository } from 'typeorm';

import { PageDto } from '../../common/dto/page.dto';
import { PageMetaDto } from '../../common/dto/page-meta.dto';
import { generateHash } from '../../common/utils';
import { FileNotImageException, UserNotFoundException } from '../../exceptions';
import { type IFile } from '../../interfaces';
import { AwsS3Service } from '../../shared/services/aws-s3.service';
import { ApiConfigService } from '../../shared/services/api-config.service';
import { ValidatorService } from '../../shared/services/validator.service';
import { UserRegisterDto } from '../auth/dto/user-register.dto';
import { IAMService } from '../iam/iam.service';
import { CreateSettingsDto } from './dtos/create-settings.dto';
import { type UserDto } from './dtos/user.dto';
import { type UsersPageOptionsDto } from './dtos/users-page-options.dto';
import { UserEntity } from './user.entity';
import { UserSettingsEntity } from './user-settings.entity';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
    private validatorService: ValidatorService,
    private awsS3Service: AwsS3Service,
    private iamService: IAMService,
    private configService: ApiConfigService,
  ) {}

  /**
   * Repositories obtained from the transactional EntityManager participate in
   * the current CLS transaction and fall back to the default manager otherwise.
   */
  private get userRepository(): Repository<UserEntity> {
    return this.txHost.tx.getRepository(UserEntity);
  }

  private get userSettingsRepository(): Repository<UserSettingsEntity> {
    return this.txHost.tx.getRepository(UserSettingsEntity);
  }

  /**
   * Find single user
   */
  findOne(findData: FindOneOptions<UserEntity>): Promise<UserEntity | null> {
    return this.userRepository.findOne(findData);
  }

  @Transactional()
  async createUser(
    userRegisterDto: UserRegisterDto,
    file?: IFile,
  ): Promise<UserEntity> {
    const user = this.userRepository.create(userRegisterDto);

    user.password = await generateHash(
      userRegisterDto.password,
      this.configService.authConfig.bcryptRounds,
    );

    if (file && !this.validatorService.isImage(file.mimetype)) {
      throw new FileNotImageException();
    }

    if (file) {
      user.avatar = await this.awsS3Service.uploadImage(file);
    }

    const role = await this.iamService.findRoleByName('user');

    if (!role) {
      this.logger.error(
        "Default 'user' role not found. Please ensure database is seeded correctly.",
      );

      throw new InternalServerErrorException("Default 'user' role not found.");
    }

    user.roles = [role];

    await this.userRepository.save(user);

    user.settings = await this.createSettings(
      user.id,
      plainToClass(CreateSettingsDto, {
        isEmailVerified: false,
        isPhoneVerified: false,
      }),
    );

    return user;
  }

  async getUsers(
    pageOptionsDto: UsersPageOptionsDto,
  ): Promise<PageDto<UserDto>> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');
    queryBuilder.select([
      'user.id',
      'user.firstName',
      'user.lastName',
      'user.email',
      'user.status',
      'user.createdAt',
    ]);
    queryBuilder.leftJoin('user.roles', 'roles');
    queryBuilder.addSelect(['roles.id', 'roles.name']);
    queryBuilder.orderBy('user.createdAt', pageOptionsDto.order);
    queryBuilder.addOrderBy('user.id', pageOptionsDto.order);
    queryBuilder.skip(pageOptionsDto.skip).take(pageOptionsDto.take);

    const items = await queryBuilder.getMany();
    const itemCount = await queryBuilder.getCount();
    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });

    return new PageDto(
      items.map((item) => item.toDto()),
      pageMetaDto,
    );
  }

  async getUser(userId: Uuid): Promise<UserDto> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    queryBuilder.where('user.id = :userId', { userId });
    queryBuilder.leftJoinAndSelect('user.roles', 'roles');

    const userEntity = await queryBuilder.getOne();

    if (!userEntity) {
      throw new UserNotFoundException();
    }

    return userEntity.toDto();
  }

  async createSettings(
    userId: Uuid,
    createSettingsDto: CreateSettingsDto,
  ): Promise<UserSettingsEntity> {
    const { isEmailVerified, isPhoneVerified } = createSettingsDto;
    const userSettings = this.userSettingsRepository.create({
      isEmailVerified,
      isPhoneVerified,
      userId,
    });

    return this.userSettingsRepository.save(userSettings);
  }
}
