import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

/*
  Historial de cambios en los topes de presupuesto.
  Se guarda una copia del nombre de la categoría y del período (mes/año) para que
  el registro siga siendo legible aunque después se elimine el presupuesto o la categoría.
*/
export const BudgetHistory = sequelize.define(
  "BudgetHistory",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    action: { type: DataTypes.ENUM("creado", "modificado", "eliminado"), allowNull: false },
    category_name: { type: DataTypes.STRING(50), allowNull: false },
    month: { type: DataTypes.INTEGER, allowNull: false }, // 1-12
    year: { type: DataTypes.INTEGER, allowNull: false },
    previous_limit: { type: DataTypes.DECIMAL(12, 2), allowNull: true }, // null al crear
    new_limit: { type: DataTypes.DECIMAL(12, 2), allowNull: true }, // null al eliminar
    changed_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "budget_history",
    timestamps: false, // la fecha del cambio es changed_at (se puede fijar en el seeder)
    underscored: true,
  }
);
