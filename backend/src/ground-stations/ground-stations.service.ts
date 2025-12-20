import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateGroundStationDto } from './dto/create-ground-station.dto';
import { UpdateGroundStationDto } from './dto/update-ground-station.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { GroundStation } from 'src/generated/prisma/client';
import { PredictorService } from 'src/predictor/predictor.service';
// import { GroundStationCreateInput } from 'src/generated/prisma/models';

@Injectable()
export class GroundStationsService {
  constructor(
    private prisma: PrismaService,
    private predictorService: PredictorService,
  ) {}

  async create(data: CreateGroundStationDto): Promise<GroundStation> {
    const createdStation = await this.prisma.groundStation.create({
      data,
    });

    await this.predictorService.addGroundStation(createdStation.id);

    return createdStation;
  }

  async findAll(): Promise<GroundStation[]> {
    return await this.prisma.groundStation.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number): Promise<GroundStation | null> {
    const item = await this.prisma.groundStation.findUnique({
      where: { id },
    });
    if (!item) {
      throw new NotFoundException('Ground station not found');
    }
    return item;
  }

  async update(
    id: number,
    data: UpdateGroundStationDto,
  ): Promise<GroundStation> {
    const item = await this.prisma.groundStation.findUnique({
      where: { id },
    });
    if (!item) {
      throw new NotFoundException('Ground station not found');
    }

    // refresh passes for this ground station
    await this.prisma.passEvent.deleteMany({
      where: { groundStationId: id },
    });

    const updatedStation = await this.prisma.groundStation.update({
      where: { id },
      data,
    });

    await this.predictorService.addGroundStation(id);

    return updatedStation;
  }

  async remove(id: number): Promise<GroundStation> {
    const item = await this.prisma.groundStation.findUnique({
      where: { id },
    });
    if (!item) {
      throw new NotFoundException('Ground station not found');
    }

    // clear passes for this ground station
    await this.prisma.passEvent.deleteMany({
      where: { groundStationId: id },
    });

    return await this.prisma.groundStation.delete({
      where: { id },
    });
  }
}
