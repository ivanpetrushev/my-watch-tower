import { ApiProperty } from '@nestjs/swagger';

export class SaveAppConfigDto {
  @ApiProperty()
  value: string;
}
