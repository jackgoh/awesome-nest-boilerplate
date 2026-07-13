import { UnauthorizedException } from '@nestjs/common';

import { type Uuid } from '../../types';
import { AccountAccessStateService } from './account-access-state.service';
import { AccountStatus } from './account-status.enum';

describe('AccountAccessStateService', () => {
  const userId = '57f9af62-eabc-4ee8-9a1c-b010a51ae31e' as Uuid;
  const repository = { findOne: jest.fn() };
  const service = new AccountAccessStateService(repository as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns only authoritative account access state', async () => {
    repository.findOne.mockResolvedValue({
      id: userId,
      status: AccountStatus.ACTIVE,
      authorizationRevision: 5,
      sessionVersion: 3,
    });

    await expect(service.requireActive(userId, 3)).resolves.toMatchObject({
      authorizationRevision: 5,
      sessionVersion: 3,
    });
    expect(repository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: userId },
        select: expect.objectContaining({
          authorizationRevision: true,
          sessionVersion: true,
          status: true,
        }),
      }),
    );
  });

  it.each([
    [AccountStatus.SUSPENDED, 3],
    [AccountStatus.DELETED, 3],
    [AccountStatus.ACTIVE, 4],
  ])('rejects inactive or stale state (%s)', async (status, sessionVersion) => {
    repository.findOne.mockResolvedValue({
      id: userId,
      status,
      authorizationRevision: 5,
      sessionVersion,
    });

    await expect(service.requireActive(userId, 3)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
