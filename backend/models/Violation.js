module.exports = (sequelize, DataTypes) => {
  const Violation = sequelize.define('Violation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    rule_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'rules',
        key: 'id'
      }
    },
    staff_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    punishment_type: {
      type: DataTypes.ENUM('warning', 'kick', 'temporary_ban', 'permanent_ban'),
      allowNull: false
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    evidence: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Screenshots, logs, etc.'
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Duration in minutes for temporary bans'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    appeal_status: {
      type: DataTypes.ENUM('none', 'pending', 'approved', 'denied'),
      allowNull: false,
      defaultValue: 'none'
    }
  }, {
    tableName: 'violations'
  });

  return Violation;
}; 