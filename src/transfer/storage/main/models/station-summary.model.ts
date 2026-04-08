import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';

@Table({
  tableName: 'station_summaries',
  timestamps: true,
  underscored: true,
})
export class StationSummary extends Model {
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
    field: 'station_id',
  })
  station_id: string;

  @Column({
    type: DataType.DECIMAL(15, 4),
    allowNull: false,
    defaultValue: 0,
    field: 'total_approved_amount',
  })
  total_approved_amount: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'approved_events_count',
  })
  approved_events_count: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'all_events_count',
  })
  all_events_count: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: 'last_aggregated_at',
  })
  last_aggregated_at: Date;

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;
}
