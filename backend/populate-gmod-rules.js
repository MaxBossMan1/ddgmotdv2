const { sequelize, User, Category, Rule } = require('./models');

async function populateGmodRules() {
  try {
    console.log('🎮 Populating GMod rules database...');

    // Ensure database is synced
    await sequelize.sync();

    // Create/get admin user
    const [adminUser] = await User.findOrCreate({
      where: { email: 'admin@ddgmotd.com' },
      defaults: {
        username: 'admin',
        email: 'admin@ddgmotd.com',
        password: 'admin123',
        role: 'admin',
        is_verified: true,
        is_active: true
      }
    });

    console.log('👤 Admin user ready');

    // Categories with exact names from GMod addon
    const categories = [
      {
        name: 'General',
        slug: 'general',
        description: 'DOs & DONTs',
        icon: '📋',
        color: '#3498db',
        order_index: 1,
        is_active: true,
        created_by: adminUser.id
      },
      {
        name: 'NLR',
        slug: 'nlr',
        description: 'Example of NLR & cooldown timers',
        icon: '⏰',
        color: '#e74c3c',
        order_index: 2,
        is_active: true,
        created_by: adminUser.id
      },
      {
        name: 'Warns',
        slug: 'warns',
        description: 'Warn levels & corresponding bans',
        icon: '⚠️',
        color: '#f39c12',
        order_index: 3,
        is_active: true,
        created_by: adminUser.id
      },
      {
        name: 'Terminology',
        slug: 'terminology',
        description: 'Common RP terms with descriptions',
        icon: '📖',
        color: '#2ecc71',
        order_index: 4,
        is_active: true,
        created_by: adminUser.id
      },
      {
        name: 'Illegal Activities',
        slug: 'illegal',
        description: 'You can be arrested for these actions',
        icon: '🚫',
        color: '#e74c3c',
        order_index: 5,
        is_active: true,
        created_by: adminUser.id
      },
      {
        name: 'Adverts',
        slug: 'adverts',
        description: 'Adverts that are allowed & not allowed',
        icon: '📢',
        color: '#9b59b6',
        order_index: 6,
        is_active: true,
        created_by: adminUser.id
      },
      {
        name: 'Basing Rules',
        slug: 'basing',
        description: 'Rules for building and defending bases',
        icon: '🏠',
        color: '#3498db',
        order_index: 7,
        is_active: true,
        created_by: adminUser.id
      },
      {
        name: 'How to be a Good Player',
        slug: 'goodplayer',
        description: 'Follow these examples to avoid conflict',
        icon: '⭐',
        color: '#f1c40f',
        order_index: 8,
        is_active: true,
        created_by: adminUser.id
      }
    ];

    // Create categories
    const createdCategories = [];
    for (const categoryData of categories) {
      const [category] = await Category.findOrCreate({
        where: { slug: categoryData.slug },
        defaults: categoryData
      });
      createdCategories.push(category);
    }

    console.log(`📁 ${createdCategories.length} categories created/found`);

    // Rules data matching the GMod addon's default content
    const rulesData = [
      {
        categorySlug: 'general',
        title: 'General Rules - DOs & DONTs',
        content: `1. Use common sense.

2. If you find yourself using a "loophole" in the rules to your advantage, it is likely you are breaking at least one other rule.

3. No politics, harassment, sexism, racism, discrimination, bigotry, porn, NSFW content, malicious behavior, etc.

4. Crossfire is counted as RDM.

5. Running into spawn to avoid any roleplay situation is considered FailRP.

6. No class can /advert murder or /advert counter.

7. No propspam, propminges, propsurf, propclimb, propblock, bodyblock etc.

8. Do not FailRP and/or FearRP.

9. "FearRP is doing something roleplay wise out of fear (e.g. someone is pointing a gun at you, you are not allowed to take out a weapon or run away). "FailRP is doing something against the rules or your job rules/description.

10. Voice-changers aren't allowed.

11. No mass RPbinds, all binds must specify one action, you cannot bind text too.

12. Self supplying weapons by spawning as a job with a desired weapon and dropping it is considered FailRP.

13. Do not bait and or scam players. (In-game, Donation wise)`,
        is_published: true,
        is_featured: true,
        order_index: 1
      },
      {
        categorySlug: 'nlr',
        title: 'NLR (New Life Rule)',
        content: `NLR Timer: 3 Minutes - You cannot return to the area where you died for 3 minutes.

Forget Previous Life - You must forget everything from your previous life including who killed you and why.

No Revenge Killing - You cannot kill someone who killed you in your previous life.

NLR Area - The NLR area extends in a reasonable radius around where you died.

Breaking NLR - Returning to your death location or acting on previous life information is against the rules.`,
        is_published: true,
        order_index: 1
      },
      {
        categorySlug: 'warns',
        title: 'Warning System',
        content: `1-2 Warnings: Verbal warning from staff member

3-4 Warnings: 1 day ban from the server

5-6 Warnings: 3 day ban from the server

7+ Warnings: 1 week ban or permanent ban depending on severity

Warning Appeals: Contact staff on Discord to appeal warnings`,
        is_published: true,
        order_index: 1
      },
      {
        categorySlug: 'terminology',
        title: 'Common RP Terminology',
        content: `RDM - Random Death Match: Killing someone without a valid roleplay reason

RDA - Random Arrest: Arresting someone without a valid reason

FailRP - Fail Roleplay: Acting in a way that breaks roleplay or doesn't make sense

FearRP - Fear Roleplay: Acting appropriately when your character should be afraid

NLR - New Life Rule: Forgetting your previous life after dying

Metagaming: Using information your character wouldn't know in roleplay`,
        is_published: true,
        order_index: 1
      },
      {
        categorySlug: 'illegal',
        title: 'Illegal Activities',
        content: `Possession of illegal weapons without proper licenses

Drug manufacturing and distribution

Theft and robbery of other players

Assault and battery on other citizens

Trespassing on private property

Resisting arrest or evading police`,
        is_published: true,
        order_index: 1
      },
      {
        categorySlug: 'adverts',
        title: 'Advert Rules',
        content: `ALLOWED: /advert raid, /advert mug, /advert kidnap, /advert carjack

NOT ALLOWED: /advert murder, /advert counter, /advert assist

Advert Cooldown: 5 minutes between similar adverts

Raid Timer: 20 minutes cooldown between raids on the same base

Mug Limit: Maximum $5000 per mug`,
        is_published: true,
        order_index: 1
      },
      {
        categorySlug: 'basing',
        title: 'Basing Rules',
        content: `No Crouch/Jump Bases: Bases that require crouching or jumping to navigate are not allowed

No Maze Bases: Bases cannot be designed as confusing mazes

Maximum 3 Fading Doors: You can have a maximum of 3 fading doors in your base

No Pixel Gaps: Don't create tiny gaps that are hard to see but allow shooting

No Sky Bases: Bases must be built on solid ground, not floating in the air`,
        is_published: true,
        order_index: 1
      },
      {
        categorySlug: 'goodplayer',
        title: 'How to be a Good Player',
        content: `Always roleplay realistically and stay in character

Respect other players and their roleplay scenarios

Follow staff instructions without arguing

Report rule breakers instead of taking matters into your own hands

Help new players learn the rules and mechanics

Keep the server atmosphere friendly and welcoming`,
        is_published: true,
        order_index: 1
      }
    ];

    // Create rules
    const createdRules = [];
    for (const ruleData of rulesData) {
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
            slug: ruleData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
          }
        });
        createdRules.push(rule);
      }
    }

    console.log(`📝 ${createdRules.length} rules created/found`);
    console.log('✅ GMod rules database populated successfully!');
    
    // Test the API endpoint
    console.log('\n🔍 Testing API endpoint...');
    const testRules = await Rule.findAll({
      where: { is_published: true },
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug', 'description', 'icon', 'color']
        }
      ],
      order: [['order_index', 'ASC']]
    });

    console.log(`📊 API will return ${testRules.length} rules`);
    console.log('Sample rule:', {
      id: testRules[0]?.id,
      title: testRules[0]?.title,
      category: testRules[0]?.category?.name,
      contentLength: testRules[0]?.content?.length
    });

  } catch (error) {
    console.error('❌ Error populating database:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the script
populateGmodRules(); 