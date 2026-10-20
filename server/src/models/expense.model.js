import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const Expense = sequelize.define(
  "Expense",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    description: { type: DataTypes.STRING(150), allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
  },
  {
    tableName: "expenses",
    timestamps: true,
    underscored: true,
    paranoid: true, // borrado lógico (soft delete)
  }
);
