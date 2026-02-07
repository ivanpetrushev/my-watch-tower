import { Controller, Get, Param, Res } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { type Response } from 'express';
import { CalendarService } from './calendar.service';

@Controller('calendar')
export class CalendarController {
  constructor(private calendarService: CalendarService) {}

  // for calendar integrations - return only string
  @Get('ics/station/:stationId/preset/:presetId')
  @ApiOperation({ operationId: 'getIcsFile' })
  @ApiOkResponse({ type: String })
  @ApiNotFoundResponse()
  async getIcs(
    @Param('presetId') presetId: string,
    @Param('stationId') stationId: string,
    @Res() res: Response,
  ) {
    const icsData = await this.calendarService.generateICSFile(
      +stationId,
      +presetId,
    );
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.send(icsData);
  }

  // for downloading in browser
  @Get('ics/station/:stationId/preset/:presetId/download')
  @ApiOperation({ operationId: 'downloadIcsFile' })
  @ApiOkResponse({ type: String })
  @ApiNotFoundResponse()
  async downloadIcs(
    @Param('presetId') presetId: string,
    @Param('stationId') stationId: string,
    @Res() res: Response,
  ) {
    const icsData = await this.calendarService.generateICSFile(
      +stationId,
      +presetId,
    );

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="station-${stationId}-preset-${presetId}.ics"`,
    );
    res.send(icsData);
  }
}
