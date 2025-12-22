import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { BaseSatelliteFiltersDto } from 'src/satellites/dto/get-satellites.dto';

export class BasePassEventFiltersDto {
  @ApiProperty({
    required: false,
    description: 'Minimum visible duration in seconds',
    example: '300',
  })
  minVisibleDuration?: string;

  @ApiProperty({
    required: false,
    description: 'Minimum visible elevation in degrees',
    example: '30',
  })
  minVisibleElevation?: string;

  @ApiProperty({
    required: false,
    description:
      'JSON stringified array of timing filter objects: [ {"minTime": "HH:MM", "maxTime": "HH:MM", "dows": "M, T, W, Th, F, Sa, Su"} ]',
    example:
      '[{"minTime": "06:00", "maxTime": "18:00", "dows": "M, T, W, Th, F, Sa, Su"}]',
  })
  timingFilters?: string;

  @ApiProperty({
    required: false,
    description:
      'Browser local timezone offset in minutes (e.g., -120 for UTC+2)',
    example: '-120',
  })
  browserLocalTzOffsetMinutes?: string;
}

export class TimeFiltersDto {
  @ApiProperty({
    required: false,
    description: 'Minimum time in Y-m-d HH:MM:SS format',
  })
  beginTime: string;
  @ApiProperty({
    required: false,
    description: 'Maximum time in Y-m-d HH:MM:SS format',
  })
  endTime: string;
}

export class FindByGsDto extends IntersectionType(
  BasePassEventFiltersDto,
  BaseSatelliteFiltersDto,
  TimeFiltersDto,
) {
  @ApiProperty({ description: 'Ground Station ID' })
  groundStationId: string;
  @ApiProperty({ required: false })
  page?: string;
}
