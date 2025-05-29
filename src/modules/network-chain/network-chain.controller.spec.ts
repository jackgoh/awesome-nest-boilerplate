import { Test, TestingModule } from '@nestjs/testing';
import { NetworkChainController } from './network-chain.controller';
import { NetworkChainService } from './network-chain.service';

describe('NetworkChainController', () => {
  let controller: NetworkChainController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NetworkChainController],
      providers: [NetworkChainService],
    }).compile();

    controller = module.get<NetworkChainController>(NetworkChainController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
