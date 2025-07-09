const { QueryInterface, DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Add discord_id column
      await queryInterface.addColumn('users', 'discord_id', {
        type: DataTypes.STRING(20),
        allowNull: true,
        unique: true,
        comment: 'Discord user ID for OAuth integration'
      });

      // Add discord_profile column
      await queryInterface.addColumn('users', 'discord_profile', {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Discord profile data from Discord API'
      });

      // Add index for discord_id
      await queryInterface.addIndex('users', ['discord_id'], {
        name: 'users_discord_id_index',
        unique: true
      });

      console.log('Discord fields added successfully');
    } catch (error) {
      console.error('Error adding Discord fields:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Remove index
      await queryInterface.removeIndex('users', 'users_discord_id_index');
      
      // Remove columns
      await queryInterface.removeColumn('users', 'discord_profile');
      await queryInterface.removeColumn('users', 'discord_id');

      console.log('Discord fields removed successfully');
    } catch (error) {
      console.error('Error removing Discord fields:', error);
      throw error;
    }
  }
}; 