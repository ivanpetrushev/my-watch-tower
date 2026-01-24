import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
} from '@nestjs/common';
import { AppConfigService } from './app-config.service';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { AppConfigEntity } from './entities/app-config.entity';
import { SaveAppConfigDto } from './dto/save-app-config.dto';

@Controller('app-config')
export class AppConfigController {
  constructor(private appConfigService: AppConfigService) {}

  @Get(':key')
  @ApiOperation({ operationId: 'getAppConfigValue' })
  @ApiOkResponse({ type: AppConfigEntity })
  @ApiNotFoundResponse()
  async getConfigValue(@Param('key') key: string) {
    const configItem = await this.appConfigService.findOne(key);
    if (!configItem) {
      throw new NotFoundException('Config item not found');
    }
    return configItem;
  }

  @Patch(':key')
  @ApiOperation({ operationId: 'setAppConfigValue' })
  @ApiOkResponse({ type: AppConfigEntity })
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  async setConfigValue(
    @Param('key') key: string,
    @Body() data: SaveAppConfigDto,
  ) {
    const configItem = await this.appConfigService.findOne(key);
    if (!configItem) {
      throw new NotFoundException('Config item not found');
    }
    if (configItem.isSystem) {
      throw new BadRequestException('Cannot modify system config item');
    }
    const config = await this.appConfigService.set(key, data.value);
    return config;
  }
}
