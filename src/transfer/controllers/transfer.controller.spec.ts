import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TransferController } from './transfer.controller';
import { StationController } from './station.controller';
import { TransferService } from '../services/transfer.service';
import {
  HttpExceptionFilter,
  exceptionFactory,
} from '../../common/http.exception.filter';
import { StandardInterceptor } from '../../common/standards/standard.interceptor';

describe('Controllers', () => {
  let app: INestApplication;
  let transferService: Record<string, jest.Mock>;

  beforeAll(async () => {
    transferService = {
      ingestEvents: jest.fn(),
      getStationSummary: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransferController, StationController],
      providers: [{ provide: TransferService, useValue: transferService }],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ exceptionFactory }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new StandardInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/transfers returns 201 with inserted/duplicates', async () => {
    transferService.ingestEvents.mockResolvedValue({
      inserted: 2,
      duplicates: 1,
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/transfers')
      .send({
        events: [
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
        ],
      })
      .expect(201);

    expect(response.body.status).toBe('SUCCESS');
    expect(response.body.data).toEqual({ inserted: 2, duplicates: 1 });
  });

  it('GET /api/v1/stations/:station_id/summary returns 200 with summary', async () => {
    transferService.getStationSummary.mockResolvedValue({
      station_id: 'st-1',
      total_approved_amount: 1250.75,
      events_count: 15,
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/stations/st-1/summary')
      .expect(200);

    expect(response.body.status).toBe('SUCCESS');
    expect(response.body.data).toEqual({
      station_id: 'st-1',
      total_approved_amount: 1250.75,
      events_count: 15,
    });
  });

  it('POST /api/v1/transfers with empty events array returns 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/transfers')
      .send({ events: [] })
      .expect(400);

    expect(response.body.status).toBe('ERROR');
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors.length).toBeGreaterThan(0);
  });

  it('POST /api/v1/transfers with negative amount returns 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/transfers')
      .send({
        events: [
          {
            event_id: 'evt-1',
            station_id: 'st-1',
            amount: -10,
            status: 'approved',
            created_at: '2025-01-15T10:30:00.000Z',
          },
        ],
      })
      .expect(400);

    expect(response.body.status).toBe('ERROR');
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors.length).toBeGreaterThan(0);
  });
});
