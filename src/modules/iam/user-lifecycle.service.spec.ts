import { UnauthorizedException } from '@nestjs/common';

import { generateHash, validateHash } from '../../common/utils';
import { Permission } from '../../constants/permissions.enum';
import { type Uuid } from '../../types';
import { type AuthenticatedUser } from '../../types/auth-user.type';
import { AccountStatus } from '../user/account-status.enum';
import { UserEntity } from '../user/user.entity';
import { UserLifecycleService } from './user-lifecycle.service';

jest.mock('../../common/utils', () => ({
  generateHash: jest.fn().mockResolvedValue('new-password-hash'),
  getVariableName: jest.fn().mockReturnValue('AccountStatus'),
  validateHash: jest.fn().mockResolvedValue(true),
}));

describe('UserLifecycleService', () => {
  const actorId = '57f9af62-eabc-4ee8-9a1c-b010a51ae31e' as Uuid;
  const userId = 'f3f1c524-5de4-489f-b62e-f337008169bb' as Uuid;
  const correlationId = '019f5ce3-cccb-7631-a9a1-cbacc12fb192' as Uuid;
  const actor = {
    id: actorId,
    computedPermissions: [Permission.USER_UPDATE],
  } as unknown as AuthenticatedUser;
  const repository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const manager = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === UserEntity) {
        return repository;
      }

      throw new Error('Unexpected repository');
    }),
  };
  const txHost = {
    tx: manager,
    withTransaction: jest.fn((callback: () => unknown) => callback()),
  };
  const policy = { assertCanManageAccount: jest.fn().mockReturnValue(false) };
  const audit = { record: jest.fn() };
  const outbox = { enqueue: jest.fn() };
  const config = { authConfig: { bcryptRounds: 12 } };
  const service = new UserLifecycleService(
    txHost as never,
    policy as never,
    audit as never,
    outbox as never,
    config as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    repository.save.mockImplementation((user) => Promise.resolve(user));
    audit.record.mockResolvedValue(undefined);
    outbox.enqueue.mockResolvedValue(undefined);
    jest.mocked(validateHash).mockResolvedValue(true);
    jest.mocked(generateHash).mockResolvedValue('new-password-hash');
  });

  function activeUser(): UserEntity {
    return {
      id: userId,
      status: AccountStatus.ACTIVE,
      authorizationRevision: 4,
      sessionVersion: 7,
      suspendedAt: null,
      suspendedReason: null,
      deletedAt: null,
      password: 'current-password-hash',
      roles: [],
      directPermissions: [],
      computedPermissions: [],
    } as unknown as UserEntity;
  }

  it('suspends atomically and advances both security revisions', async () => {
    const user = activeUser();
    repository.findOne.mockResolvedValue(user);

    await service.suspend(actor, userId, 'Incident 42', correlationId);

    expect(user).toMatchObject({
      status: AccountStatus.SUSPENDED,
      authorizationRevision: 5,
      sessionVersion: 8,
      suspendedReason: 'Incident 42',
    });
    expect(audit.record).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({ action: 'iam.user.suspended' }),
    );
    expect(outbox.enqueue).toHaveBeenCalledWith(
      manager,
      'authorization.changed',
      expect.objectContaining({
        userIds: [userId],
        revokeSessions: true,
      }),
    );
  });

  it('durably revokes every session before Redis cleanup runs', async () => {
    const user = activeUser();
    repository.findOne.mockResolvedValue(user);

    await service.revokeOwnSessions(userId, correlationId);

    expect(user.sessionVersion).toBe(8);
    expect(repository.save).toHaveBeenCalledWith(user);
    expect(outbox.enqueue).toHaveBeenCalledWith(
      manager,
      'authorization.changed',
      expect.objectContaining({ revokeSessions: true }),
    );
  });

  it('uses configured asynchronous hashing and revokes sessions on password change', async () => {
    const user = activeUser();
    repository.findOne.mockResolvedValue(user);

    await service.changePassword(
      userId,
      'current-password',
      'a-new-long-password',
      correlationId,
    );

    expect(validateHash).toHaveBeenCalledWith(
      'current-password',
      'current-password-hash',
    );
    expect(generateHash).toHaveBeenCalledWith('a-new-long-password', 12);
    expect(user.password).toBe('new-password-hash');
    expect(user.sessionVersion).toBe(8);
  });

  it('does not mutate the account when the current password is invalid', async () => {
    const user = activeUser();
    repository.findOne.mockResolvedValue(user);
    jest.mocked(validateHash).mockResolvedValue(false);

    await expect(
      service.changePassword(
        userId,
        'wrong-password',
        'a-new-long-password',
        correlationId,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(repository.save).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });
});
