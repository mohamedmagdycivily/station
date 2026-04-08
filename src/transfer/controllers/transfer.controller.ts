import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TransferService } from '../services/transfer.service';
import { CreateTransferEventsDto } from '../dtos/create-transfer-events.dto';

@ApiTags('Transfers')
@Controller('api/v1/transfers')
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Bulk ingest transfer events' })
  @ApiResponse({ status: 201, description: 'Events ingested successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async ingestEvents(@Body() dto: CreateTransferEventsDto) {
    return this.transferService.ingestEvents(dto);
  }
}
