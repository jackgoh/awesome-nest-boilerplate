import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  Version,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { type Request, type Response } from 'express';

import { ApiFile, Auth, AuthUser, Cookies } from '../../decorators';
import { type IFile } from '../../interfaces';
import { ApiConfigService } from '../../shared/services/api-config.service';
import { type AuthenticatedUser } from '../../types/auth-user.type';
import { UserDto } from '../user/dtos/user.dto';
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';
import { LoginPayloadDto } from './dto/login-payload.dto';
import { TokenPayloadDto } from './dto/token-payload.dto';
import { UserLoginDto } from './dto/user-login.dto';
import { UserRegisterDto } from './dto/user-register.dto';
import { RefreshJwtGuard } from './refresh-jwt.guard';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(
    private userService: UserService,
    private authService: AuthService,
    private configService: ApiConfigService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: LoginPayloadDto,
    description: 'User info with access token',
  })
  async userLogin(
    @Body() userLoginDto: UserLoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginPayloadDto> {
    const userEntity = await this.authService.validateUser(userLoginDto);

    const tokens = await this.authService.createTokens({
      userId: userEntity.id,
      roles: userEntity.roles,
    });

    // Set refresh token as secure HTTP-only cookie
    response.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: this.configService.isProduction,
      sameSite: 'strict',
      maxAge: this.configService.authConfig.cookieMaxAge,
    });

    response.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: this.configService.isProduction,
      sameSite: 'strict',
      maxAge: this.configService.authConfig.jwtExpirationTime * 1000,
    });

    return new LoginPayloadDto(userEntity.toDto(), {
      expiresIn: tokens.expiresIn,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshJwtGuard)
  @ApiOkResponse({
    type: TokenPayloadDto,
    description: 'New access and refresh tokens',
  })
  async refreshToken(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<TokenPayloadDto> {
    const refreshToken =
      request.cookies.refreshToken || request.body?.refreshToken;

    const tokens = await this.authService.refreshAccessToken(refreshToken);

    // Set new refresh token as secure HTTP-only cookie
    response.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: this.configService.isProduction,
      sameSite: 'strict',
      maxAge: this.configService.authConfig.cookieMaxAge,
    });

    // Set new access token as cookie as well
    response.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: this.configService.isProduction,
      sameSite: 'strict',
      maxAge: this.configService.authConfig.jwtExpirationTime * 1000,
    });

    return tokens;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @Auth()
  @ApiOkResponse({
    description: 'Successfully logged out',
  })
  async logout(
    @AuthUser() user: AuthenticatedUser,
    @Cookies('refreshToken') refreshToken: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{
    message: string;
  }> {
    if (refreshToken) {
      await this.authService.logout(user.id, refreshToken);
    }

    // Clear refresh token cookie
    response.clearCookie('refreshToken', {
      httpOnly: true,
      secure: this.configService.isProduction,
      sameSite: 'strict',
    });

    // Clear access token cookie
    response.clearCookie('accessToken', {
      httpOnly: true,
      secure: this.configService.isProduction,
      sameSite: 'strict',
    });

    return {
      message: 'Successfully logged out',
    };
  }

  @Post('register')
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
