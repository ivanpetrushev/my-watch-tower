import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FilterPresetsService } from 'src/filter-presets/filter-presets.service';
import { GroundStationsService } from 'src/ground-stations/ground-stations.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { PassEventsService } from 'src/pass-events/pass-events.service';
import { BasePassEventFiltersDto } from 'src/pass-events/dto/find-by-gs.dto';
import { BaseSatelliteFiltersDto } from 'src/satellites/dto/get-satellites.dto';
import { PassEvent, Satellite } from 'src/generated/prisma/client';
import { createEvents } from 'ics';
import { v5 as uuidv5 } from 'uuid';

type PassEventWithSatellite = Omit<PassEvent, 'visibleSegments'> & {
  satellite: Satellite;
};

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);
  constructor(
    private prisma: PrismaService,
    private filterPresetsService: FilterPresetsService,
    private groundStationService: GroundStationsService,
    private passEventsService: PassEventsService,
  ) {}

  async generateICSFile(stationId: number, presetId: number): Promise<string> {
    const preset = await this.filterPresetsService.findOne(presetId);
    if (!preset) {
      throw new NotFoundException('Filter preset not found');
    }
    const station = await this.groundStationService.findOne(stationId);
    if (!station) {
      throw new NotFoundException('Ground station not found');
    }
    const satelliteFilters = JSON.parse(
      preset.satelliteFilter,
    ) as BaseSatelliteFiltersDto;
    // be careful with frequencyFilters being an array
    if (
      satelliteFilters.frequencyFilters &&
      Array.isArray(satelliteFilters.frequencyFilters)
    ) {
      satelliteFilters.frequencyFilters = JSON.stringify(
        satelliteFilters.frequencyFilters,
      );
    }
    delete satelliteFilters.tracked; // TODO: remove tracked property at all - no meaning in it, as only tracked sats PassEvents are concerned

    const passEventFilters = JSON.parse(
      preset.passEventFilter,
    ) as BasePassEventFiltersDto;
    // be careful with timingFilters being an array
    if (
      passEventFilters.timingFilters &&
      Array.isArray(passEventFilters.timingFilters)
    ) {
      passEventFilters.timingFilters = JSON.stringify(
        passEventFilters.timingFilters,
      );
    }

    // page through all pass events matching the preset and station
    let allEvents: PassEventWithSatellite[] = [];
    let page = 1;
    while (true) {
      const {
        items,
        page: currentPage,
        pageCount,
      } = await this.passEventsService.findAllByGroundStationId({
        groundStationId: stationId,
        page,
        satelliteFilters,
        passEventFilters,
        timeFilters: {
          // dont want any constraint here
          beginTime: '',
          endTime: '',
        },
      });
      allEvents = allEvents.concat(items);
      if (currentPage >= pageCount) {
        break;
      }
      page += 1;
    }

    // generate ics data
    const icsData = createEvents(
      allEvents.map((pe) => {
        const startDate = new Date(pe.aos);
        const endDate = new Date(pe.los);
        let description = `A pass of satellite ${pe.satellite.name} over ground station ${station.name}.`;
        description += ` Max elevation: ${Math.round(pe.maxElevation)}°.`;
        description += ` Total visible duration: ${pe.totalVisibleDuration} seconds.`;
        // TODO: obtain visibleSegments and include as bullets in description
        return {
          start: [
            startDate.getUTCFullYear(),
            startDate.getUTCMonth() + 1,
            startDate.getUTCDate(),
            startDate.getUTCHours(),
            startDate.getUTCMinutes(),
          ],
          startInputType: 'utc',
          end: [
            endDate.getUTCFullYear(),
            endDate.getUTCMonth() + 1,
            endDate.getUTCDate(),
            endDate.getUTCHours(),
            endDate.getUTCMinutes(),
          ],
          endInputType: 'utc',
          title: pe.satellite.name,
          description,
          location: station.name,
          geo: {
            lat: station.latitude,
            lon: station.longitude,
          },
          status: 'CONFIRMED',
          uid: uuidv5(`pass-${pe.id}-gs-${station.id}`, uuidv5.DNS),
        };
      }),
      {
        calName: `${station.name} / ${preset.name}`,
      },
    );
    return icsData?.value || '';
  }
}
