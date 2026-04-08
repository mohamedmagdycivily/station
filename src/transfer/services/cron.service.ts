import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  TransferStoreInterface,
  StationAggregation,
} from '../interfaces/transfer-store.interface';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);
  private isRunning = false;

  constructor(
    @Inject('TRANSFER_STORE')
    private readonly store: TransferStoreInterface,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async aggregateStationSummaries() {
    if (this.isRunning) {
      this.logger.warn('Previous aggregation still running, skipping tick');
      return;
    }
    this.isRunning = true;
    try {
      this.logger.log('Starting station summaries aggregation...');

      const unprocessed = await this.store.getUnprocessedEvents();
      if (unprocessed.length === 0) {
        this.logger.log('No unprocessed events found.');
        return;
      }

      const aggregationMap = new Map<string, StationAggregation>();

      for (const event of unprocessed) {
        const existing = aggregationMap.get(event.station_id) || {
          station_id: event.station_id,
          all_events_count: 0,
          approved_events_count: 0,
          total_approved_amount: 0,
        };

        existing.all_events_count += 1;
        if (event.status === 'approved') {
          existing.approved_events_count += 1;
          existing.total_approved_amount += Number(event.amount);
        }

        aggregationMap.set(event.station_id, existing);
      }

      const summaries = Array.from(aggregationMap.values());
      const eventIds = unprocessed.map((e) => e.event_id);
      await this.store.processAggregation(summaries, eventIds);

      this.logger.log(
        `Aggregated ${unprocessed.length} events for ${summaries.length} station(s).`,
      );
    } catch (err) {
      this.logger.error(
        `Aggregation failed: ${err instanceof Error ? err.message : err}`,
      );
    } finally {
      this.isRunning = false;
    }
  }
}
