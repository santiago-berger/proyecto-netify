import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

// color elegido por un usuario para una categoría base del sistema (las base son compartidas)
export const CategoryColor = sequelize.define(
  "CategoryColor",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    color: { type: DataTypes.STRING(7), allowNull: false },
  },
  {
    tableName: "category_colors",
    timestamps: true,
    underscored: true,
    indexes: [{ unique: true, fields: ["user_id", "category_id"] }],
  }
);
