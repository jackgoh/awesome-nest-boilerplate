import { ChainNotSupportedException } from '@/exceptions/chain-not-supported.exception';
import { DuplicateResourceCreated } from '@/exceptions/duplicate-resource-created.exception';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ViemService } from '../viem/viem.service';
import { CreateNetworkChainDto } from './dto/create-network-chain.dto';
import { UpdateNetworkChainDto } from './dto/update-network-chain.dto';
import { NetworkChainNotFoundException } from './exceptions/network-chain-not-found.exception';
import { NetworkChainEntity } from './network-chain.entity';

@Injectable()
export class NetworkChainService {
  constructor(
    @InjectRepository(NetworkChainEntity)
    private networkChainRepository: Repository<NetworkChainEntity>,
    private viemService: ViemService,
  ) {}

  async create(
    createNetworkChainDto: CreateNetworkChainDto[] | CreateNetworkChainDto,
  ) {
    // validate chain
    const chains: CreateNetworkChainDto[] = Array.isArray(createNetworkChainDto)
      ? createNetworkChainDto
      : [createNetworkChainDto];

    chains.map((chain) => {
      if (!this.viemService.isValidChain(chain.chain_id))
        throw new ChainNotSupportedException(chain.chain_id);
    });

    // check if chain already exist
    if (
      await this.networkChainRepository.findOne({
        where: {
          chain_id: In(chains.map((chain) => chain.chain_id)),
        },
      })
    ) {
      throw new DuplicateResourceCreated(
        `Chain with ids '${chains.map((chain) => chain.chain_id)}' is already existed`,
      );
    }

    // save chain into db
    const chain = this.networkChainRepository.create(chains);

    await this.networkChainRepository.save(chain);
  }

  async findAll() {
    const chains = await this.networkChainRepository.find();

    return chains;
  }

  async findOne(chain_id: number): Promise<NetworkChainEntity | null> {
    return await this.networkChainRepository.findOneBy({
      chain_id,
    });
  }

  async update(id: Uuid, updateNetworkChainDto: UpdateNetworkChainDto) {
    const chain = await this.networkChainRepository.findOne({
      where: {
        id,
      },
    });

    if (!chain) {
      throw new NetworkChainNotFoundException();
    }

    const result = await this.networkChainRepository.update(
      id,
      updateNetworkChainDto,
    );

    return result;
  }

  remove(id: number) {
    return `This action removes a #${id} networkChain`;
  }
}
