import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({
  tableName: 'transfer_events',
  timestamps: false,
  indexes: [
    {
      fields: ['station_id', 'status'],
      name: 'idx_transfer_events_station_id_status',
    },
    {
      fields: ['is_processed'],
      name: 'idx_transfer_events_is_processed',
    },
  ],
})
export class TransferEvent extends Model {
  @Column({
    type: DataType.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    unique: true,
    field: 'event_id',
  })
  event_id: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    field: 'station_id',
  })
  station_id: string;

  @Column({
    type: DataType.DECIMAL(15, 4),
    allowNull: false,
    defaultValue: 0,
  })
  amount: number;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
  })
  status: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_processed',
  })
  is_processed: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    field: 'created_at',
  })
  created_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
    field: 'ingested_at',
  })
  ingested_at: Date;
}
