import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TransferService } from '../services/transfer.service';

@ApiTags('Stations')
@Controller('api/v1/stations')
export class StationController {
  constructor(private readonly transferService: TransferService) {}

  @Get(':station_id/summary')
  @ApiOperation({ summary: 'Get reconciliation summary for a station' })
  @ApiResponse({ status: 200, description: 'Station summary' })
  async getStationSummary(@Param('station_id') stationId: string) {
    return this.transferService.getStationSummary(stationId);
  }
}
