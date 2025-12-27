import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateFilterPresetDto } from './dto/create-filter-preset.dto';
import { FilterPreset } from 'src/generated/prisma/client';
import { UpdateFilterPresetDto } from './dto/update-filter-preset.dto';

@Injectable()
export class FilterPresetsService {
  private readonly logger = new Logger(FilterPresetsService.name);
  constructor(private prisma: PrismaService) {}

  async create(data: CreateFilterPresetDto): Promise<FilterPreset> {
    const createdPreset = await this.prisma.filterPreset.create({
      data,
    });

    return createdPreset;
  }

  async findAll(): Promise<FilterPreset[]> {
    return await this.prisma.filterPreset.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number): Promise<FilterPreset | null> {
    const item = await this.prisma.filterPreset.findUnique({
      where: { id },
    });
    if (!item) {
      throw new NotFoundException('Filter preset not found');
    }
    return item;
  }

  async update(id: number, data: UpdateFilterPresetDto): Promise<FilterPreset> {
    const item = await this.prisma.filterPreset.findUnique({
      where: { id },
    });
    if (!item) {
      throw new NotFoundException('Filter preset not found');
    }

    const updatedPreset = await this.prisma.filterPreset.update({
      where: { id },
      data,
    });

    return updatedPreset;
  }

  async remove(id: number): Promise<FilterPreset> {
    const item = await this.prisma.filterPreset.findUnique({
      where: { id },
    });
    if (!item) {
      throw new NotFoundException('Filter preset not found');
    }

    return await this.prisma.filterPreset.delete({
      where: { id },
    });
  }
}
