import { Controller, Get, Param, Query } from '@nestjs/common';
import { PassEventsService } from './pass-events.service';
import {
  PassEventEntity,
  PassEventEntityResponse,
} from './entities/pass-event.entity';
import { ApiOperation } from '@nestjs/swagger/dist/decorators/api-operation.decorator';
import { ApiOkResponse } from '@nestjs/swagger/dist/decorators/api-response.decorator';
import { FindByGsDto } from './dto/find-by-gs.dto';

@Controller('pass-events')
export class PassEventsController {
  constructor(private passEventsService: PassEventsService) {}

  @Get()
  @ApiOperation({ operationId: 'getPassEventsByGroundStationId' })
  @ApiOkResponse({ type: PassEventEntityResponse })
  async findAllByGroundStationId(@Query() query: FindByGsDto) {
    return this.passEventsService.findAllByGroundStationId({
      groundStationId: parseInt(query.groundStationId, 10),
      satelliteFilters: {
        tag: query?.tag,
        name: query?.name,
        frequencyFilters: query?.frequencyFilters,
      },
      passEventFilters: {
        minVisibleDuration: query?.minVisibleDuration,
        minVisibleElevation: query?.minVisibleElevation,
        browserLocalTzOffsetMinutes: query?.browserLocalTzOffsetMinutes,
        timingFilters: query?.timingFilters,
      },
      timeFilters: {
        beginTime: query?.beginTime,
        endTime: query?.endTime,
      },
      page: query.page ? parseInt(query.page, 10) : undefined,
    });
  }

  @Get(':id/compare')
  @ApiOperation({ operationId: 'comparePassEventsForCurrentOrbit' })
  @ApiOkResponse({ type: [PassEventEntity] })
  async comparePassEventsForCurrentOrbit(@Param('id') id: string) {
    return this.passEventsService.comparePassEventsForCurrentOrbit({
      id: parseInt(id, 10),
    });
  }

  @Get(':id')
  @ApiOperation({ operationId: 'getPassEventById' })
  @ApiOkResponse({ type: PassEventEntity })
  async findOneById(@Param('id') id: string) {
    return this.passEventsService.findOneById({
      id: parseInt(id, 10),
    });
  }
}
