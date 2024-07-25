import { DuplicateResourceCreated } from '@/exceptions/duplicate-resource-created.exception';
import { TokenService } from '@/modules/token/token.service';
import { ApiConfigService } from '@/shared/services/api-config.service';
import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ILike } from 'typeorm';
import { bscTestnet, hardhat } from 'viem/chains';
import { AdminRegisterDto } from '../auth-siwe/dto/admin-register.dto';
import { CreateNetworkChainDto } from '../network-chain/dto/create-network-chain.dto';
import { NetworkChainService } from '../network-chain/network-chain.service';
import { CreateTokenDto } from '../token/dtos/create-token.dto';
import { UserService } from '../user-v2/user.service';
import { VIEM_MODULE_OPTIONS } from '../viem/viem.constants';
import { ViemModuleOptions } from '../viem/viem.interface';

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  private logger = new Logger();

  constructor(
    private networkChainService: NetworkChainService,
    private tokenService: TokenService,
    private userService: UserService,
    private configService: ApiConfigService,
    @Inject(VIEM_MODULE_OPTIONS) private viem_options: ViemModuleOptions,
  ) {}

  /**
   * Run all seeders on application bootstrap
   */
  async onApplicationBootstrap() {
    // skip for now. remove below line to start seeding
    return;

    this.logger.verbose('Seeding test data initiated.');
    await this.seedNetworkChains();
    await this.seedTokens();
    await this.seedTokenSigners();
    this.logger.verbose('Seeding test data completed.');
  }

  private async seedTokens() {
    // seed 'usdt' token
    const testnet_usdt_contract: CreateTokenDto = {
      contract_address: '0x281164a08efe10445772B26D2154fd6F4b90Fc08',
      chain_id: bscTestnet.id,
    };

    const local_usdt_contract: CreateTokenDto = {
      contract_address: this.configService.localContract.usdt_contract,
      chain_id: hardhat.id,
    };

    try {
      await this.tokenService.create(
        this.configService.isLocalContractTest
          ? local_usdt_contract
          : testnet_usdt_contract,
      );
    } catch (error) {
      if (!(error instanceof DuplicateResourceCreated)) throw error;
    }
  }

  private async seedNetworkChains() {
    // seed all registered  chains
    const chains: CreateNetworkChainDto[] = this.viem_options.chains.map(
      (chain) => ({ chain_id: chain.id, chain_name: chain.name }),
    );

    try {
      await this.networkChainService.create(chains);
    } catch (error) {
      if (!(error instanceof DuplicateResourceCreated)) throw error;
    }
  }

  private async seedTokenSigners() {
    // seed signer user
    try {
      // prepare user creds
      const userDto = plainToInstance(AdminRegisterDto, {
        wallet_address: this.configService.testWallet.wallet_address,
        wallet_key: this.configService.testWallet.wallet_key,
        chain_id: this.viem_options.chains[0].id,
      });

      // create user
      const user = await this.userService.createAdmin({
        ...userDto,
      });

      // get tokens
      const tokens = await this.tokenService.findAll();

      await Promise.all(
        tokens.map(
          async (token) => await this.tokenService.update(token.id, { user }),
        ),
      );

      //   log decrypted private key
      const logUser = await this.userService.findOne({
        wallet_address: ILike(this.configService.testWallet.wallet_address),
      });
      this.logger.warn(
        `Decrypted private key for user ${logUser!.wallet_address}: ${logUser!.wallet_key}`,
      );
    } catch (error) {
      if (!(error instanceof DuplicateResourceCreated)) throw error;
    }
  }
}
