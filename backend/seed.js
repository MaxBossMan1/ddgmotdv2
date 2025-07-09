const { sequelize, User, Category, Rule } = require('./models');

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Create default admin user
    const [adminUser] = await User.findOrCreate({
      where: { email: 'admin@gmod.local' },
      defaults: {
        username: 'admin',
        email: 'admin@gmod.local',
        password: 'admin123', // Will be hashed by the model
        role: 'admin',
        is_verified: true,
        is_active: true
      }
    });

    console.log('👤 Admin user created/found');

    // Create categories
    const categories = [
      {
        name: 'General',
        slug: 'general',
        description: 'DOs & DONTs',
        icon: '📋',
        color: '#3B82F6',
        order_index: 1,
        is_active: true,
        created_by: adminUser.id
      },
      {
        name: 'NLR',
        slug: 'nlr',
        description: 'Example of NLR & cooldown timers',
        icon: '⏰',
        color: '#EF4444',
        order_index: 2,
        is_active: true,
        created_by: adminUser.id
      },
      {
        name: 'Warns',
        slug: 'warns',
        description: 'Warn levels & corresponding bans',
        icon: '⚠️',
        color: '#F59E0B',
        order_index: 3,
        is_active: true,
        created_by: adminUser.id
      },
      {
        name: 'Terminology',
        slug: 'terminology',
        description: 'Common RP terms with descriptions',
        icon: '📖',
        color: '#10B981',
        order_index: 4,
        is_active: true,
        created_by: adminUser.id
      },
      {
        name: 'Illegal Activities',
        slug: 'illegal',
        description: 'You can be arrested for these actions',
        icon: '🚫',
        color: '#DC2626',
        order_index: 5,
        is_active: true,
        created_by: adminUser.id
      },
      {
        name: 'Adverts',
        slug: 'adverts',
        description: 'Adverts that are allowed & not allowed',
        icon: '📢',
        color: '#8B5CF6',
        order_index: 6,
        is_active: true,
        created_by: adminUser.id
      },
      {
        name: 'Basing',
        slug: 'basing',
        description: 'Basing rules & fail bases',
        icon: '🏠',
        color: '#06B6D4',
        order_index: 7,
        is_active: true,
        created_by: adminUser.id
      },
      {
        name: 'How to be a Good Player',
        slug: 'goodplayer',
        description: 'Follow these examples to avoid conflict',
        icon: '⭐',
        color: '#84CC16',
        order_index: 8,
        is_active: true,
        created_by: adminUser.id
      }
    ];

    const createdCategories = [];
    for (const categoryData of categories) {
      const [category] = await Category.findOrCreate({
        where: { slug: categoryData.slug },
        defaults: categoryData
      });
      createdCategories.push(category);
    }

    console.log(`📁 ${createdCategories.length} categories created/found`);

    // Create sample rules
    const rules = [
      {
        categorySlug: 'general',
        title: 'General Server Rules',
        content: `
          <h3>Basic Server Rules</h3>
          <ol>
            <li><strong>Be respectful to all players</strong> - No harassment, racism, or discrimination</li>
            <li><strong>No cheating or exploiting</strong> - This includes using external programs or game exploits</li>
            <li><strong>Follow staff instructions</strong> - Listen to moderators and admins</li>
            <li><strong>Use common sense</strong> - If something seems wrong, don't do it</li>
            <li><strong>English only in OOC chat</strong> - Keep other languages to PM or IC</li>
          </ol>
          <p><em>Breaking these rules may result in warnings, kicks, or bans.</em></p>
        `,
        is_published: true,
        is_featured: true,
        order_index: 1
      },
      {
        categorySlug: 'nlr',
        title: 'New Life Rule (NLR)',
        content: `
          <h3>New Life Rule Explained</h3>
          <p><strong>When you die, you cannot:</strong></p>
          <ul>
            <li>Return to the area where you died for <strong>3 minutes</strong></li>
            <li>Remember anything from your previous life</li>
            <li>Seek revenge on your killer</li>
            <li>Return to ongoing roleplay situations</li>
          </ul>
          <p><strong>NLR Timer:</strong> 3 minutes from death</p>
          <p><strong>NLR Zone:</strong> 200 units from death location</p>
          <div style="background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 10px 0;">
            <strong>Example:</strong> If you die during a raid, you cannot return to help defend or continue the raid until NLR expires.
          </div>
        `,
        is_published: true,
        order_index: 1
      },
      {
        categorySlug: 'warns',
        title: 'Warning System',
        content: `
          <h3>Warning Levels & Consequences</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="background: #F3F4F6;">
              <th style="padding: 10px; border: 1px solid #D1D5DB;">Warns</th>
              <th style="padding: 10px; border: 1px solid #D1D5DB;">Punishment</th>
              <th style="padding: 10px; border: 1px solid #D1D5DB;">Duration</th>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #D1D5DB;">1-2 Warns</td>
              <td style="padding: 10px; border: 1px solid #D1D5DB;">Verbal Warning</td>
              <td style="padding: 10px; border: 1px solid #D1D5DB;">-</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #D1D5DB;">3-4 Warns</td>
              <td style="padding: 10px; border: 1px solid #D1D5DB;">Temporary Ban</td>
              <td style="padding: 10px; border: 1px solid #D1D5DB;">1 Day</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #D1D5DB;">5-6 Warns</td>
              <td style="padding: 10px; border: 1px solid #D1D5DB;">Temporary Ban</td>
              <td style="padding: 10px; border: 1px solid #D1D5DB;">3 Days</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #D1D5DB;">7+ Warns</td>
              <td style="padding: 10px; border: 1px solid #D1D5DB;">Permanent Ban</td>
              <td style="padding: 10px; border: 1px solid #D1D5DB;">Permanent</td>
            </tr>
          </table>
          <p><strong>Note:</strong> Warns may be reduced over time for good behavior.</p>
        `,
        is_published: true,
        order_index: 1
      }
    ];

    const createdRules = [];
    for (const ruleData of rules) {
      const category = createdCategories.find(c => c.slug === ruleData.categorySlug);
      if (category) {
        const [rule] = await Rule.findOrCreate({
          where: { 
            title: ruleData.title,
            category_id: category.id 
          },
          defaults: {
            ...ruleData,
            category_id: category.id,
            created_by: adminUser.id,
            updated_by: adminUser.id,
            slug: ruleData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            version: 1,
            view_count: 0
          }
        });
        createdRules.push(rule);
      }
    }

    console.log(`📝 ${createdRules.length} rules created/found`);
    console.log('✅ Database seeding completed successfully!');
    console.log('\n🔐 Default admin credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   Email: admin@gmod.local');

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('🎉 Seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedDatabase; 