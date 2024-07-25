import { ModuleMetadata } from '@nestjs/common';
import { Chain, HttpTransport } from 'viem';

export interface ViemModuleOptions {
  chains: Chain[];
  http_transports?: HttpTransport[];
}

export interface ViemModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports' | 'providers'> {
  useFactory: (
    ...args: any[]
  ) => ViemModuleOptions | Promise<ViemModuleOptions>;
  inject?: any[];
}
