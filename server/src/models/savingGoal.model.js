import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const SavingGoal = sequelize.define(
  "SavingGoal",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    target_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  },
  {
    tableName: "saving_goals",
    timestamps: true,
    underscored: true,
  }
);
