import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { BootstrapService } from './bootstrap/bootstrap.service';
import { ConfigModule } from '@nestjs/config';
import { TleUpdateService } from './tle-update/tle-update.service';
import { TransmittersService } from './transmitters/transmitters.service';
import { SatellitesController } from './satellites/satellites.controller';
import { SatellitesService } from './satellites/satellites.service';
import { AppConfigService } from './app-config/app-config.service';
import { PredictorService } from './predictor/predictor.service';
import { TagsService } from './tags/tags.service';
import { TagsController } from './tags/tags.controller';
import { PassEventsService } from './pass-events/pass-events.service';
import { PassEventsController } from './pass-events/pass-events.controller';
import { BullModule } from '@nestjs/bullmq';
import { PredictorConsumer } from './predictor/predictor.processor';
import { ScheduleModule } from '@nestjs/schedule';
import { GroundStationsController } from './ground-stations/ground-stations.controller';
import { GroundStationsService } from './ground-stations/ground-stations.service';
import { FilterPresetsController } from './filter-presets/filter-presets.controller';
import { FilterPresetsService } from './filter-presets/filter-presets.service';
import { AppConfigController } from './app-config/app-config.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
    }),
    BullModule.registerQueue({
      name: 'predictor',
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [
    AppController,
    SatellitesController,
    TagsController,
    PassEventsController,
    GroundStationsController,
    FilterPresetsController,
    AppConfigController,
  ],
  providers: [
    AppService,
    PrismaService,
    BootstrapService,
    TleUpdateService,
    TransmittersService,
    SatellitesService,
    AppConfigService,
    PredictorService,
    TagsService,
    PassEventsService,
    PredictorConsumer,
    GroundStationsService,
    FilterPresetsService,
  ],
})
export class AppModule {}
