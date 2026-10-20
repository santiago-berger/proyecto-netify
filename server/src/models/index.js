import { sequelize } from "../config/database.js";
import { User } from "./user.model.js";
import { Profile } from "./profile.model.js";
import { Category } from "./category.model.js";
import { Expense } from "./expense.model.js";
import { Budget } from "./budget.model.js";
import { Debt } from "./debt.model.js";
import { SavingGoal } from "./savingGoal.model.js";
import { SavingContribution } from "./savingContribution.model.js";
import { Article } from "./article.model.js";
import { Favorite } from "./favorite.model.js";

/* =========================================================
   RELACIONES
   ========================================================= */

// 1:1  User - Profile
User.hasOne(Profile, { foreignKey: "user_id", as: "profile", onDelete: "CASCADE" });
Profile.belongsTo(User, { foreignKey: "user_id", as: "user" });

// 1:N  User - Category (categorías personalizadas creadas por el usuario)
User.hasMany(Category, { foreignKey: "user_id", as: "categories", onDelete: "CASCADE" });
Category.belongsTo(User, { foreignKey: "user_id", as: "owner" });

// 1:N  User - Expense
User.hasMany(Expense, { foreignKey: "user_id", as: "expenses", onDelete: "CASCADE" });
Expense.belongsTo(User, { foreignKey: "user_id", as: "user" });

// 1:N  Category - Expense
Category.hasMany(Expense, { foreignKey: "category_id", as: "expenses" });
Expense.belongsTo(Category, { foreignKey: "category_id", as: "category" });

// 1:N  User - Budget
User.hasMany(Budget, { foreignKey: "user_id", as: "budgets", onDelete: "CASCADE" });
Budget.belongsTo(User, { foreignKey: "user_id", as: "user" });

// 1:N  Category - Budget
Category.hasMany(Budget, { foreignKey: "category_id", as: "budgets" });
Budget.belongsTo(Category, { foreignKey: "category_id", as: "category" });

// 1:N  User - Debt
User.hasMany(Debt, { foreignKey: "user_id", as: "debts", onDelete: "CASCADE" });
Debt.belongsTo(User, { foreignKey: "user_id", as: "user" });

// 1:N  User - SavingGoal
User.hasMany(SavingGoal, { foreignKey: "user_id", as: "goals", onDelete: "CASCADE" });
SavingGoal.belongsTo(User, { foreignKey: "user_id", as: "user" });

// 1:N  SavingGoal - SavingContribution
SavingGoal.hasMany(SavingContribution, { foreignKey: "goal_id", as: "contributions", onDelete: "CASCADE" });
SavingContribution.belongsTo(SavingGoal, { foreignKey: "goal_id", as: "goal" });

// N:M  User - Article  (a traves de Favorite)
User.belongsToMany(Article, { through: Favorite, foreignKey: "user_id", otherKey: "article_id", as: "favoriteArticles" });
Article.belongsToMany(User, { through: Favorite, foreignKey: "article_id", otherKey: "user_id", as: "usersWhoFaved" });

export {
  sequelize,
  User,
  Profile,
  Category,
  Expense,
  Budget,
  Debt,
  SavingGoal,
  SavingContribution,
  Article,
  Favorite,
};
