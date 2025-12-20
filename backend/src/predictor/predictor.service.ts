import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';

import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';

@Injectable()
export class PredictorService implements OnModuleInit {
  private readonly logger = new Logger(PredictorService.name);
  constructor(
    private prisma: PrismaService,
    @InjectQueue('predictor') private predictorQueue: Queue,
  ) {}

  onModuleInit() {
    // const dateStart = new Date();
    // const dateEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    // await this.predictorQueue.add('processSatelliteOverGroundStation', {
    //   satelliteId: 29249, // MEO satelite
    //   groundStationId: 6,
    //   dateStart,
    //   dateEnd,
    // });
    //
    // await this.predictorQueue.add('processSatelliteOverGroundStation', {
    //   satelliteId: 25544, // ISS
    //   groundStationId: 2, // Plovdiv
    //   dateStart,
    //   dateEnd,
    // });
  }

  async cleanupQueue() {
    this.logger.log('Cleaning up predictor queue...');
    await this.predictorQueue.drain();
    const jobs = await this.predictorQueue.getJobs([
      'waiting',
      'active',
      'delayed',
    ]);
    this.logger.log(`Removing ${jobs.length} jobs from the queue...`);
    await Promise.all(jobs.map((job) => job.remove()));
    this.logger.log('Predictor queue cleaned up.');
  }

  async bulkPredictor() {
    // get all tracked satellites and all ground stations
    // for each satellite and ground station pair, calculate passes for the next 7 days
    this.logger.log('Starting bulk prediction of satellite passes...');
    const satelliteIds = await this.prisma.satellite.findMany({
      where: { isTracked: true },
      select: { id: true },
    });
    const groundStationIds = await this.prisma.groundStation.findMany({
      select: { id: true },
    });
    const dateStart = new Date();
    const dateEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days ahead

    const promises: Promise<Job>[] = [];
    for (const sat of satelliteIds) {
      for (const gs of groundStationIds) {
        // run in background Queue
        promises.push(
          this.predictorQueue.add('processSatelliteOverGroundStation', {
            satelliteId: sat.id,
            groundStationId: gs.id,
            dateStart,
            dateEnd,
          }),
        );
      }
    }
    const startTime = Date.now();
    await Promise.all(promises);
    this.logger.log(
      `Bulk prediction ${satelliteIds.length} sats x ${groundStationIds.length} station enqueued in ${Date.now() - startTime} ms`,
    );
  }

  async addSatellite(satelliteId: number) {
    // get all ground stations
    // for each ground station, calculate passes for the next 7 days
    this.logger.log(
      `Adding satellite ${satelliteId} to predictor queue for all ground stations...`,
    );
    const groundStationIds = await this.prisma.groundStation.findMany({
      select: { id: true },
    });
    const dateStart = new Date();
    const dateEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days ahead

    const promises: Promise<Job>[] = [];
    for (const gs of groundStationIds) {
      // run in background Queue
      promises.push(
        this.predictorQueue.add('processSatelliteOverGroundStation', {
          satelliteId,
          groundStationId: gs.id,
          dateStart,
          dateEnd,
        }),
      );
    }
    const startTime = Date.now();
    await Promise.all(promises);
    this.logger.log(
      `Satellite ${satelliteId} added to predictor queue for ${groundStationIds.length} ground stations in ${Date.now() - startTime} ms`,
    );
  }

  async addGroundStation(groundStationId: number) {
    // get all tracked satellites
    // for each satellite, calculate passes for the next 7 days
    this.logger.log(
      `Adding ground station ${groundStationId} to predictor queue for all tracked satellites...`,
    );
    const satelliteIds = await this.prisma.satellite.findMany({
      where: { isTracked: true },
      select: { id: true },
    });
    const dateStart = new Date();
    const dateEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days ahead

    const promises: Promise<Job>[] = [];
    for (const sat of satelliteIds) {
      // run in background Queue
      promises.push(
        this.predictorQueue.add('processSatelliteOverGroundStation', {
          satelliteId: sat.id,
          groundStationId,
          dateStart,
          dateEnd,
        }),
      );
    }
    const startTime = Date.now();
    await Promise.all(promises);
    this.logger.log(
      `Ground station ${groundStationId} added to predictor queue for ${satelliteIds.length} satellites in ${Date.now() - startTime} ms`,
    );
  }

  @Cron('*/1 * * * *') // every minute
  async clearOldPassEvents() {
    // delete pass events where los is older than now
    const now = new Date();
    const result = await this.prisma.passEvent.deleteMany({
      where: {
        los: {
          lt: now,
        },
      },
    });
    if (result.count > 0) {
      this.logger.log(`Deleted ${result.count} old pass events.`);
    }
  }
}
