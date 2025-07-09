const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DiscordRoleMapping = sequelize.define('DiscordRoleMapping', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    role_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: 'Discord role name (case-insensitive)'
    },
    permission_level: {
      type: DataTypes.ENUM('user', 'staff', 'moderator', 'admin', 'owner'),
      allowNull: false,
      defaultValue: 'user',
      comment: 'Permission level assigned to this Discord role'
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether this is a default system mapping (cannot be deleted via UI)'
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: 'User who created this mapping'
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: 'User who last updated this mapping'
    }
  }, {
    tableName: 'discord_role_mappings',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['role_name']
      },
      {
        fields: ['permission_level']
      }
    ]
  });

  // Associations
  DiscordRoleMapping.associate = (models) => {
    DiscordRoleMapping.belongsTo(models.User, {
      as: 'creator',
      foreignKey: 'created_by'
    });
    
    DiscordRoleMapping.belongsTo(models.User, {
      as: 'updater',
      foreignKey: 'updated_by'
    });
  };

  return DiscordRoleMapping;
}; 