import { Test, TestingModule } from '@nestjs/testing';
import { TransferService } from './transfer.service';
import { CreateTransferEventsDto } from '../dtos/create-transfer-events.dto';

const createMockStore = () => ({
  bulkCreateEvents: jest.fn(),
  getStationSummary: jest.fn(),
  getUnprocessedEvents: jest.fn(),
  processAggregation: jest.fn(),
});

describe('TransferService', () => {
  let service: TransferService;
  let store: ReturnType<typeof createMockStore>;

  beforeEach(async () => {
    store = createMockStore();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransferService,
        { provide: 'TRANSFER_STORE', useValue: store },
      ],
    }).compile();

    service = module.get<TransferService>(TransferService);
  });

  const makeDto = (
    events: Array<{
      event_id: string;
      station_id: string;
      amount: number;
      status: string;
      created_at: string;
    }>,
  ): CreateTransferEventsDto => {
    const dto = new CreateTransferEventsDto();
    dto.events = events.map((e) => ({
      ...e,
    })) as any;
    return dto;
  };

  describe('ingestEvents', () => {
    it('should return correct inserted and duplicates count', async () => {
      store.bulkCreateEvents.mockResolvedValue([{}, {}]);

      const result = await service.ingestEvents(
        makeDto([
          {
            event_id: 'evt-1',
            station_id: 'st-1',
            amount: 100,
            status: 'approved',
            created_at: '2025-01-15T10:30:00.000Z',
          },
          {
            event_id: 'evt-2',
            station_id: 'st-1',
            amount: 200,
            status: 'approved',
            created_at: '2025-01-15T10:31:00.000Z',
          },
          {
            event_id: 'evt-3',
            station_id: 'st-1',
            amount: 300,
            status: 'approved',
            created_at: '2025-01-15T10:32:00.000Z',
          },
        ]),
      );

      expect(result).toEqual({ inserted: 2, duplicates: 1 });
    });

    it('should return 0 inserted when all events are duplicates', async () => {
      store.bulkCreateEvents.mockResolvedValue([]);

      const result = await service.ingestEvents(
        makeDto([
          {
            event_id: 'evt-1',
            station_id: 'st-1',
            amount: 100,
            status: 'approved',
            created_at: '2025-01-15T10:30:00.000Z',
          },
          {
            event_id: 'evt-2',
            station_id: 'st-1',
            amount: 200,
            status: 'approved',
            created_at: '2025-01-15T10:31:00.000Z',
          },
        ]),
      );

      expect(result).toEqual({ inserted: 0, duplicates: 2 });
    });

    it('should produce same results regardless of event arrival order', async () => {
      store.bulkCreateEvents.mockResolvedValue([{}, {}, {}]);

      const result = await service.ingestEvents(
        makeDto([
          {
            event_id: 'evt-3',
            station_id: 'st-1',
            amount: 300,
            status: 'approved',
            created_at: '2025-01-15T10:32:00.000Z',
          },
          {
            event_id: 'evt-1',
            station_id: 'st-1',
            amount: 100,
            status: 'approved',
            created_at: '2025-01-15T10:30:00.000Z',
          },
          {
            event_id: 'evt-2',
            station_id: 'st-1',
            amount: 200,
            status: 'approved',
            created_at: '2025-01-15T10:31:00.000Z',
          },
        ]),
      );

      expect(result).toEqual({ inserted: 3, duplicates: 0 });
      expect(store.bulkCreateEvents).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ event_id: 'evt-1' }),
          expect.objectContaining({ event_id: 'evt-2' }),
          expect.objectContaining({ event_id: 'evt-3' }),
        ]),
      );
    });

    it('should store unknown status events without counting toward approved totals', async () => {
      store.bulkCreateEvents.mockResolvedValue([{}, {}]);

      const ingestResult = await service.ingestEvents(
        makeDto([
          {
            event_id: 'evt-1',
            station_id: 'st-1',
            amount: 100,
            status: 'pending',
            created_at: '2025-01-15T10:30:00.000Z',
          },
          {
            event_id: 'evt-2',
            station_id: 'st-1',
            amount: 200,
            status: 'approved',
            created_at: '2025-01-15T10:31:00.000Z',
          },
        ]),
      );

      expect(ingestResult).toEqual({ inserted: 2, duplicates: 0 });
      expect(store.bulkCreateEvents).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ status: 'pending' }),
          expect.objectContaining({ status: 'approved' }),
        ]),
      );

      // Summary only reflects approved amounts
      store.getStationSummary.mockResolvedValue({
        station_id: 'st-1',
        total_approved_amount: '200.0000',
        all_events_count: 2,
        approved_events_count: 1,
      });

      const summary = await service.getStationSummary('st-1');
      expect(summary.total_approved_amount).toBe(200);
      expect(summary.all_events_count).toBe(2);
      expect(summary.approved_events_count).toBe(1);
    });
  });

  describe('getStationSummary', () => {
    it('should return correct summary shape for existing station', async () => {
      store.getStationSummary.mockResolvedValue({
        station_id: 'st-1',
        total_approved_amount: '1250.7500',
        all_events_count: 15,
        approved_events_count: 10,
      });

      const result = await service.getStationSummary('st-1');

      expect(result).toEqual({
        station_id: 'st-1',
        total_approved_amount: 1250.75,
        all_events_count: 15,
        approved_events_count: 10,
      });
    });

    it('should return zeroes for non-existent station', async () => {
      store.getStationSummary.mockResolvedValue(null);

      const result = await service.getStationSummary('non-existent');

      expect(result).toEqual({
        station_id: 'non-existent',
        total_approved_amount: 0,
        all_events_count: 0,
        approved_events_count: 0,
      });
    });
  });
});
