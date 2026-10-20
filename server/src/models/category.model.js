import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const Category = sequelize.define(
  "Category",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(50), allowNull: false },
    icon: { type: DataTypes.STRING(30), allowNull: true },
    color: { type: DataTypes.STRING(7), allowNull: true },
    // null = categoría base del sistema; con valor = categoría personalizada del usuario
    user_id: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    tableName: "categories",
    timestamps: true,
    underscored: true,
  }
);
