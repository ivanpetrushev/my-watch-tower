import { ApiProperty } from '@nestjs/swagger';
import { FilterPreset } from 'src/generated/prisma/client';

export class FilterPresetEntity implements FilterPreset {
  @ApiProperty()
  id: number;
  @ApiProperty()
  name: string;
  @ApiProperty()
  satelliteFilter: string;
  @ApiProperty()
  passEventFilter: string;

  @ApiProperty()
  createdAt: Date;
  @ApiProperty()
  updatedAt: Date;
}
