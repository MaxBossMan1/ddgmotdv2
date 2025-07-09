const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Rule, Category, User, UserBookmark, Analytics, RuleVersion } = require('../models');
const { authenticate, authenticateToken, optionalAuth, authorize } = require('../middleware/auth');

const router = express.Router();

// Helper function to track analytics
const trackAnalytics = async (req, action, ruleId = null, metadata = {}) => {
  try {
    await Analytics.create({
      user_id: req.user ? req.user.id : null,
      rule_id: ruleId,
      action,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      referrer: req.get('Referrer'),
      session_id: req.sessionID,
      metadata
    });
  } catch (error) {
    console.error('Analytics tracking error:', error);
  }
};

// Get all published rules with categories
router.get('/', optionalAuth, [
  query('category').optional().isString(),
  query('search').optional().isString(),
  query('featured').optional().isBoolean(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      category, 
      search, 
      featured, 
      limit = 50, 
      offset = 0 
    } = req.query;

    let whereClause = { is_published: true };
    
    // Add category filter
    if (category) {
      const categoryRecord = await Category.findOne({ where: { slug: category } });
      if (categoryRecord) {
        whereClause.category_id = categoryRecord.id;
      }
    }

    // Add featured filter
    if (featured === 'true') {
      whereClause.is_featured = true;
    }

    // Add expiration filter
    whereClause.expires_at = {
      [Op.or]: [
        null,
        { [Op.gt]: new Date() }
      ]
    };

    let rules;
    
    if (search) {
      // Use search method for text search
      rules = await Rule.search(search, {
        where: whereClause,
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name', 'slug', 'icon', 'color']
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'username', 'avatar_url']
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      // Track search analytics
      await trackAnalytics(req, 'search', null, { query: search });
    } else {
      // Regular query
      rules = await Rule.findAll({
        where: whereClause,
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name', 'slug', 'icon', 'color']
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'username', 'avatar_url']
          }
        ],
        order: [['order_index', 'ASC'], ['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    }

    // Get user bookmarks if authenticated
    let bookmarks = [];
    if (req.user) {
      const userBookmarks = await UserBookmark.findAll({
        where: { user_id: req.user.id },
        attributes: ['rule_id']
      });
      bookmarks = userBookmarks.map(b => b.rule_id);
    }

    // Format response
    const formattedRules = rules.map(rule => ({
      ...rule.toPublicJSON(),
      category: rule.category,
      creator: rule.creator,
      isBookmarked: bookmarks.includes(rule.id)
    }));

    res.json({
      rules: formattedRules,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: rules.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get rules error:', error);
    res.status(500).json({ error: 'Failed to get rules' });
  }
});

// Get categories (main endpoint for frontend)
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { is_active: true },
      include: [
        {
          model: Rule,
          as: 'rules',
          where: { is_published: true },
          attributes: ['id'],
          required: false
        }
      ],
      order: [['order_index', 'ASC'], ['name', 'ASC']]
    });

    const formattedCategories = categories.map(category => ({
      id: category.id,
      name: category.name,
      description: category.description || '',
      slug: category.slug,
      ...category.toJSON(),
      ruleCount: category.rules.length
    }));

    res.json({ categories: formattedCategories });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// Create category (staff only)
router.post('/categories', authenticateToken, authorize(['staff', 'moderator', 'admin', 'owner']), [
  body('name').notEmpty().isLength({ min: 1, max: 100 }),
  body('description').optional().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description } = req.body;

    // Generate slug from name
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check if slug already exists
    const existingCategory = await Category.findOne({ where: { slug } });
    if (existingCategory) {
      return res.status(400).json({ error: 'Category with this name already exists' });
    }

    const category = await Category.create({
      name: name.trim(),
      description: description?.trim() || '',
      slug,
      created_by: req.user.id,
      is_active: true,
      order_index: 0
    });

    res.status(201).json({
      message: 'Category created successfully',
      category: category.toJSON()
    });

  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category (staff only)
router.put('/categories/:id', authenticateToken, authorize(['staff', 'moderator', 'admin', 'owner']), [
  body('name').optional().isLength({ min: 1, max: 100 }),
  body('description').optional().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, description } = req.body;

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const updates = {};
    if (name) {
      updates.name = name.trim();
      // Generate new slug if name changed
      if (name !== category.name) {
        const newSlug = name.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        
        // Check if new slug already exists
        const existingCategory = await Category.findOne({ 
          where: { slug: newSlug, id: { [Op.ne]: id } } 
        });
        if (existingCategory) {
          return res.status(400).json({ error: 'Category with this name already exists' });
        }
        updates.slug = newSlug;
      }
    }
    if (description !== undefined) {
      updates.description = description.trim();
    }

    await category.update(updates);

    res.json({
      message: 'Category updated successfully',
      category: category.toJSON()
    });

  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category (admin only)
router.delete('/categories/:id', authenticateToken, authorize(['admin', 'owner']), async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if category has rules
    const ruleCount = await Rule.count({ where: { category_id: id } });
    if (ruleCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with existing rules. Please move or delete all rules first.' 
      });
    }

    await category.destroy();

    res.json({ message: 'Category deleted successfully' });

  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Get categories (alternative endpoint)
router.get('/categories/all', async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { is_active: true },
      include: [
        {
          model: Rule,
          as: 'rules',
          where: { is_published: true },
          attributes: ['id'],
          required: false
        }
      ],
      order: [['order_index', 'ASC'], ['name', 'ASC']]
    });

    const formattedCategories = categories.map(category => ({
      ...category.toJSON(),
      ruleCount: category.rules.length
    }));

    res.json({ categories: formattedCategories });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// Get rule by category ID
router.get('/category/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    // Find the category first
    const category = await Category.findByPk(categoryId, {
      where: { is_active: true }
    });
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Find the rule for this category
    const rule = await Rule.findOne({
      where: { 
        category_id: categoryId,
        is_published: true
      },
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug', 'description']
        }
      ]
    });
    
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found for this category' });
    }
    
    res.json({ rule: rule.toJSON() });
    
  } catch (error) {
    console.error('Get rule by category error:', error);
    res.status(500).json({ error: 'Failed to get rule' });
  }
});

// Get rule by ID or slug
router.get('/:identifier', optionalAuth, async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Try to find by ID first, then by slug
    const whereClause = isNaN(identifier) 
      ? { slug: identifier } 
      : { id: identifier };

    const rule = await Rule.findOne({
      where: {
        ...whereClause,
        is_published: true,
        expires_at: {
          [Op.or]: [
            null,
            { [Op.gt]: new Date() }
          ]
        }
      },
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug', 'icon', 'color']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'avatar_url']
        },
        {
          model: User,
          as: 'updater',
          attributes: ['id', 'username', 'avatar_url']
        }
      ]
    });

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    // Increment view count
    await rule.incrementViewCount();

    // Track analytics
    await trackAnalytics(req, 'view', rule.id);

    // Check if user has bookmarked this rule
    let isBookmarked = false;
    if (req.user) {
      const bookmark = await UserBookmark.findOne({
        where: { user_id: req.user.id, rule_id: rule.id }
      });
      isBookmarked = !!bookmark;
    }

    res.json({
      ...rule.toPublicJSON(),
      category: rule.category,
      creator: rule.creator,
      updater: rule.updater,
      isBookmarked
    });

  } catch (error) {
    console.error('Get rule error:', error);
    res.status(500).json({ error: 'Failed to get rule' });
  }
});

// Create new rule (staff only)
router.post('/', authenticateToken, authorize(['staff', 'moderator', 'admin', 'owner']), [
  body('title').isLength({ min: 1, max: 200 }),
  body('subtitle').optional().isLength({ max: 300 }),
  body('content').notEmpty(),
  body('category_id').isInt(),
  body('tags').optional().isArray(),
  body('is_published').optional().isBoolean(),
  body('is_featured').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      title, 
      subtitle, 
      content, 
      category_id, 
      tags = [], 
      is_published = true, 
      is_featured = false,
      meta_data = {},
      punishment_info = {}
    } = req.body;

    // Verify category exists
    const category = await Category.findByPk(category_id);
    if (!category) {
      return res.status(400).json({ error: 'Category not found' });
    }

    // Create rule
    const rule = await Rule.create({
      title,
      subtitle,
      content,
      category_id,
      tags,
      is_published,
      is_featured,
      meta_data,
      punishment_info,
      created_by: req.user.id,
      updated_by: req.user.id
    });

    // Create initial version
    await RuleVersion.create({
      rule_id: rule.id,
      version: 1,
      title,
      content,
      change_summary: 'Initial version',
      created_by: req.user.id
    });

    // Get full rule data
    const fullRule = await Rule.findByPk(rule.id, {
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug', 'icon', 'color']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'avatar_url']
        }
      ]
    });

    res.status(201).json({
      message: 'Rule created successfully',
      rule: {
        ...fullRule.toPublicJSON(),
        category: fullRule.category,
        creator: fullRule.creator
      }
    });

  } catch (error) {
    console.error('Create rule error:', error);
    res.status(500).json({ error: 'Failed to create rule' });
  }
});

// Update rule (staff only)
router.put('/:id', authenticateToken, authorize(['staff', 'moderator', 'admin', 'owner']), [
  body('title').optional().isLength({ min: 1, max: 200 }),
  body('subtitle').optional().isLength({ max: 300 }),
  body('content').optional().notEmpty(),
  body('category_id').optional().isInt(),
  body('tags').optional().isArray(),
  body('is_published').optional().isBoolean(),
  body('is_featured').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updates = req.body;

    const rule = await Rule.findByPk(id);
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    // Store old content for version history
    const oldContent = {
      title: rule.title,
      content: rule.content
    };

    // Update rule
    updates.updated_by = req.user.id;
    await rule.update(updates);

    // Create version if content changed
    if (updates.content && updates.content !== oldContent.content) {
      await RuleVersion.create({
        rule_id: rule.id,
        version: rule.version,
        title: rule.title,
        content: rule.content,
        change_summary: updates.change_summary || 'Updated content',
        created_by: req.user.id
      });
    }

    // Get updated rule data
    const updatedRule = await Rule.findByPk(id, {
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug', 'icon', 'color']
        },
        {
          model: User,
          as: 'updater',
          attributes: ['id', 'username', 'avatar_url']
        }
      ]
    });

    res.json({
      message: 'Rule updated successfully',
      rule: {
        ...updatedRule.toPublicJSON(),
        category: updatedRule.category,
        updater: updatedRule.updater
      }
    });

  } catch (error) {
    console.error('Update rule error:', error);
    res.status(500).json({ error: 'Failed to update rule' });
  }
});

// Delete rule (admin only)
router.delete('/:id', authenticateToken, authorize(['admin', 'owner']), async (req, res) => {
  try {
    const { id } = req.params;

    const rule = await Rule.findByPk(id);
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    // Soft delete (paranoid: true in model)
    await rule.destroy();

    res.json({ message: 'Rule deleted successfully' });

  } catch (error) {
    console.error('Delete rule error:', error);
    res.status(500).json({ error: 'Failed to delete rule' });
  }
});

// Get rule versions (staff only)
router.get('/:id/versions', authenticateToken, authorize(['staff', 'moderator', 'admin', 'owner']), async (req, res) => {
  try {
    const { id } = req.params;

    const versions = await RuleVersion.findAll({
      where: { rule_id: id },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'avatar_url']
        }
      ],
      order: [['version', 'DESC']]
    });

    res.json({ versions });

  } catch (error) {
    console.error('Get rule versions error:', error);
    res.status(500).json({ error: 'Failed to get rule versions' });
  }
});

// Bookmark/Unbookmark rule
router.post('/:id/bookmark', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes = '' } = req.body;

    const rule = await Rule.findByPk(id);
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    // Check if already bookmarked
    const existingBookmark = await UserBookmark.findOne({
      where: { user_id: req.user.id, rule_id: id }
    });

    if (existingBookmark) {
      // Remove bookmark
      await existingBookmark.destroy();
      res.json({ message: 'Bookmark removed', isBookmarked: false });
    } else {
      // Add bookmark
      await UserBookmark.create({
        user_id: req.user.id,
        rule_id: id,
        notes
      });

      // Track analytics
      await trackAnalytics(req, 'bookmark', id);

      res.json({ message: 'Rule bookmarked', isBookmarked: true });
    }

  } catch (error) {
    console.error('Bookmark rule error:', error);
    res.status(500).json({ error: 'Failed to bookmark rule' });
  }
});

// Get user bookmarks
router.get('/bookmarks/my', authenticateToken, async (req, res) => {
  try {
    const bookmarks = await UserBookmark.findAll({
      where: { user_id: req.user.id },
      include: [
        {
          model: Rule,
          as: 'rule',
          include: [
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'name', 'slug', 'icon', 'color']
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    const formattedBookmarks = bookmarks.map(bookmark => ({
      id: bookmark.id,
      notes: bookmark.notes,
      created_at: bookmark.created_at,
      rule: {
        ...bookmark.rule.toPublicJSON(),
        category: bookmark.rule.category
      }
    }));

    res.json({ bookmarks: formattedBookmarks });

  } catch (error) {
    console.error('Get bookmarks error:', error);
    res.status(500).json({ error: 'Failed to get bookmarks' });
  }
});

module.exports = router; 