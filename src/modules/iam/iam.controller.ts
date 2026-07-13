import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Permission } from '../../constants/permissions.enum';
import { Auth, UUIDParam } from '../../decorators';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { PermissionDto } from './dto/permission.dto';
import { RoleDto } from './dto/role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { IAMService } from './iam.service';

@Controller('iam')
@ApiTags('iam')
export class IAMController {
  constructor(private readonly iamService: IAMService) {}

  @Post('roles')
  @Auth([Permission.ROLE_MANAGE])
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({
    type: RoleDto,
    description: 'Successfully created role',
  })
  async createRole(@Body() createRoleDto: CreateRoleDto): Promise<RoleDto> {
    const role = await this.iamService.createRole(createRoleDto);

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
  @ApiOkResponse({ type: RoleDto, description: 'Successfully updated role' })
  async updateRole(
    @UUIDParam('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ): Promise<RoleDto> {
    const role = await this.iamService.updateRole(id, updateRoleDto);

    return role.toDto();
  }

  @Delete('roles/:id')
  @Auth([Permission.ROLE_MANAGE])
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Successfully deleted role' })
  async deleteRole(@UUIDParam('id') id: string): Promise<void> {
    await this.iamService.deleteRole(id);
  }

  @Post('permissions')
  @Auth([Permission.PERMISSION_MANAGE])
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({
    type: PermissionDto,
    description: 'Successfully created permission',
  })
  async createPermission(
    @Body() createPermissionDto: CreatePermissionDto,
  ): Promise<PermissionDto> {
    const permission =
      await this.iamService.createPermission(createPermissionDto);

    return permission.toDto();
  }

  @Get('permissions')
  @Auth([Permission.PERMISSION_LIST])
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: [PermissionDto], description: 'List of permissions' })
  async findAllPermissions(): Promise<PermissionDto[]> {
    const permissions = await this.iamService.findAllPermissions();

    return permissions.map((p) => p.toDto());
  }
}
