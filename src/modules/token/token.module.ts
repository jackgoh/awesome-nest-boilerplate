import { ApiConfigService } from '@/shared/services/api-config.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NetworkChainService } from '../network-chain/network-chain.service';
import { TokenController } from './token.controller';
import { TokenEntity } from './token.entity';
import { TokenService } from './token.service';
import { NetworkChainEntity } from '../network-chain/network-chain.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TokenEntity, NetworkChainEntity])],
  controllers: [TokenController],
  providers: [TokenService, ApiConfigService, NetworkChainService],
  exports: [TokenService],
})
export class TokenModule {}
