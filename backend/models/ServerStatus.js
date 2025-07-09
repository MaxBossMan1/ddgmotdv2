module.exports = (sequelize, DataTypes) => {
  const ServerStatus = sequelize.define('ServerStatus', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    server_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    server_ip: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
    server_port: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    is_online: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    player_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    max_players: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    map_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    gamemode: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    last_updated: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'server_status'
  });

  return ServerStatus;
}; 