const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

// Database configuration
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DB_PATH || './database.sqlite',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true,
    paranoid: true // Soft deletes
  }
});

// Import models
const User = require('./User')(sequelize, DataTypes);
const Rule = require('./Rule')(sequelize, DataTypes);
const Category = require('./Category')(sequelize, DataTypes);
const RuleVersion = require('./RuleVersion')(sequelize, DataTypes);
const UserBookmark = require('./UserBookmark')(sequelize, DataTypes);
const Analytics = require('./Analytics')(sequelize, DataTypes);
const Violation = require('./Violation')(sequelize, DataTypes);
const ServerStatus = require('./ServerStatus')(sequelize, DataTypes);
const DiscordRoleMapping = require('./DiscordRoleMapping')(sequelize, DataTypes);
// Comment and Notification models removed for now

// Define associations
User.hasMany(Rule, { foreignKey: 'created_by', as: 'createdRules' });
User.hasMany(Rule, { foreignKey: 'updated_by', as: 'updatedRules' });
User.hasMany(UserBookmark, { foreignKey: 'user_id', as: 'bookmarks' });
User.hasMany(Analytics, { foreignKey: 'user_id', as: 'analytics' });
User.hasMany(Violation, { foreignKey: 'user_id', as: 'violations' });
// Comment and Notification associations removed

Rule.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Rule.belongsTo(User, { foreignKey: 'updated_by', as: 'updater' });
Rule.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });
Rule.hasMany(RuleVersion, { foreignKey: 'rule_id', as: 'versions' });
Rule.hasMany(UserBookmark, { foreignKey: 'rule_id', as: 'bookmarks' });
Rule.hasMany(Analytics, { foreignKey: 'rule_id', as: 'analytics' });
Rule.hasMany(Violation, { foreignKey: 'rule_id', as: 'violations' });
// Comment associations removed

Category.hasMany(Rule, { foreignKey: 'category_id', as: 'rules' });
Category.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

RuleVersion.belongsTo(Rule, { foreignKey: 'rule_id', as: 'rule' });
RuleVersion.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

UserBookmark.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
UserBookmark.belongsTo(Rule, { foreignKey: 'rule_id', as: 'rule' });

Analytics.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Analytics.belongsTo(Rule, { foreignKey: 'rule_id', as: 'rule' });

Violation.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Violation.belongsTo(Rule, { foreignKey: 'rule_id', as: 'rule' });
Violation.belongsTo(User, { foreignKey: 'staff_id', as: 'staff' });

DiscordRoleMapping.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
DiscordRoleMapping.belongsTo(User, { foreignKey: 'updated_by', as: 'updater' });

// Comment and Notification associations removed

// Export models and sequelize instance
module.exports = {
  sequelize,
  User,
  Rule,
  Category,
  RuleVersion,
  UserBookmark,
  Analytics,
  Violation,
  ServerStatus,
  DiscordRoleMapping
}; 