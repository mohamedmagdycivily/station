import { Test, TestingModule } from '@nestjs/testing';
import { CronService } from './cron.service';

const createMockStore = () => ({
  bulkCreateEvents: jest.fn(),
  getStationSummary: jest.fn(),
  getUnprocessedEvents: jest.fn(),
  markEventsProcessed: jest.fn(),
  upsertStationSummaries: jest.fn(),
});

describe('CronService', () => {
  let service: CronService;
  let store: ReturnType<typeof createMockStore>;

  beforeEach(async () => {
    store = createMockStore();
    const module: TestingModule = await Test.createTestingModule({
      providers: [CronService, { provide: 'TRANSFER_STORE', useValue: store }],
    }).compile();

    service = module.get<CronService>(CronService);
  });

  it('should aggregate unprocessed events correctly per station', async () => {
    store.getUnprocessedEvents.mockResolvedValue([
      {
        event_id: 'evt-1',
        station_id: 'st-1',
        amount: 100,
        status: 'approved',
      },
      {
        event_id: 'evt-2',
        station_id: 'st-1',
        amount: 200,
        status: 'rejected',
      },
      {
        event_id: 'evt-3',
        station_id: 'st-2',
        amount: 300,
        status: 'approved',
      },
    ]);

    await service.aggregateStationSummaries();

    expect(store.upsertStationSummaries).toHaveBeenCalledWith([
      {
        station_id: 'st-1',
        all_events_count: 2,
        approved_events_count: 1,
        total_approved_amount: 100,
      },
      {
        station_id: 'st-2',
        all_events_count: 1,
        approved_events_count: 1,
        total_approved_amount: 300,
      },
    ]);
  });

  it('should mark events as processed after aggregation', async () => {
    store.getUnprocessedEvents.mockResolvedValue([
      {
        event_id: 'evt-1',
        station_id: 'st-1',
        amount: 100,
        status: 'approved',
      },
      {
        event_id: 'evt-2',
        station_id: 'st-1',
        amount: 200,
        status: 'approved',
      },
    ]);

    await service.aggregateStationSummaries();

    expect(store.markEventsProcessed).toHaveBeenCalledWith(['evt-1', 'evt-2']);
  });
});
