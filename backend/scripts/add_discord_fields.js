const { sequelize } = require('../models');

async function addDiscordFields() {
  try {
    console.log('Adding Discord fields to database...');
    
    // Add discord_id column (without UNIQUE constraint)
    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN discord_id VARCHAR(20)
    `);
    
    // Add discord_profile column
    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN discord_profile JSON
    `);
    
    // Create unique index for discord_id
    await sequelize.query(`
      CREATE UNIQUE INDEX idx_users_discord_id ON users(discord_id)
    `);
    
    console.log('Discord fields added successfully!');
    
  } catch (error) {
    if (error.message.includes('duplicate column name') || 
        error.message.includes('already exists')) {
      console.log('Discord fields already exist, skipping...');
    } else {
      console.error('Error adding Discord fields:', error);
      throw error;
    }
  } finally {
    await sequelize.close();
  }
}

// Run the migration
addDiscordFields().catch(console.error); 