import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  Version,
} from '@nestjs/common';
import {
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ClsService } from 'nestjs-cls';

import { ApiFile, Auth, AuthUser, Public } from '../../decorators';
import { type IFile } from '../../interfaces';
import { type AuthenticatedUser } from '../../types/auth-user.type';
import { UserDto } from '../user/dtos/user.dto';
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginPayloadDto } from './dto/login-payload.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { TokenPayloadDto } from './dto/token-payload.dto';
import { UserLoginDto } from './dto/user-login.dto';
import { UserRegisterDto } from './dto/user-register.dto';

const AUTH_RATE_LIMIT_TTL = 60_000;

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(
    private userService: UserService,
    private authService: AuthService,
    private readonly cls: ClsService,
  ) {}

  @Post('login')
  @Public()
  @Throttle({ default: { limit: 5, ttl: AUTH_RATE_LIMIT_TTL } })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: LoginPayloadDto,
    description: 'User info with access token',
  })
  async userLogin(
    @Body() userLoginDto: UserLoginDto,
  ): Promise<LoginPayloadDto> {
    const userEntity = await this.authService.validateUser(userLoginDto);

    const tokens = await this.authService.createTokens({
      userId: userEntity.id,
      roles: userEntity.roles,
      sessionVersion: userEntity.sessionVersion,
    });

    return new LoginPayloadDto(userEntity.toDto(), tokens);
  }

  @Post('refresh')
  @Public()
  @Throttle({ default: { limit: 10, ttl: AUTH_RATE_LIMIT_TTL } })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: TokenPayloadDto,
    description: 'New access and refresh tokens',
  })
  refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<TokenPayloadDto> {
    return this.authService.refreshAccessToken(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @Auth()
  @ApiOkResponse({
    description: 'Successfully logged out',
  })
  async logout(
    @AuthUser() user: AuthenticatedUser,
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<{
    message: string;
  }> {
    await this.authService.logout(
      user.id,
      user.authentication.sessionId,
      refreshTokenDto.refreshToken,
    );

    return {
      message: 'Successfully logged out',
    };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @Auth()
  @ApiOkResponse({
    description: 'Successfully logged out from all sessions',
  })
  async logoutAll(@AuthUser() user: AuthenticatedUser): Promise<{
    message: string;
  }> {
    await this.authService.logoutAll(user.id, this.cls.getId() as Uuid);

    return {
      message: 'Successfully logged out from all sessions',
    };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auth()
  @ApiNoContentResponse({
    description: 'Password changed and sessions revoked',
  })
  @ApiUnauthorizedResponse({ description: 'Current password is invalid' })
  changePassword(
    @AuthUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    return this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
      this.cls.getId() as Uuid,
    );
  }

  @Post('register')
  @Public()
  @Throttle({ default: { limit: 3, ttl: AUTH_RATE_LIMIT_TTL } })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: UserDto, description: 'Successfully Registered' })
  @ApiFile({ name: 'avatar' })
  async userRegister(
    @Body() userRegisterDto: UserRegisterDto,
    @UploadedFile() file?: IFile,
  ): Promise<UserDto> {
    const createdUser = await this.userService.createUser(
      userRegisterDto,
      file,
    );

    return createdUser.toDto({
      isActive: true,
    });
  }

  @Version('1')
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @Auth()
  @ApiOkResponse({
    type: UserDto,
    description: 'Current user info with computed permissions',
  })
  getCurrentUser(@AuthUser() user: AuthenticatedUser): UserDto {
    return user.toDto();
  }
}
