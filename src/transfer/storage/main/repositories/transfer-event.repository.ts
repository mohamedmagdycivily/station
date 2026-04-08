import { Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { TransferEvent } from '../models/transfer-event.model';
import { StationSummary } from '../models/station-summary.model';
import {
  TransferStoreInterface,
  CreateTransferEventData,
  StationAggregation,
} from '../../../interfaces/transfer-store.interface';

@Injectable()
export class TransferEventRepository extends TransferStoreInterface {
  constructor(
    @InjectModel(TransferEvent, 'main')
    private readonly transferEventModel: typeof TransferEvent,
    @InjectModel(StationSummary, 'main')
    private readonly stationSummaryModel: typeof StationSummary,
    @InjectConnection('main')
    private readonly sequelize: Sequelize,
  ) {
    super();
  }

  async bulkCreateEvents(
    events: CreateTransferEventData[],
  ): Promise<TransferEvent[]> {
    return this.transferEventModel.bulkCreate(events as any[], {
      ignoreDuplicates: true,
    });
  }

  async getStationSummary(stationId: string): Promise<StationSummary | null> {
    return this.stationSummaryModel.findOne({
      where: { station_id: stationId },
    });
  }

  async getUnprocessedEvents(): Promise<TransferEvent[]> {
    return this.transferEventModel.findAll({
      where: { is_processed: false },
    });
  }

  async markEventsProcessed(eventIds: string[]): Promise<void> {
    if (eventIds.length === 0) return;

    await this.transferEventModel.update(
      { is_processed: true },
      { where: { event_id: eventIds } },
    );
  }

  async upsertStationSummaries(summaries: StationAggregation[]): Promise<void> {
    if (summaries.length === 0) return;

    const values = summaries
      .map(
        (_, i) =>
          `(:station_id_${i}, :all_count_${i}, :approved_count_${i}, :approved_amount_${i}, NOW())`,
      )
      .join(', ');

    const replacements: Record<string, string | number> = {};
    summaries.forEach((s, i) => {
      replacements[`station_id_${i}`] = s.station_id;
      replacements[`all_count_${i}`] = s.all_events_count;
      replacements[`approved_count_${i}`] = s.approved_events_count;
      replacements[`approved_amount_${i}`] = s.total_approved_amount;
    });

    await this.sequelize.query(
      `INSERT INTO station_summaries
         (station_id, all_events_count, approved_events_count, total_approved_amount, last_aggregated_at)
       VALUES ${values}
       ON CONFLICT (station_id) DO UPDATE SET
         all_events_count = station_summaries.all_events_count + EXCLUDED.all_events_count,
         approved_events_count = station_summaries.approved_events_count + EXCLUDED.approved_events_count,
         total_approved_amount = station_summaries.total_approved_amount + EXCLUDED.total_approved_amount,
         last_aggregated_at = NOW(),
         updated_at = NOW()`,
      { replacements },
    );
  }
}
