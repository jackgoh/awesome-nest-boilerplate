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
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { ApiFile, Auth, AuthUser, Public } from '../../decorators';
import { type IFile } from '../../interfaces';
import { type AuthenticatedUser } from '../../types/auth-user.type';
import { UserDto } from '../user/dtos/user.dto';
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';
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
    await this.authService.logout(user.id, refreshTokenDto.refreshToken);

    return {
      message: 'Successfully logged out',
    };
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
