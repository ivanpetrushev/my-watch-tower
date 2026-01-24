import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AppConfigService {
  constructor(private prisma: PrismaService) {}

  async get(key: string, defaultValue: string = ''): Promise<string> {
    const setting = await this.prisma.appConfig.findUnique({ where: { key } });
    return setting ? setting.value : defaultValue;
  }

  async set(key: string, value: string, isSystem = false) {
    return this.prisma.appConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value, isSystem },
    });
  }

  async findOne(key: string) {
    return this.prisma.appConfig.findUnique({ where: { key } });
  }
}
