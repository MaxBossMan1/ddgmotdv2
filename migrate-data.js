const { initializeData } = require('./lib/kv');

async function migrateData() {
  try {
    console.log('Starting data migration to Vercel KV...');
    await initializeData();
    console.log('Data migration completed successfully!');
    console.log('\nMigrated data includes:');
    console.log('- Users from users.json');
    console.log('- Categories from categories.json');
    console.log('- Rules from rules.json (if exists)');
    console.log('\nYou can now deploy to Vercel!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateData();