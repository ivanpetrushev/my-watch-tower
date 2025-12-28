import { ApiProperty } from '@nestjs/swagger';

export class CreateGroundStationDto {
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
}
