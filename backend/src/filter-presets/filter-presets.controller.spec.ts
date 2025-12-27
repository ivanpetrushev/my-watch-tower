import { Test, TestingModule } from '@nestjs/testing';
import { FilterPresetsController } from './filter-presets.controller';

describe('FilterPresetsController', () => {
  let controller: FilterPresetsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilterPresetsController],
    }).compile();

    controller = module.get<FilterPresetsController>(FilterPresetsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
