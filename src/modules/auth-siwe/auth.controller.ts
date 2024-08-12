import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Version,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { RoleType } from '@/constants';
import { Auth, AuthUser } from '@/decorators';
import { ApiOkResponse } from '@/decorators/api-ok-response.decorator';
import { Request } from 'express';
import { UserDto } from '../user-v2/dtos/user.dto';
import { UserEntity } from '../user-v2/user.entity';
import { AuthService } from './auth.service';
import { LoginPayloadDto } from './dto/login-payload.dto';
import { SiweMessagePayload } from './dto/siwe-message-payload.dto';
import { UserLoginDto } from './dto/user-login.dto';
import { UserRegisterDto } from './dto/user-register.dto';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('/siweMessage')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: SiweMessagePayload,
    description: 'Generate SIWE message to user pre-login',
  })
  async generateSiweMessage(
    @Query() param: UserRegisterDto,
    @Req() request: Request,
  ): Promise<SiweMessagePayload> {
    // generate SIWE message
    const siweMessage = this.authService.generateSiweMessage(
      param.wallet_address,
      param.chain_id,
    );

    // store message in Redis
    await this.authService.storeSiweCache(siweMessage, request);

    // return payload
    return new SiweMessagePayload(siweMessage.strMessage);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: LoginPayloadDto,
    description: 'User info with access token',
  })
  async login(
    @Body() userLoginDto: UserLoginDto,
    @Req() request: Request,
  ): Promise<LoginPayloadDto> {
    const userEntity = await this.authService.validateUser(
      userLoginDto,
      request,
    );

    const token = await this.authService.createAccessToken({
      userId: userEntity.id,
      role: userEntity.role,
    });

    return new LoginPayloadDto(userEntity.toDto(), token);
  }

  @Post('logout')
  @Auth([RoleType.USER])
  @HttpCode(HttpStatus.OK)
  async logout(@Req() request: Request): Promise<boolean> {
    // revoke token
    await this.authService.revokeAccessToken(
      (request.user as UserEntity).wallet_address,
      request,
    );

    // response
    return true;
  }

  @Version('1')
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @Auth([RoleType.USER, RoleType.ADMIN])
  @ApiOkResponse({ type: UserDto, description: 'current user info' })
  getCurrentUser(@AuthUser() user: UserEntity): UserDto {
    return user.toDto();
  }
}
