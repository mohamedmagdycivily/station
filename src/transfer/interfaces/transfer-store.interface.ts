import { TransferEvent } from '../storage/main/models/transfer-event.model';
import { StationSummary } from '../storage/main/models/station-summary.model';

export interface CreateTransferEventData {
  event_id: string;
  station_id: string;
  amount: number;
  status: string;
  created_at: Date;
}

export interface StationAggregation {
  station_id: string;
  all_events_count: number;
  approved_events_count: number;
  total_approved_amount: number;
}

export abstract class TransferStoreInterface {
  abstract bulkCreateEvents(
    events: CreateTransferEventData[],
  ): Promise<TransferEvent[]>;

  abstract getStationSummary(stationId: string): Promise<StationSummary | null>;

  abstract getUnprocessedEvents(): Promise<TransferEvent[]>;

  abstract markEventsProcessed(eventIds: string[]): Promise<void>;

  abstract upsertStationSummaries(
    summaries: StationAggregation[],
  ): Promise<void>;
}
