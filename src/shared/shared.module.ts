import { Global, Module, type Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ApiConfigService } from './services/api-config.service';
import { AwsS3Service } from './services/aws-s3.service';
import { GeneratorService } from './services/generator.service';
import { ValidatorService } from './services/validator.service';

const providers: Provider[] = [
  ApiConfigService,
  ValidatorService,
  AwsS3Service,
  GeneratorService,
];

@Global()
@Module({
  providers,
  imports: [ConfigModule],
  exports: providers,
})
export class SharedModule {}
