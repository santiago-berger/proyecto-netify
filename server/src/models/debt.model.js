import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const Debt = sequelize.define(
  "Debt",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    creditor_name: { type: DataTypes.STRING(100), allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    due_date: { type: DataTypes.DATEONLY, allowNull: false },
    is_paid: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  {
    tableName: "debts",
    timestamps: true,
    underscored: true,
  }
);
