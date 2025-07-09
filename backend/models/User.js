const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 50],
        isAlphanumeric: true
      }
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: true // Can be null for Steam-only users
    },
    steam_id: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true,
      comment: 'Steam ID64 for GMod integration'
    },
    steam_profile: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Steam profile data from Steam API'
    },
    discord_id: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true,
      comment: 'Discord user ID for OAuth integration'
    },
    discord_profile: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Discord profile data from Discord API'
    },
    role: {
      type: DataTypes.ENUM('user', 'moderator', 'admin', 'owner'),
      allowNull: false,
      defaultValue: 'user'
    },
    permissions: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Custom permissions object'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    verification_token: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    reset_token: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    reset_token_expires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true
    },
    last_ip: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    preferences: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {
        theme: 'dark',
        notifications: true,
        email_notifications: false,
        language: 'en',
        timezone: 'UTC'
      }
    },
    avatar_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    playtime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Playtime in minutes from GMod server'
    },
    warns: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    ban_expires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    ban_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Staff notes about the user'
    }
  }, {
    tableName: 'users',
    indexes: [
      {
        unique: true,
        fields: ['username']
      },
      {
        unique: true,
        fields: ['email']
      },
      {
        unique: true,
        fields: ['steam_id']
      },
      {
        unique: true,
        fields: ['discord_id']
      },
      {
        fields: ['role']
      },
      {
        fields: ['is_active']
      },
      {
        fields: ['last_login']
      }
    ],
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 12);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password') && user.password) {
          user.password = await bcrypt.hash(user.password, 12);
        }
      }
    }
  });

  // Instance methods
  User.prototype.validatePassword = async function(password) {
    if (!this.password) return false;
    return await bcrypt.compare(password, this.password);
  };

  User.prototype.isBanned = function() {
    return this.ban_expires && new Date() < this.ban_expires;
  };

  User.prototype.hasPermission = function(permission) {
    if (this.role === 'owner') return true;
    if (this.role === 'admin' && ['user', 'moderator'].includes(permission)) return true;
    if (this.role === 'moderator' && permission === 'user') return true;
    
    // Check custom permissions
    if (this.permissions && this.permissions[permission]) {
      return this.permissions[permission];
    }
    
    return false;
  };

  User.prototype.toJSON = function() {
    const user = this.get();
    delete user.password;
    delete user.verification_token;
    delete user.reset_token;
    delete user.reset_token_expires;
    return user;
  };

  // Class methods
  User.findByLogin = async function(login) {
    return await User.findOne({
      where: {
        [sequelize.Sequelize.Op.or]: [
          { username: login },
          { email: login }
        ]
      }
    });
  };

  User.findBySteamId = async function(steamId) {
    return await User.findOne({
      where: { steam_id: steamId }
    });
  };

  User.findByDiscordId = async function(discordId) {
    return await User.findOne({
      where: { discord_id: discordId }
    });
  };

  return User;
}; 