import { Test, TestingModule } from '@nestjs/testing';
import { ViemService } from './viem.service';

describe('ViemService', () => {
  let service: ViemService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ViemService],
    }).compile();

    service = module.get<ViemService>(ViemService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
