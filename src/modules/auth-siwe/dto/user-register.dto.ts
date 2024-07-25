import { Web3ParamsDto } from '@/common/dto/api-web3-params.dto';
import { WalletAddressField } from '@/decorators';
import { Address } from 'viem';

export class UserRegisterDto extends Web3ParamsDto {
  @WalletAddressField()
  readonly wallet_address!: Address;
}
