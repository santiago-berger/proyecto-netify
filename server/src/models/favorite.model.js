import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

// tabla intermedia de la relacion N:M entre User y Article
export const Favorite = sequelize.define(
  "Favorite",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  },
  {
    tableName: "favorites",
    timestamps: true,
    underscored: true,
  }
);
