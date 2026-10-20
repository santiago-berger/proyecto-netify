import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const Profile = sequelize.define(
  "Profile",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    first_name: { type: DataTypes.STRING(50), allowNull: false },
    last_name: { type: DataTypes.STRING(50), allowNull: false },
    monthly_income: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    avatar_url: { type: DataTypes.TEXT("long"), allowNull: true },
    // marca si el usuario ya vio la pantalla de bienvenida
    onboarded: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  {
    tableName: "profiles",
    timestamps: true,
    underscored: true,
  }
);
