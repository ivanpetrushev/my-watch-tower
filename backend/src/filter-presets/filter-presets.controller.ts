import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { FilterPresetsService } from './filter-presets.service';
import { ApiOperation } from '@nestjs/swagger/dist/decorators/api-operation.decorator';
import { ApiNotFoundResponse, ApiOkResponse } from '@nestjs/swagger';
import { FilterPresetEntity } from './entities/filter-preset.entity';
import { CreateFilterPresetDto } from './dto/create-filter-preset.dto';
import { UpdateFilterPresetDto } from './dto/update-filter-preset.dto';

@Controller('filter-presets')
export class FilterPresetsController {
  constructor(private filterPresetsService: FilterPresetsService) {}

  @Post()
  @ApiOperation({ operationId: 'createFilterPreset' })
  @ApiOkResponse({ type: FilterPresetEntity })
  create(@Body() createFilterPresetDto: CreateFilterPresetDto) {
    return this.filterPresetsService.create(createFilterPresetDto);
  }

  @Get()
  @ApiOperation({ operationId: 'listAllFilterPresets' })
  @ApiOkResponse({ type: [FilterPresetEntity] })
  findAll() {
    return this.filterPresetsService.findAll();
  }

  @Patch(':id')
  @ApiOperation({ operationId: 'updateFilterPreset' })
  @ApiOkResponse({ type: FilterPresetEntity })
  @ApiNotFoundResponse()
  update(
    @Param('id') id: string,
    @Body() updateFilterPresetDto: UpdateFilterPresetDto,
  ) {
    return this.filterPresetsService.update(+id, updateFilterPresetDto);
  }

  @Delete(':id')
  @ApiOperation({ operationId: 'removeFilterPreset' })
  @ApiOkResponse({ type: FilterPresetEntity })
  @ApiNotFoundResponse()
  remove(@Param('id') id: string) {
    return this.filterPresetsService.remove(+id);
  }
}
