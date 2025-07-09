const bcrypt = require('bcryptjs');
const { sequelize, User, Category, Rule } = require('../models');

// Helper function to generate slug from title
function generateSlug(title) {
  return title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');
    
    // Sync database
    await sequelize.authenticate();
    console.log('Database connection established');
    
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const [adminUser] = await User.findOrCreate({
      where: { username: 'admin' },
      defaults: {
        username: 'admin',
        password: hashedPassword,
        role: 'admin'
      }
    });
    
    console.log('Admin user created/updated');
    
    // Create categories
    const categories = [
      {
        name: 'General Rules',
        slug: 'general-rules',
        description: 'Basic server rules and guidelines for all players',
        created_by: adminUser.id
      },
      {
        name: 'NLR (New Life Rule)',
        slug: 'nlr-new-life-rule',
        description: 'Rules about what to do when you die',
        created_by: adminUser.id
      },
      {
        name: 'Warning System',
        slug: 'warning-system',
        description: 'How our warning system works',
        created_by: adminUser.id
      },
      {
        name: 'Terminology',
        slug: 'terminology',
        description: 'Common RP terms and definitions',
        created_by: adminUser.id
      },
      {
        name: 'Basing Rules',
        slug: 'basing-rules',
        description: 'Rules for building and defending bases',
        created_by: adminUser.id
      }
    ];
    
    const createdCategories = [];
    for (const categoryData of categories) {
      const [category] = await Category.findOrCreate({
        where: { name: categoryData.name },
        defaults: categoryData
      });
      createdCategories.push(category);
      console.log(`Category "${category.name}" created/updated`);
    }
    
    // Create rules for each category
    const rules = [
      {
        categoryName: 'General Rules',
        title: 'General Rules - DOs & DONTs',
        content: `
          <h2>General Rules - DOs & DONTs</h2>
          <h3>✅ DO</h3>
          <ul>
            <li><strong>DO</strong> follow your job description at all times</li>
            <li><strong>DO</strong> use common sense in all situations</li>
            <li><strong>DO</strong> respect other players and staff</li>
            <li><strong>DO</strong> report rule breakers using the proper channels</li>
            <li><strong>DO</strong> ask staff if you're unsure about something</li>
          </ul>
          <h3>❌ DO NOT</h3>
          <ul>
            <li><strong>DO NOT</strong> RDM (Random Death Match)</li>
            <li><strong>DO NOT</strong> RDA (Random Arrest)</li>
            <li><strong>DO NOT</strong> break NLR (New Life Rule)</li>
            <li><strong>DO NOT</strong> metagame or powergame</li>
            <li><strong>DO NOT</strong> mic spam or chat spam</li>
            <li><strong>DO NOT</strong> use offensive language or discrimination</li>
          </ul>
        `
      },
      {
        categoryName: 'NLR (New Life Rule)',
        title: 'NLR - New Life Rule',
        content: `
          <h2>NLR - New Life Rule</h2>
          <p>When you die, you cannot return to the area of your death for <strong>3 minutes</strong> and must forget everything from your previous life.</p>
          
          <h3>What NLR Means:</h3>
          <ul>
            <li>Cannot return to the area within 3 minutes of dying</li>
            <li>Cannot remember who killed you</li>
            <li>Cannot seek revenge for your death</li>
            <li>Cannot help in raids you were previously involved in</li>
            <li>Cannot remember information from your previous life</li>
          </ul>
          
          <h3>NLR Timer:</h3>
          <p>The NLR timer is <strong>3 minutes</strong> and starts when you respawn. You can see your NLR timer in the top-right corner of your screen.</p>
          
          <h3>NLR Zones:</h3>
          <p>NLR applies to approximately a 2-block radius around where you died. If you're unsure about the area, stay away from the general vicinity.</p>
        `
      },
      {
        categoryName: 'Warning System',
        title: 'Warning System & Punishments',
        content: `
          <h2>Warning System & Punishments</h2>
          <p>Our warning system is designed to be fair while maintaining server order.</p>
          
          <h3>Warning Levels:</h3>
          <ul>
            <li><strong>1-2 Warns:</strong> Verbal warning from staff</li>
            <li><strong>3-4 Warns:</strong> 1 day ban</li>
            <li><strong>5-6 Warns:</strong> 3 day ban</li>
            <li><strong>7+ Warns:</strong> 1 week ban or permanent ban</li>
          </ul>
          
          <h3>Important Notes:</h3>
          <ul>
            <li>Warns may result in immediate bans for serious offenses</li>
            <li>Mass RDM or other severe violations may result in permanent bans</li>
            <li>Warns expire after 30 days of good behavior</li>
            <li>Staff have discretion in punishment based on severity</li>
          </ul>
          
          <h3>Appeals:</h3>
          <p>If you believe you were wrongly punished, you can appeal on our Discord server in the #appeals channel.</p>
        `
      },
      {
        categoryName: 'Terminology',
        title: 'Common RP Terms & Definitions',
        content: `
          <h2>Common RP Terms & Definitions</h2>
          <p>Learn these terms to better understand roleplay and server rules.</p>
          
          <h3>Basic Terms:</h3>
          <ul>
            <li><strong>RDM:</strong> Random Death Match - Killing without valid RP reason</li>
            <li><strong>RDA:</strong> Random Arrest - Arresting without valid reason</li>
            <li><strong>FailRP:</strong> Not following your job's roleplay requirements</li>
            <li><strong>FearRP:</strong> Not valuing your character's life realistically</li>
            <li><strong>MetaGaming:</strong> Using out-of-character information in-character</li>
            <li><strong>PowerGaming:</strong> Forcing actions on others without giving them a chance to respond</li>
          </ul>
          
          <h3>Advanced Terms:</h3>
          <ul>
            <li><strong>NLR:</strong> New Life Rule - Cannot return to death area for 3 minutes</li>
            <li><strong>KOS:</strong> Kill On Sight - Permission to kill someone in specific areas</li>
            <li><strong>AOS:</strong> Arrest On Sight - Permission to arrest someone</li>
            <li><strong>Minge:</strong> Someone who doesn't roleplay seriously</li>
            <li><strong>LTAP:</strong> Leave To Avoid Punishment - Leaving during a staff sit</li>
          </ul>
        `
      },
      {
        categoryName: 'Basing Rules',
        title: 'Basing Rules & Guidelines',
        content: `
          <h2>Basing Rules & Guidelines</h2>
          <p>Rules for building and defending your base.</p>
          
          <h3>✅ Allowed:</h3>
          <ul>
            <li>One-way props (if you can see through them clearly)</li>
            <li>Keypad crackers must have direct access to keypads</li>
            <li>Maximum 3 fading doors per base</li>
            <li>Shooting holes must be large enough for return fire</li>
            <li>Clear path to your base entrance</li>
          </ul>
          
          <h3>❌ Not Allowed (Fail Bases):</h3>
          <ul>
            <li>Crouch/jump bases that require specific movements</li>
            <li>Maze bases that are confusing to navigate</li>
            <li>Pixel-perfect shooting angles</li>
            <li>Invisible, black, or transparent props</li>
            <li>Bases that require specific tools to enter</li>
            <li>Bases that span multiple buildings without connection</li>
          </ul>
          
          <h3>Building Guidelines:</h3>
          <ul>
            <li>Keep your base realistic and fair</li>
            <li>Ensure raiders can actually raid your base</li>
            <li>Don't block off entire areas of the map</li>
            <li>Use building signs when constructing</li>
          </ul>
        `
      }
    ];
    
    // Create rules
    for (const ruleData of rules) {
      const category = createdCategories.find(c => c.name === ruleData.categoryName);
      if (category) {
        const [rule] = await Rule.findOrCreate({
          where: { 
            category_id: category.id,
            title: ruleData.title 
          },
          defaults: {
            category_id: category.id,
            title: ruleData.title,
            slug: generateSlug(ruleData.title),
            content: ruleData.content.trim(),
            created_by: adminUser.id
          }
        });
        console.log(`Rule "${rule.title}" created/updated for category "${category.name}"`);
      }
    }
    
    console.log('Database seeding completed successfully!');
    console.log('');
    console.log('🎉 Default credentials:');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('');
    console.log('🌐 Access the application at:');
    console.log('Main page: http://localhost:3001');
    console.log('Staff panel: http://localhost:3001/staff');
    
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the seeding function
seedDatabase(); 