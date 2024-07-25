import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateNetworkChainDto } from './dto/create-network-chain.dto';
import { UpdateNetworkChainDto } from './dto/update-network-chain.dto';
import { NetworkChainService } from './network-chain.service';

@Controller('network-chain')
@ApiTags('network-chain')
export class NetworkChainController {
  constructor(private readonly networkChainService: NetworkChainService) {}

  @Post()
  async create(@Body() createNetworkChainDto: CreateNetworkChainDto) {
    return await this.networkChainService.create(createNetworkChainDto);
  }

  @Get()
  async findAll() {
    return await this.networkChainService.findAll();
  }

  @Patch(':id')
  async update(
    @Param('id') id: Uuid,
    @Body() updateNetworkChainDto: UpdateNetworkChainDto,
  ) {
    return await this.networkChainService.update(id, updateNetworkChainDto);
  }

  //   @Delete(':id')
  //   remove(@Param('id') id: string) {
  //     return this.networkChainService.remove(+id);
  //   }
}
