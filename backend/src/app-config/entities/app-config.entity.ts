import { ApiProperty } from '@nestjs/swagger';
import { AppConfig } from 'src/generated/prisma/client';

export class AppConfigEntity implements AppConfig {
  @ApiProperty()
  key: string;
  @ApiProperty()
  value: string;
  @ApiProperty()
  description: string;
  @ApiProperty()
  isSystem: boolean;
  @ApiProperty()
  createdAt: Date;
  @ApiProperty()
  updatedAt: Date;
}
