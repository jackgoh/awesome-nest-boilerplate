import { Web3ParamsDto } from '@/common/dto/api-web3-params.dto';
import { HashFieldOptional, WalletAddressField } from '@/decorators';
import { Address, Hex } from 'viem';

export class AdminRegisterDto extends Web3ParamsDto {
  @WalletAddressField()
  readonly wallet_address!: Address;

  @HashFieldOptional()
  readonly wallet_key?: Hex;
}
