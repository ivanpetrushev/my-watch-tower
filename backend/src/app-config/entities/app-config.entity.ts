import { ApiProperty } from '@nestjs/swagger';

export class AppConfigEntity {
  @ApiProperty()
  key: string;
  @ApiProperty()
  value: string;
  @ApiProperty()
  description?: string;
  @ApiProperty()
  isSystem: boolean;
}
