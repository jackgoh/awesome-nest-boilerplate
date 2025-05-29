import { TokenModule } from '@/modules/token/token.module';
import { ApiConfigService } from '@/shared/services/api-config.service';
import { Module } from '@nestjs/common';
import { NetworkChainModule } from '../network-chain/network-chain.module';
import { UserModule } from '../user-v2/user.module';
import { SeederService } from './seeder.service';

@Module({
  imports: [TokenModule, NetworkChainModule, UserModule],
  providers: [SeederService, ApiConfigService],
  exports: [SeederService],
})
export class SeederModule {}
