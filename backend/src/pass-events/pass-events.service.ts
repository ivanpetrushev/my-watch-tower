import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { SatellitesService } from 'src/satellites/satellites.service';

@Injectable()
export class PassEventsService {
  private readonly logger = new Logger(PassEventsService.name);
  constructor(
    private prisma: PrismaService,
    private satellitesService: SatellitesService,
  ) {}

  private localTimeToGmt = (
    timeStr: string,
    browserLocalTzOffsetMinutes?: string,
  ) => {
    if (browserLocalTzOffsetMinutes) {
      const [hours, minutes] = timeStr.split(':').map((v) => parseInt(v, 10));
      let date = new Date();
      date.setUTCHours(hours, minutes, 0, 0);
      date = new Date(
        date.getTime() + parseInt(browserLocalTzOffsetMinutes, 10) * 60000,
      );
      const out = date.toISOString().substring(11, 16);
      return out;
    }
    return timeStr;
  };

  public passEventFiltersToPrismaWhereInput(params: {
    minVisibleDuration?: string;
    minVisibleElevation?: string;
    timingFilters?: string;
    browserLocalTzOffsetMinutes?: string;
  }): Prisma.PassEventWhereInput {
    const {
      minVisibleDuration,
      minVisibleElevation,
      timingFilters,
      browserLocalTzOffsetMinutes,
    } = params;
    const where: Prisma.PassEventWhereInput = {};
    if (minVisibleDuration) {
      where.totalVisibleDuration = {
        gte: parseInt(minVisibleDuration, 10),
      };
    }
    if (minVisibleElevation) {
      where.maxVisibleElevation = {
        gte: parseInt(minVisibleElevation, 10),
      };
    }
    // Timing filters: ORs of JSON stringified '[{"minTime": "06:00", "maxTime": "18:00", "dows": "M, T, W, Th, F, Sa, Su"}]',
    // minTime, maxTime - are in local browser time, while aos/los are in GMT datetimes
    if (timingFilters) {
      const timingFiltersParsed = JSON.parse(timingFilters) as {
        minTime: string;
        maxTime: string;
        dows: string;
      }[];
      // there is possibility to mismatch times + offsets with day of week, skipping for simplicity

      // basic check of minTime, maxTime - use only if format is HH:MM, tolerate empty "" strings
      const orGroups = timingFiltersParsed.map((filter) => {
        let isEmptyFilter = true;
        const timeConditions: Prisma.PassEventWhereInput = {};
        const aosTimeAndGroup: any[] = [];
        if (filter.minTime && filter.minTime.trim().length > 0) {
          isEmptyFilter = false;
          aosTimeAndGroup.push({
            aosTime: {
              gte: this.localTimeToGmt(
                filter.minTime,
                browserLocalTzOffsetMinutes,
              ),
            },
          });
        }
        if (filter.maxTime && filter.maxTime.trim().length > 0) {
          isEmptyFilter = false;
          aosTimeAndGroup.push({
            aosTime: {
              lte: this.localTimeToGmt(
                filter.maxTime,
                browserLocalTzOffsetMinutes,
              ),
            },
          });
        }
        if (aosTimeAndGroup.length === 1) {
          isEmptyFilter = false;
          Object.assign(timeConditions, aosTimeAndGroup[0]);
        } else if (aosTimeAndGroup.length === 2) {
          isEmptyFilter = false;
          timeConditions.AND = aosTimeAndGroup;
        }
        if (filter.dows && filter.dows.trim().length > 0) {
          isEmptyFilter = false;
          timeConditions.aosDow = {
            in: filter.dows.split(',').map((d) => d.trim()),
          };
        }
        if (isEmptyFilter) {
          return undefined;
        }
        return timeConditions;
      });
      const actualOrGroups = orGroups.filter((group) => group !== undefined);
      if (actualOrGroups.length === 0) {
        // no valid timing filters
        return where;
      }
      where.OR = actualOrGroups;
    }
    // console.log(`Constructed pass event where: ${JSON.stringify(where)}`);
    return where;
  }

  public timeFiltersToPrismaWhereInput(params: {
    beginTime: string;
    endTime: string;
  }): Prisma.PassEventWhereInput {
    const { beginTime, endTime } = params;
    const where: Prisma.PassEventWhereInput = {};
    if (beginTime) {
      where.aos = {
        gte: new Date(beginTime),
      };
    }
    if (endTime) {
      where.los = {
        lte: new Date(endTime),
      };
    }
    return where;
  }

  async findAllByGroundStationId({
    groundStationId,
    page = 1,
    satelliteFilters,
    passEventFilters,
    timeFilters,
  }: {
    groundStationId: number;
    page?: number;
    satelliteFilters?: {
      tag?: string;
      name?: string;
      frequencyFilters?: string;
    };
    passEventFilters?: {
      minVisibleDuration?: string;
      minVisibleElevation?: string;
      browserLocalTzOffsetMinutes?: string;
      timingFilters?: string;
    };
    timeFilters: {
      beginTime: string;
      endTime: string;
    };
  }) {
    const take = 10;
    const skip = (page - 1) * take;
    // const where = { groundStationId };
    const satelliteWhere =
      this.satellitesService.satelliteFiltersToPrismaWhereInput(
        satelliteFilters || {},
      );
    const passEventWhere = this.passEventFiltersToPrismaWhereInput(
      passEventFilters || {},
    );
    const timeWhere = this.timeFiltersToPrismaWhereInput(timeFilters);
    const where = {
      groundStationId,
      ...(satelliteWhere && {
        satellite: {
          ...satelliteWhere,
        },
      }),
      ...(passEventWhere && {
        ...passEventWhere,
      }),
      ...(timeWhere && {
        ...timeWhere,
      }),
    };
    // console.log(
    //   `Final pass event query where: ${JSON.stringify(where, null, 2)}`,
    // );

    const [items, total] = await Promise.all([
      this.prisma.passEvent.findMany({
        where,
        orderBy: { aos: 'asc' },
        skip,
        take,
        omit: {
          visibleSegments: true,
        },
        include: {
          satellite: {
            include: {
              tags: true,
              transmitters: true,
            },
          },
        },
      }),
      this.prisma.passEvent.count({ where }),
    ]);
    return { items, total, page, pageCount: Math.ceil(total / take) };
  }

  async findOneById({ id }: { id: number }) {
    const item = await this.prisma.passEvent.findUnique({
      where: { id },
      include: {
        satellite: {
          include: {
            tags: true,
            transmitters: true,
          },
        },
        groundStation: true,
      },
    });
    if (!item) {
      throw new NotFoundException(`Pass event with id ${id} not found`);
    }
    return item;
  }

  async comparePassEventsForCurrentOrbit({ id }: { id: number }) {
    const basePassEvent = await this.prisma.passEvent.findUnique({
      where: { id },
      include: {
        satellite: true,
      },
    });
    if (!basePassEvent) {
      throw new NotFoundException(`Pass event with id ${id} not found`);
    }
    const comparePassEvents = await this.prisma.passEvent.findMany({
      where: {
        satelliteId: basePassEvent.satelliteId,
        orbitNumber: basePassEvent.orbitNumber,
      },
      include: {
        satellite: true,
        groundStation: true,
      },
    });

    return comparePassEvents;
  }
}
