const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { User, Violation, UserBookmark, Analytics } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all users (staff only)
router.get('/', authenticate, authorize(['moderator', 'admin', 'owner']), [
  query('search').optional().isString(),
  query('role').optional().isIn(['user', 'moderator', 'admin', 'owner']),
  query('is_active').optional().isBoolean(),
  query('is_banned').optional().isBoolean(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      search, 
      role, 
      is_active, 
      is_banned, 
      limit = 50, 
      offset = 0 
    } = req.query;

    let whereClause = {};

    // Add search filter
    if (search) {
      whereClause[Op.or] = [
        { username: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { steam_id: { [Op.like]: `%${search}%` } }
      ];
    }

    // Add role filter
    if (role) {
      whereClause.role = role;
    }

    // Add active filter
    if (is_active !== undefined) {
      whereClause.is_active = is_active === 'true';
    }

    // Add banned filter
    if (is_banned !== undefined) {
      if (is_banned === 'true') {
        whereClause.ban_expires = { [Op.gt]: new Date() };
      } else {
        whereClause[Op.or] = [
          { ban_expires: null },
          { ban_expires: { [Op.lt]: new Date() } }
        ];
      }
    }

    const users = await User.findAll({
      where: whereClause,
      attributes: { exclude: ['password', 'verification_token', 'reset_token'] },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      users,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: users.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get user by ID (staff only)
router.get('/:id', authenticate, authorize(['moderator', 'admin', 'owner']), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password', 'verification_token', 'reset_token'] },
      include: [
        {
          model: Violation,
          as: 'violations',
          include: [
            {
              model: User,
              as: 'staff',
              attributes: ['id', 'username']
            }
          ],
          order: [['created_at', 'DESC']]
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user statistics
    const [
      totalBookmarks,
      totalViews,
      recentActivity
    ] = await Promise.all([
      UserBookmark.count({ where: { user_id: id } }),
      Analytics.count({ where: { user_id: id, action: 'view' } }),
      Analytics.findAll({
        where: { user_id: id },
        order: [['created_at', 'DESC']],
        limit: 10,
        attributes: ['action', 'created_at', 'metadata']
      })
    ]);

    res.json({
      user,
      statistics: {
        totalBookmarks,
        totalViews,
        violationCount: user.violations.length,
        activeViolations: user.violations.filter(v => v.is_active).length
      },
      recentActivity
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update user (staff only)
router.put('/:id', authenticate, authorize(['admin', 'owner']), [
  body('role').optional().isIn(['user', 'moderator', 'admin', 'owner']),
  body('is_active').optional().isBoolean(),
  body('warns').optional().isInt({ min: 0 }),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updates = req.body;

    // Prevent self-demotion for owners
    if (req.user.id === parseInt(id) && updates.role && updates.role !== req.user.role) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    // Prevent non-owners from creating owners
    if (updates.role === 'owner' && req.user.role !== 'owner') {
      return res.status(403).json({ error: 'Only owners can promote to owner role' });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.update(updates);

    res.json({
      message: 'User updated successfully',
      user: user.toJSON()
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Ban user (staff only)
router.post('/:id/ban', authenticate, authorize(['moderator', 'admin', 'owner']), [
  body('reason').notEmpty(),
  body('duration').optional().isInt({ min: 1 }),
  body('is_permanent').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { reason, duration, is_permanent = false } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent banning staff members of equal or higher rank
    const userRoleRank = getRoleRank(user.role);
    const staffRoleRank = getRoleRank(req.user.role);
    
    if (userRoleRank >= staffRoleRank) {
      return res.status(403).json({ error: 'Cannot ban user with equal or higher role' });
    }

    // Calculate ban expiration
    let banExpires = null;
    if (!is_permanent && duration) {
      banExpires = new Date(Date.now() + duration * 60 * 1000); // duration in minutes
    }

    // Update user ban status
    await user.update({
      ban_expires: banExpires,
      ban_reason: reason
    });

    // Create violation record
    await Violation.create({
      user_id: user.id,
      rule_id: null, // General ban, not tied to specific rule
      staff_id: req.user.id,
      punishment_type: is_permanent ? 'permanent_ban' : 'temporary_ban',
      reason,
      duration: duration || null,
      is_active: true
    });

    res.json({
      message: 'User banned successfully',
      ban: {
        reason,
        expires: banExpires,
        is_permanent
      }
    });

  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ error: 'Failed to ban user' });
  }
});

// Unban user (staff only)
router.post('/:id/unban', authenticate, authorize(['moderator', 'admin', 'owner']), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.isBanned()) {
      return res.status(400).json({ error: 'User is not banned' });
    }

    // Remove ban
    await user.update({
      ban_expires: null,
      ban_reason: null
    });

    // Mark violation records as inactive
    await Violation.update(
      { is_active: false },
      {
        where: {
          user_id: user.id,
          punishment_type: { [Op.in]: ['temporary_ban', 'permanent_ban'] },
          is_active: true
        }
      }
    );

    res.json({ message: 'User unbanned successfully' });

  } catch (error) {
    console.error('Unban user error:', error);
    res.status(500).json({ error: 'Failed to unban user' });
  }
});

// Add warning to user (staff only)
router.post('/:id/warn', authenticate, authorize(['moderator', 'admin', 'owner']), [
  body('reason').notEmpty(),
  body('rule_id').optional().isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { reason, rule_id } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Increment warning count
    await user.update({
      warns: user.warns + 1
    });

    // Create violation record
    await Violation.create({
      user_id: user.id,
      rule_id: rule_id || null,
      staff_id: req.user.id,
      punishment_type: 'warning',
      reason,
      is_active: true
    });

    // Check if user should be auto-banned based on warnings
    const warnThresholds = {
      5: { duration: 1440, type: 'temporary_ban' }, // 1 day
      10: { duration: 4320, type: 'temporary_ban' }, // 3 days
      15: { duration: 10080, type: 'temporary_ban' }, // 1 week
      20: { duration: 20160, type: 'temporary_ban' }, // 2 weeks
      25: { duration: null, type: 'permanent_ban' }
    };

    const threshold = warnThresholds[user.warns];
    if (threshold) {
      const banExpires = threshold.duration 
        ? new Date(Date.now() + threshold.duration * 60 * 1000)
        : null;

      await user.update({
        ban_expires: banExpires,
        ban_reason: `Automatic ban: ${user.warns} warnings reached`
      });

      await Violation.create({
        user_id: user.id,
        rule_id: null,
        staff_id: req.user.id,
        punishment_type: threshold.type,
        reason: `Automatic ban: ${user.warns} warnings reached`,
        duration: threshold.duration,
        is_active: true
      });
    }

    res.json({
      message: 'Warning added successfully',
      user: {
        warns: user.warns,
        isBanned: !!threshold,
        banExpires: threshold ? (threshold.duration ? new Date(Date.now() + threshold.duration * 60 * 1000) : null) : null
      }
    });

  } catch (error) {
    console.error('Warn user error:', error);
    res.status(500).json({ error: 'Failed to warn user' });
  }
});

// Get user violations (staff only)
router.get('/:id/violations', authenticate, authorize(['moderator', 'admin', 'owner']), async (req, res) => {
  try {
    const { id } = req.params;

    const violations = await Violation.findAll({
      where: { user_id: id },
      include: [
        {
          model: User,
          as: 'staff',
          attributes: ['id', 'username', 'avatar_url']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({ violations });

  } catch (error) {
    console.error('Get violations error:', error);
    res.status(500).json({ error: 'Failed to get violations' });
  }
});

// Helper function to get role rank
function getRoleRank(role) {
  const ranks = {
    'user': 0,
    'moderator': 1,
    'admin': 2,
    'owner': 3
  };
  return ranks[role] || 0;
}

module.exports = router; 