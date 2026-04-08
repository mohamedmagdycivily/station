import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MainConnection } from './storage/main/main.connection';
import MainRepositories from './storage/main/main.repositories';
import { TransferEventRepository } from './storage/main/repositories';
import { TransferService } from './services/transfer.service';
import { CronService } from './services/cron.service';
import { TransferController } from './controllers/transfer.controller';
import { StationController } from './controllers/station.controller';

@Module({
  imports: [MainConnection, MainRepositories, ScheduleModule.forRoot()],
  controllers: [TransferController, StationController],
  providers: [
    {
      provide: 'TRANSFER_STORE',
      useExisting: TransferEventRepository,
    },
    TransferService,
    CronService,
  ],
})
export class TransferModule {}
