import { ApiProperty } from '@nestjs/swagger';

export class SaveApConfigDto {
  @ApiProperty()
  value: string;
}
