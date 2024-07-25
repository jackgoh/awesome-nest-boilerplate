import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NetworkChainController } from './network-chain.controller';
import { NetworkChainEntity } from './network-chain.entity';
import { NetworkChainService } from './network-chain.service';

@Module({
  imports: [TypeOrmModule.forFeature([NetworkChainEntity])],
  controllers: [NetworkChainController],
  providers: [NetworkChainService],
  exports: [NetworkChainService],
})
export class NetworkChainModule {}
