import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ClsService } from 'nestjs-cls';

import { Permission } from '../../constants/permissions.enum';
import { Auth, AuthUser, UUIDParam } from '../../decorators';
import { type AuthenticatedUser } from '../../types/auth-user.type';
import { type AuditEventEntity } from '../audit/audit-event.entity';
import { AuditEventsQueryDto } from './dto/audit-events-query.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { LifecycleReasonDto } from './dto/lifecycle-reason.dto';
import { PermissionDto } from './dto/permission.dto';
import { ReplaceUserDirectPermissionsDto } from './dto/replace-user-direct-permissions.dto';
import { ReplaceUserRolesDto } from './dto/replace-user-roles.dto';
import { RoleDto } from './dto/role.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { IAMService } from './iam.service';
import { UserLifecycleService } from './user-lifecycle.service';

@Controller('iam')
@ApiTags('iam')
export class IAMController {
  constructor(
    private readonly iamService: IAMService,
    private readonly lifecycleService: UserLifecycleService,
    private readonly cls: ClsService,
  ) {}

  @Post('roles')
  @Auth([Permission.ROLE_MANAGE])
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: RoleDto, description: 'Created custom role' })
  async createRole(
    @AuthUser() actor: AuthenticatedUser,
    @Body() dto: CreateRoleDto,
  ): Promise<RoleDto> {
    const role = await this.iamService.createRole(
      actor,
      dto,
      this.correlationId(),
    );

    return role.toDto();
  }

  @Get('roles')
  @Auth([Permission.ROLE_LIST])
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: [RoleDto], description: 'List of roles' })
  async findAllRoles(): Promise<RoleDto[]> {
    const roles = await this.iamService.findAllRoles();

    return roles.map((role) => role.toDto());
  }

  @Get('roles/:id')
  @Auth([Permission.ROLE_READ])
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: RoleDto, description: 'Role details' })
  async findRoleById(@UUIDParam('id') id: string): Promise<RoleDto> {
    const role = await this.iamService.findRoleById(id);

    return role.toDto();
  }

  @Patch('roles/:id')
  @Auth([Permission.ROLE_MANAGE])
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: RoleDto, description: 'Updated custom role' })
  @ApiForbiddenResponse({ description: 'System role or grant policy denied' })
  @ApiUnprocessableEntityResponse({ description: 'Unknown or duplicate IDs' })
  async updateRole(
    @AuthUser() actor: AuthenticatedUser,
    @UUIDParam('id') id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleDto> {
    const role = await this.iamService.updateRole(
      actor,
      id,
      dto,
      this.correlationId(),
    );

    return role.toDto();
  }

  @Delete('roles/:id')
  @Auth([Permission.ROLE_MANAGE])
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Deleted custom role' })
  @ApiForbiddenResponse({ description: 'System role is protected' })
  @ApiConflictResponse({ description: 'Role still has assigned members' })
  deleteRole(
    @AuthUser() actor: AuthenticatedUser,
    @UUIDParam('id') id: string,
  ): Promise<void> {
    return this.iamService.deleteRole(actor, id, this.correlationId());
  }

  @Put('users/:id/roles')
  @Auth([Permission.ROLE_ASSIGN])
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Replaced user roles' })
  @ApiForbiddenResponse({ description: 'Role assignment policy denied' })
  @ApiUnprocessableEntityResponse({ description: 'Unknown or duplicate IDs' })
  replaceUserRoles(
    @AuthUser() actor: AuthenticatedUser,
    @UUIDParam('id') userId: Uuid,
    @Body() dto: ReplaceUserRolesDto,
  ): Promise<void> {
    return this.iamService.replaceUserRoles(
      actor,
      userId,
      dto,
      this.correlationId(),
    );
  }

  @Put('users/:id/direct-permissions')
  @Auth([Permission.PERMISSION_ASSIGN])
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Replaced direct permissions' })
  @ApiForbiddenResponse({ description: 'Permission grant policy denied' })
  @ApiUnprocessableEntityResponse({ description: 'Unknown or duplicate IDs' })
  replaceUserDirectPermissions(
    @AuthUser() actor: AuthenticatedUser,
    @UUIDParam('id') userId: Uuid,
    @Body() dto: ReplaceUserDirectPermissionsDto,
  ): Promise<void> {
    return this.iamService.replaceUserDirectPermissions(
      actor,
      userId,
      dto,
      this.correlationId(),
    );
  }

  @Get('permissions')
  @Auth([Permission.PERMISSION_LIST])
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: [PermissionDto], description: 'Static permissions' })
  async findAllPermissions(): Promise<PermissionDto[]> {
    const permissions = await this.iamService.findAllPermissions();

    return permissions.map((permission) => permission.toDto());
  }

  @Get('audit-events')
  @Auth([Permission.AUDIT_READ])
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Filtered IAM audit events' })
  findAuditEvents(
    @Query() query: AuditEventsQueryDto,
  ): Promise<AuditEventEntity[]> {
    return this.iamService.findAuditEvents(query);
  }

  @Post('users/:id/suspend')
  @Auth([Permission.USER_UPDATE])
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Suspended account and revoked tokens' })
  @ApiForbiddenResponse({ description: 'Account management policy denied' })
  @ApiConflictResponse({ description: 'Invalid lifecycle transition' })
  suspendUser(
    @AuthUser() actor: AuthenticatedUser,
    @UUIDParam('id') userId: Uuid,
    @Body() dto: SuspendUserDto,
  ): Promise<void> {
    return this.lifecycleService.suspend(
      actor,
      userId,
      dto.reason,
      this.correlationId(),
    );
  }

  @Post('users/:id/activate')
  @Auth([Permission.USER_UPDATE])
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Activated account' })
  @ApiForbiddenResponse({ description: 'Account management policy denied' })
  @ApiConflictResponse({ description: 'Invalid lifecycle transition' })
  activateUser(
    @AuthUser() actor: AuthenticatedUser,
    @UUIDParam('id') userId: Uuid,
    @Body() dto: LifecycleReasonDto = new LifecycleReasonDto(),
  ): Promise<void> {
    return this.lifecycleService.activate(
      actor,
      userId,
      dto.reason,
      this.correlationId(),
    );
  }

  @Post('users/:id/revoke-sessions')
  @Auth([Permission.USER_UPDATE])
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Durably revoked all user sessions' })
  @ApiForbiddenResponse({ description: 'Account management policy denied' })
  revokeUserSessions(
    @AuthUser() actor: AuthenticatedUser,
    @UUIDParam('id') userId: Uuid,
    @Body() dto: LifecycleReasonDto = new LifecycleReasonDto(),
  ): Promise<void> {
    return this.lifecycleService.revokeSessions(
      actor,
      userId,
      dto.reason,
      this.correlationId(),
    );
  }

  @Delete('users/:id')
  @Auth([Permission.USER_DELETE])
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Soft-deleted account' })
  @ApiForbiddenResponse({ description: 'Account management policy denied' })
  @ApiConflictResponse({ description: 'Invalid lifecycle transition' })
  softDeleteUser(
    @AuthUser() actor: AuthenticatedUser,
    @UUIDParam('id') userId: Uuid,
    @Body() dto: LifecycleReasonDto = new LifecycleReasonDto(),
  ): Promise<void> {
    return this.lifecycleService.softDelete(
      actor,
      userId,
      dto.reason,
      this.correlationId(),
    );
  }

  private correlationId(): Uuid {
    return this.cls.getId() as Uuid;
  }
}
