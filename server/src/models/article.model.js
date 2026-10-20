import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const Article = sequelize.define(
  "Article",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING(150), allowNull: false },
    summary: { type: DataTypes.STRING(300), allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    topic: { type: DataTypes.STRING(50), allowNull: false },
  },
  {
    tableName: "articles",
    timestamps: true,
    underscored: true,
  }
);
