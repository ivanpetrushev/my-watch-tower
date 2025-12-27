import { ApiProperty } from '@nestjs/swagger';

export class CreateFilterPresetDto {
  @ApiProperty()
  name: string;
  @ApiProperty()
  satelliteFilter: string;
  @ApiProperty()
  passEventFilter: string;
}
