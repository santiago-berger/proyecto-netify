import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const Budget = sequelize.define(
  "Budget",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    amount_limit: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    month: { type: DataTypes.INTEGER, allowNull: false }, // 1-12
    year: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    tableName: "budgets",
    timestamps: true,
    underscored: true,
  }
);
