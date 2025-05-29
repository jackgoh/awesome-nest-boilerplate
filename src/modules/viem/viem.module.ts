import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { IsValidChainValidatorConstraint } from './decorators/validator.decorators';
import { VIEM_MODULE_OPTIONS } from './viem.constants';
import { ViemModuleAsyncOptions, ViemModuleOptions } from './viem.interface';
import { ViemService } from './viem.service';

@Global()
@Module({
  providers: [ViemService, IsValidChainValidatorConstraint],
  exports: [ViemService],
})
export class ViemModule {
  static forRoot(options: ViemModuleOptions): DynamicModule {
    const ViemOptionProvider: Provider = {
      provide: VIEM_MODULE_OPTIONS,
      useValue: options,
    };

    return {
      module: ViemModule,
      exports: [ViemService, ViemOptionProvider],
      providers: [ViemOptionProvider],
    };
  }

  static forRootAsync(options: ViemModuleAsyncOptions): DynamicModule {
    const ViemOptionAsyncProvider: Provider = {
      provide: VIEM_MODULE_OPTIONS,
      ...options,
    };

    return {
      module: ViemModule,
      imports: options.imports,
      exports: [ViemService, ViemOptionAsyncProvider],
      providers: [ViemOptionAsyncProvider],
    };
  }
}
