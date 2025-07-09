module.exports = (sequelize, DataTypes) => {
  const UserBookmark = sequelize.define('UserBookmark', {
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
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'user_bookmarks',
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'rule_id']
      }
    ]
  });

  return UserBookmark;
}; 