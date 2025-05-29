import { PartialType } from '@nestjs/swagger';
import { CreateNetworkChainDto } from './create-network-chain.dto';

export class UpdateNetworkChainDto extends PartialType(CreateNetworkChainDto) {}
