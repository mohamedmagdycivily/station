import { Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { QueryTypes } from 'sequelize';
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
    if (events.length === 0) return [];

    const values = events
      .map(
        (_, i) =>
          `(:event_id_${i}, :station_id_${i}, :amount_${i}, :status_${i}, :created_at_${i}, NOW())`,
      )
      .join(', ');

    const replacements: Record<string, string | number | Date> = {};
    events.forEach((e, i) => {
      replacements[`event_id_${i}`] = e.event_id;
      replacements[`station_id_${i}`] = e.station_id;
      replacements[`amount_${i}`] = e.amount;
      replacements[`status_${i}`] = e.status;
      replacements[`created_at_${i}`] = e.created_at;
    });

    const results = await this.sequelize.query(
      `INSERT INTO transfer_events (event_id, station_id, amount, status, created_at, ingested_at)
       VALUES ${values}
       ON CONFLICT (event_id) DO NOTHING
       RETURNING *`,
      { replacements, type: QueryTypes.SELECT },
    );

    return results as unknown as TransferEvent[];
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

  async processAggregation(
    summaries: StationAggregation[],
    eventIds: string[],
  ): Promise<void> {
    await this.sequelize.transaction(async (t) => {
      if (summaries.length > 0) {
        const values = summaries
          .map(
            (_, i) =>
              `(:station_id_${i}, :all_count_${i}, :approved_count_${i}, :approved_amount_${i}, NOW(), NOW())`,
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
             (station_id, all_events_count, approved_events_count, total_approved_amount, created_at, updated_at)
           VALUES ${values}
           ON CONFLICT (station_id) DO UPDATE SET
             all_events_count = station_summaries.all_events_count + EXCLUDED.all_events_count,
             approved_events_count = station_summaries.approved_events_count + EXCLUDED.approved_events_count,
             total_approved_amount = station_summaries.total_approved_amount + EXCLUDED.total_approved_amount,
             updated_at = NOW()`,
          { replacements, transaction: t },
        );
      }

      if (eventIds.length > 0) {
        await this.transferEventModel.update(
          { is_processed: true },
          { where: { event_id: eventIds }, transaction: t },
        );
      }
    });
  }
}
