import { Web3ParamsDto } from '@/common/dto/api-web3-params.dto';
import { SignatureField, WalletAddressField } from '@/decorators';
import { Address, Hex } from 'viem';
export class UserLoginDto extends Web3ParamsDto {
  @SignatureField()
  readonly signature!: Hex;

  @WalletAddressField()
  readonly wallet_address!: Address;
}
