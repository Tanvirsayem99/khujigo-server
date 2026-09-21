import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminAuth } from '../../common/decorators/auth.decorator';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @AdminAuth()
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Dashboard counters for the admin overview' })
  get() {
    return this.analyticsService.get();
  }
}
