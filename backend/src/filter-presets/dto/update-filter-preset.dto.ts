import { PartialType } from '@nestjs/swagger';
import { CreateFilterPresetDto } from './create-filter-preset.dto';

export class UpdateFilterPresetDto extends PartialType(CreateFilterPresetDto) {}
