const { kv } = require('@vercel/kv');

// Data keys
const KEYS = {
  USERS: 'users',
  CATEGORIES: 'categories',
  RULES: 'rules'
};

// Users operations
async function getUsers() {
  try {
    const users = await kv.get(KEYS.USERS);
    return users || [];
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
  }
}

async function setUsers(users) {
  try {
    await kv.set(KEYS.USERS, users);
    return true;
  } catch (error) {
    console.error('Error setting users:', error);
    return false;
  }
}

// Categories operations
async function getCategories() {
  try {
    const categories = await kv.get(KEYS.CATEGORIES);
    return categories || [];
  } catch (error) {
    console.error('Error getting categories:', error);
    return [];
  }
}

async function setCategories(categories) {
  try {
    await kv.set(KEYS.CATEGORIES, categories);
    return true;
  } catch (error) {
    console.error('Error setting categories:', error);
    return false;
  }
}

// Rules operations
async function getRules() {
  try {
    const rules = await kv.get(KEYS.RULES);
    return rules || '';
  } catch (error) {
    console.error('Error getting rules:', error);
    return '';
  }
}

async function setRules(rules) {
  try {
    await kv.set(KEYS.RULES, rules);
    return true;
  } catch (error) {
    console.error('Error setting rules:', error);
    return false;
  }
}

// Initialize data from existing files (migration helper)
async function initializeFromFiles() {
  const fs = require('fs');
  const path = require('path');
  
  try {
    // Migrate users
    const usersPath = path.join(process.cwd(), 'data', 'users.json');
    if (fs.existsSync(usersPath)) {
      const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
      await setUsers(users);
      console.log('Users migrated to KV');
    }
    
    // Migrate categories
    const categoriesPath = path.join(process.cwd(), 'data', 'categories.json');
    if (fs.existsSync(categoriesPath)) {
      const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
      await setCategories(categories);
      console.log('Categories migrated to KV');
    }
    
    // Migrate rules
    const rulesPath = path.join(process.cwd(), 'data', 'rules.txt');
    if (fs.existsSync(rulesPath)) {
      const rules = fs.readFileSync(rulesPath, 'utf8');
      await setRules(rules);
      console.log('Rules migrated to KV');
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing from files:', error);
    return false;
  }
}

module.exports = {
  getUsers,
  setUsers,
  getCategories,
  setCategories,
  getRules,
  setRules,
  initializeFromFiles
};