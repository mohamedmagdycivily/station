import { DataTypes } from 'sequelize';
import type { Migration } from '../umzug';

export const up: Migration = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().createTable('transfer_events', {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    event_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    station_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(15, 4),
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    is_processed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    ingested_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // CHECK constraint: amount >= 0
  await sequelize.query(
    'ALTER TABLE transfer_events ADD CONSTRAINT chk_amount_non_negative CHECK (amount >= 0)',
  );

  // Indexes
  await sequelize
    .getQueryInterface()
    .addIndex('transfer_events', ['is_processed'], {
      name: 'idx_transfer_events_is_processed',
    });
};

export const down: Migration = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().dropTable('transfer_events');
};
