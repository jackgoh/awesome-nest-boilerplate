import { chains } from '@/constants/chains';
import { ChainNotSupportedException } from '@/exceptions/chain-not-supported.exception';
import { Inject, Injectable } from '@nestjs/common';
import {
  ClientConfig,
  Hex,
  createPublicClient,
  createWalletClient,
  fallback,
  http,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { VIEM_MODULE_OPTIONS } from './viem.constants';
import { ViemModuleOptions } from './viem.interface';

@Injectable()
export class ViemService {
  constructor(
    @Inject(VIEM_MODULE_OPTIONS) private options: ViemModuleOptions,
  ) {}

  isValidChain(chainId: number): boolean {
    return this.options.chains.map((chain) => chain.id).includes(chainId);
  }

  private getClientConfig(chainId: number): ClientConfig {
    return {
      transport: this.options.http_transports
        ? fallback(this.options.http_transports)
        : http(undefined, { batch: true }),
      chain: chains.find((chain) => chain.id == chainId),
    };
  }

  getPublicClient(chainId: number) {
    // validate chain
    if (!this.isValidChain(chainId)) {
      // throw error
      throw new ChainNotSupportedException(chainId);
    }

    // return public client
    return createPublicClient(this.getClientConfig(chainId));
  }

  getWalletClient({
    chainId,
    privateKey,
  }: {
    chainId: number;
    privateKey: Hex;
  }) {
    // validate chain
    if (!this.isValidChain(chainId)) {
      // throw error
      throw new ChainNotSupportedException(chainId);
    }

    // return public client
    return createWalletClient({
      ...this.getClientConfig(chainId),
      account: privateKeyToAccount(privateKey),
    });
  }
}
