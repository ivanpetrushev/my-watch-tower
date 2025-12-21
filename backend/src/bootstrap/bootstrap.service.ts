import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AppConfigService } from 'src/app-config/app-config.service';
import { DEFAULT_TLE_SOURCES } from 'src/config/default-tle-sources';
import { PredictorService } from 'src/predictor/predictor.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { SatellitesService } from 'src/satellites/satellites.service';
import { TleUpdateService } from 'src/tle-update/tle-update.service';
import { TransmittersService } from 'src/transmitters/transmitters.service';

@Injectable()
export class BootstrapService implements OnModuleInit {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(
    private prisma: PrismaService,
    private appConfigService: AppConfigService,
    private satellitesService: SatellitesService,
    private transmittersService: TransmittersService,
    private tleUpdateService: TleUpdateService,
    private predictorService: PredictorService,
  ) {}

  async onModuleInit() {
    this.logger.log('Running bootstrap tasks...');
    await this.updateSatnogsdbSatellites();
    await this.updateSatnogsdbTransmitters();
    await this.seedTleSources();
    await this.updateTleSources();
    await this.predictorService.cleanupQueue();
    this.setupPredictorScheduler();
    this.logger.log('Bootstrap tasks completed.');
  }

  async seedTleSources() {
    const count = await this.prisma.tleSource.count();
    if (count > 0) {
      this.logger.log('TLE sources already seeded, skipping.');
      return;
    }
    await this.prisma.tleSource.createMany({
      data: DEFAULT_TLE_SOURCES,
      skipDuplicates: true,
    });
    this.logger.log(
      `Seeded ${DEFAULT_TLE_SOURCES.length} default TLE sources.`,
    );
  }

  async updateTleSources() {
    const REFETCH_INTERVAL_HOURS = 24;

    // schedule
    setInterval(
      () => {
        void this.tleUpdateService.updateStaleSources();
      },
      REFETCH_INTERVAL_HOURS * 60 * 60 * 1000,
    );

    // run immediately
    await this.tleUpdateService.updateStaleSources();
  }

  async updateSatnogsdbSatellites() {
    const SATELLITES_STALE_HOURS = 24;

    // schedule
    setInterval(
      () => {
        void this.satellitesService.updateFromSatnogsdb();
      },
      SATELLITES_STALE_HOURS * 60 * 60 * 1000,
    );

    // do we have to run immediately?
    const lastFetchTime = await this.appConfigService.get(
      'core.last_satnogsdb_satellite_update.time',
    );
    const now = new Date();
    if (lastFetchTime) {
      const lastFetchDate = new Date(lastFetchTime);
      const hoursSinceLastFetch =
        (now.getTime() - lastFetchDate.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastFetch < SATELLITES_STALE_HOURS) {
        this.logger.log(
          `SatNOGS DB satellites were updated ${hoursSinceLastFetch.toFixed(
            2,
          )} hours ago, skipping.`,
        );
        return;
      }
    }

    await this.satellitesService.updateFromSatnogsdb();
  }

  async updateSatnogsdbTransmitters() {
    const TRANSMITTERS_STALE_HOURS = 24;

    // schedule
    setInterval(
      () => {
        void this.transmittersService.updateTransmitters();
      },
      TRANSMITTERS_STALE_HOURS * 60 * 60 * 1000,
    );

    // do we have to run immediately?
    const lastFetchTime = await this.appConfigService.get(
      'core.last_satnogsdb_transmitter_update.time',
    );
    const now = new Date();
    if (lastFetchTime) {
      const lastFetchDate = new Date(lastFetchTime);
      const hoursSinceLastFetch =
        (now.getTime() - lastFetchDate.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastFetch < TRANSMITTERS_STALE_HOURS) {
        this.logger.log(
          `SatNOGS DB transmitters were updated ${hoursSinceLastFetch.toFixed(
            2,
          )} hours ago, skipping.`,
        );
        return;
      }
    }

    await this.transmittersService.updateTransmitters();
  }

  setupPredictorScheduler() {
    const PREDICT_INTERVAL_HOURS = 1;

    // schedule
    setInterval(
      () => {
        void this.predictorService.bulkPredictor();
      },
      PREDICT_INTERVAL_HOURS * 60 * 60 * 1000,
    );
    // TODO: it is annoyng to wait at the first run. Disable it at least during development?
    // this.predictorService.bulkPredictor();
    // this.predictorService.addGroundStation(2);
    // this.predictorService.debug();
  }
}
