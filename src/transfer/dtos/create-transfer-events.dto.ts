import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsNumber,
  Min,
  IsISO8601,
  ValidateNested,
  ArrayMinSize,
  IsArray,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferEventDto {
  @ApiProperty({ example: 'evt-abc-123' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  event_id: string;

  @ApiProperty({ example: 'station-001' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  station_id: string;

  @ApiProperty({ example: 150.5 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 'approved' })
  @IsNotEmpty()
  @IsString()
  status: string;

  @ApiProperty({ example: '2025-01-15T10:30:00.000Z' })
  @IsNotEmpty()
  @IsISO8601()
  created_at: string;
}

export class CreateTransferEventsDto {
  @ApiProperty({ type: [TransferEventDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TransferEventDto)
  events: TransferEventDto[];
}
