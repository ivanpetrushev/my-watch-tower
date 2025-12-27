import { Test, TestingModule } from '@nestjs/testing';
import { FilterPresetsService } from './filter-presets.service';

describe('FilterPresetsService', () => {
  let service: FilterPresetsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FilterPresetsService],
    }).compile();

    service = module.get<FilterPresetsService>(FilterPresetsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
