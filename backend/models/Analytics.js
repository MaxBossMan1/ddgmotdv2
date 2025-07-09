module.exports = (sequelize, DataTypes) => {
  const Analytics = sequelize.define('Analytics', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    rule_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'rules',
        key: 'id'
      }
    },
    action: {
      type: DataTypes.ENUM('view', 'search', 'bookmark', 'share', 'download', 'comment'),
      allowNull: false
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    referrer: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    session_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional data like search query, time spent, etc.'
    }
  }, {
    tableName: 'analytics',
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['rule_id']
      },
      {
        fields: ['action']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['session_id']
      }
    ]
  });

  return Analytics;
}; 