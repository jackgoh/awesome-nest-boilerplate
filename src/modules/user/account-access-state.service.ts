import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type Repository } from 'typeorm';

import { AccountStatus } from './account-status.enum';
import { UserEntity } from './user.entity';

export interface AccountAccessState {
  authorizationRevision: number;
  id: Uuid;
  sessionVersion: number;
  status: AccountStatus;
}

@Injectable()
export class AccountAccessStateService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async requireActive(
    userId: Uuid,
    expectedSessionVersion?: number,
  ): Promise<AccountAccessState> {
    const state = await this.userRepository.findOne({
      where: { id: userId },
      select: {
        id: true,
        status: true,
        authorizationRevision: true,
        sessionVersion: true,
      },
    });

    if (
      !state ||
      state.status !== AccountStatus.ACTIVE ||
      (expectedSessionVersion !== undefined &&
        state.sessionVersion !== expectedSessionVersion)
    ) {
      throw new UnauthorizedException('Invalid authentication state');
    }

    return state;
  }
}
