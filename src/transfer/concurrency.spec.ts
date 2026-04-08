import { Sequelize } from 'sequelize-typescript';
import { TransferEvent } from './storage/main/models/transfer-event.model';
import { StationSummary } from './storage/main/models/station-summary.model';
import { TransferEventRepository } from './storage/main/repositories/transfer-event.repository';

jest.setTimeout(30000);

describe('Concurrency Integration', () => {
  let sequelize: Sequelize;
  let repository: TransferEventRepository;

  beforeAll(async () => {
    const host =
      process.env.MAIN_DB_HOST === 'database'
        ? 'localhost'
        : process.env.MAIN_DB_HOST || 'localhost';
    const port = Number(process.env.MAIN_DB_PORT) || 5432;
    const username = process.env.MAIN_DB_USERNAME || 'postgres';
    const password = process.env.MAIN_DB_PASSWORD || 'postgres';

    // Create test database if it does not exist
    const adminSeq = new Sequelize({
      dialect: 'postgres',
      host,
      port,
      username,
      password,
      database: 'postgres',
      logging: false,
    });

    try {
      await adminSeq.query('CREATE DATABASE "station_test"');
    } catch {
      // database already exists
    }
    await adminSeq.close();

    // Connect to test database
    sequelize = new Sequelize({
      dialect: 'postgres',
      host,
      port,
      username,
      password,
      database: 'station_test',
      models: [TransferEvent, StationSummary],
      logging: false,
    });

    await sequelize.sync({ force: true });

    repository = new TransferEventRepository(
      TransferEvent,
      StationSummary,
      sequelize,
    );
  });

  afterAll(async () => {
    if (sequelize) await sequelize.close();
  });

  it('parallel requests with overlapping event_ids produce no duplicate rows', async () => {
    const events = Array.from({ length: 10 }, (_, i) => ({
      event_id: `evt-concurrent-${i}`,
      station_id: 'station-concurrent',
      amount: 100,
      status: 'approved',
      created_at: new Date(),
    }));

    // Fire 5 parallel bulk inserts with identical events
    await Promise.all([
      repository.bulkCreateEvents(events),
      repository.bulkCreateEvents(events),
      repository.bulkCreateEvents(events),
      repository.bulkCreateEvents(events),
      repository.bulkCreateEvents(events),
    ]);

    // Verify no duplicates exist
    const allEvents = await TransferEvent.findAll({
      where: { station_id: 'station-concurrent' },
    });

    const eventIds = allEvents.map((e) => e.event_id);
    const uniqueIds = new Set(eventIds);

    expect(eventIds.length).toBe(uniqueIds.size);
    expect(eventIds.length).toBe(10);
  });
});
