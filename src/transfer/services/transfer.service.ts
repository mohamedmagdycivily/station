import { Inject, Injectable } from '@nestjs/common';
import { TransferStoreInterface } from '../interfaces/transfer-store.interface';
import { CreateTransferEventsDto } from '../dtos/create-transfer-events.dto';

@Injectable()
export class TransferService {
  constructor(
    @Inject('TRANSFER_STORE')
    private readonly store: TransferStoreInterface,
  ) {}

  async ingestEvents(dto: CreateTransferEventsDto) {
    const events = dto.events.map((e) => ({
      event_id: e.event_id,
      station_id: e.station_id,
      amount: e.amount,
      status: e.status,
      created_at: new Date(e.created_at),
    }));

    const result = await this.store.bulkCreateEvents(events);
    const inserted = result.length;
    const duplicates = events.length - inserted;

    return { inserted, duplicates };
  }

  async getStationSummary(stationId: string) {
    const summary = await this.store.getStationSummary(stationId);

    if (!summary) {
      return {
        station_id: stationId,
        total_approved_amount: 0,
        events_count: 0,
      };
    }

    return {
      station_id: summary.station_id,
      total_approved_amount: Number(summary.total_approved_amount),
      events_count: summary.all_events_count,
    };
  }
}
