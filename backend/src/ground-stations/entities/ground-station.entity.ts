import { ApiProperty } from '@nestjs/swagger';
import { GroundStation } from 'src/generated/prisma/client';

export class GroundStationEntity implements GroundStation {
  @ApiProperty()
  id: number;
  @ApiProperty()
  name: string;
  @ApiProperty()
  latitude: number;
  @ApiProperty()
  longitude: number;
  @ApiProperty()
  altitude: number;
  @ApiProperty()
  horizonmask: string;
  @ApiProperty()
  isDefault: boolean;
  @ApiProperty()
  createdAt: Date;
  @ApiProperty()
  updatedAt: Date;
}
