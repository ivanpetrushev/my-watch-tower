import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AppConfigService } from './app-config.service';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { AppConfigEntity } from './entities/app-config.entity';
import { SaveApConfigDto } from './dto/save-app-config.dto';

@Controller('app-config')
export class AppConfigController {
  constructor(private appConfigService: AppConfigService) {}

  @Get(':key')
  @ApiOperation({ operationId: 'getAppConfigValue' })
  @ApiOkResponse({ type: AppConfigEntity })
  async getConfigValue(@Param('key') key: string) {
    const configItem = await this.appConfigService.findOne(key);
    return configItem;
  }

  @Post(':key')
  @ApiOperation({ operationId: 'setAppConfigValue' })
  @ApiOkResponse({ type: AppConfigEntity })
  async setConfigValue(
    @Param('key') key: string,
    @Body() data: SaveApConfigDto,
  ) {
    const config = await this.appConfigService.set(key, data.value);
    return config;
  }
}
