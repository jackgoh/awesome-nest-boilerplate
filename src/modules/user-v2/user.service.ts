import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';

import { PageDto } from '@/common/dto/page.dto';
import { RoleType } from '@/constants';
import { DuplicateResourceCreated } from '@/exceptions/duplicate-resource-created.exception';
import { Address } from 'viem';
import { UserNotFoundException } from '../../exceptions';
import { AdminRegisterDto } from '../auth-siwe/dto/admin-register.dto';
import { UserRegisterDto } from '../auth-siwe/dto/user-register.dto';
import { type UserDto } from './dtos/user.dto';
import { type UsersPageOptionsDto } from './dtos/users-page-options.dto';
import { UserEntity } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
  ) {}

  /**
   * Find single user
   */
  findOne(findData: FindOptionsWhere<UserEntity>): Promise<UserEntity | null> {
    return this.userRepository.findOneBy(findData);
  }

  @Transactional()
  async createUser(userRegisterDto: UserRegisterDto): Promise<UserEntity> {
    // validate user existence, return if exist
    await this.ensureUserInexist(userRegisterDto.wallet_address);

    // create user
    const user = this.userRepository.create(userRegisterDto);

    await this.userRepository.save(user);

    return user;
  }

  @Transactional()
  async createAdmin(adminRegisterDto: AdminRegisterDto): Promise<UserEntity> {
    // validate user existence, return if exist
    await this.ensureUserInexist(adminRegisterDto.wallet_address);

    // create user
    const user = this.userRepository.create({
      ...adminRegisterDto,
      role: RoleType.ADMIN,
    });

    await this.userRepository.save(user);

    return user;
  }

  async getUsers(
    pageOptionsDto: UsersPageOptionsDto,
  ): Promise<PageDto<UserDto>> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');
    const [items, pageMetaDto] = await queryBuilder.paginate(pageOptionsDto);

    return items.toPageDto(pageMetaDto);
  }

  async getUser(userId: Uuid): Promise<UserDto> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    queryBuilder.where('user.id = :userId', { userId });

    const userEntity = await queryBuilder.getOne();

    if (!userEntity) {
      throw new UserNotFoundException();
    }

    return userEntity.toDto();
  }

  private async ensureUserInexist(wallet_address: Address) {
    // if row exist, throw error
    const user = await this.userRepository.findOne({
      where: {
        wallet_address: wallet_address,
      },
    });

    if (user)
      throw new DuplicateResourceCreated(
        `user with addresss '${user.wallet_address}' is already existed`,
      );
  }
}
