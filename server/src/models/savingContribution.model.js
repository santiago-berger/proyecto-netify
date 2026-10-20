import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const SavingContribution = sequelize.define(
  "SavingContribution",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
  },
  {
    tableName: "saving_contributions",
    timestamps: true,
    underscored: true,
  }
);
