import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const Reminder = sequelize.define(
  "Reminder",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING(100), allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    type: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "other" }, // income | payment | loan | other
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  },
  {
    tableName: "reminders",
    timestamps: true,
    underscored: true,
  }
);
