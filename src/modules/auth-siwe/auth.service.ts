import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { RoleType, TokenType } from '@/constants';
import { SiweInvalidSignatureException } from '@/modules/auth-siwe/exceptions/siwe-invalid-signature.exception';
import { ApiConfigService } from '@/shared/services/api-config.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CacheRedis } from 'cache-manager';
import { Request } from 'express';
import { Jwt, JwtPayload } from 'jsonwebtoken';
import { Address } from 'viem';
import {
  SiweMessage,
  createSiweMessage,
  generateSiweNonce,
  parseSiweMessage,
} from 'viem/siwe';
import { UserEntity } from '../user-v2/user.entity';
import { UserService } from '../user-v2/user.service';
import { ViemService } from '../viem/viem.service';
import { TokenPayloadDto } from './dto/token-payload.dto';
import { type UserLoginDto } from './dto/user-login.dto';
import { SiweExpiredMessageException } from './exceptions/siwe-expired-message.exception';

@Injectable()
export class AuthService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: CacheRedis,
    private jwtService: JwtService,
    private configService: ApiConfigService,
    private userService: UserService,
    private viemService: ViemService,
  ) {}

  async createAccessToken(data: {
    role: RoleType;
    userId: Uuid;
  }): Promise<TokenPayloadDto> {
    return new TokenPayloadDto({
      expiresIn: this.configService.authConfig.jwtExpirationTime,
      accessToken: await this.jwtService.signAsync({
        userId: data.userId,
        type: TokenType.ACCESS_TOKEN,
        role: data.role,
      }),
    });
  }

  async validateUser(
    userLoginDto: UserLoginDto,
    request: Request,
  ): Promise<UserEntity> {
    const client = this.viemService.getPublicClient(userLoginDto.chain_id);

    // retrieve message from Redis
    const messageRedis = await this.cacheManager.get<string>(
      this.parseSiweCacheKey(
        userLoginDto.wallet_address,
        request.headers['user-agent']!,
      ),
    );

    if (messageRedis === undefined) {
      throw new SiweExpiredMessageException();
    }

    const message: SiweMessage = parseSiweMessage(messageRedis) as SiweMessage;

    // verify message
    const success = await client.verifySiweMessage({
      message: createSiweMessage(message),
      signature: userLoginDto.signature,
    });

    if (!success) {
      throw new SiweInvalidSignatureException();
    }

    // revoke SIWE message (remove from redis)
    this.cacheManager.del(
      this.parseSiweCacheKey(
        userLoginDto.wallet_address,
        request.headers['user-agent']!,
      ),
    );

    // get user
    let user: UserEntity | null;
    user = await this.userService.findOne({
      wallet_address: userLoginDto.wallet_address as Address,
    });

    // create user if not existed
    if (!user) {
      user = await this.userService.createUser(userLoginDto);
    }

    // return user
    return user;
  }

  generateSiweMessage(
    wallet_address: Address,
    chainId: number,
  ): {
    strMessage: string;
    objMessage: SiweMessage;
  } {
    // create message (including nonce)
    const message: SiweMessage = {
      address: wallet_address,
      chainId,
      domain: 'localhost',
      nonce: generateSiweNonce(),
      uri: 'http://localhost:3000/auth/login',
      version: '1',
    };

    // return message
    return {
      strMessage: createSiweMessage(message),
      objMessage: message,
    };
  }

  async storeSiweCache(
    siweMessage: {
      strMessage: string;
      objMessage: SiweMessage;
    },
    request: Request,
  ) {
    // store message in Redis
    await this.cacheManager.set(
      this.parseSiweCacheKey(
        siweMessage.objMessage.address,
        request.headers['user-agent']!,
      ),
      siweMessage.strMessage,
      { ttl: 20 }, // ttl = 20 seconds
    );
  }

  parseSiweCacheKey(
    user_wallet_address: Address,
    headers_user_agent: string,
  ): string {
    return `siweMessage[${user_wallet_address}$${headers_user_agent}]`;
  }

  parseRevokeAccessTokenKey(
    user_wallet_address: Address,
    headers_user_agent: string,
  ): string {
    return `accessToken[${user_wallet_address}$${headers_user_agent}]`;
  }

  async revokeAccessToken(user_wallet_address: Address, request: Request) {
    // validation
    if (!request.headers.authorization) {
      throw new UnauthorizedException();
    }

    // extract token
    const accessToken = request.headers.authorization.split(' ')[1];
    const jwtPayload = this.jwtService.decode<Jwt>(accessToken, {
      complete: true,
    });

    const ttl =
      (jwtPayload.payload as JwtPayload).exp! - Math.floor(Date.now() / 1000);

    // store access token in Redis
    await this.cacheManager.set(
      this.parseRevokeAccessTokenKey(
        user_wallet_address,
        request.headers['user-agent']!,
      ),
      accessToken,
      { ttl },
    );
  }

  async isTokenRevoked(
    user_wallet_address: Address,
    request: Request,
  ): Promise<boolean> {
    return (
      (await this.cacheManager.get<string>(
        this.parseRevokeAccessTokenKey(
          user_wallet_address,
          request.headers['user-agent']!,
        ),
      )) != undefined
    );
  }
}
