const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Analytics, Rule, User, Category } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get analytics dashboard data (staff only)
router.get('/dashboard', authenticate, authorize(['moderator', 'admin', 'owner']), [
  query('period').optional().isIn(['day', 'week', 'month', 'year']),
  query('start_date').optional().isISO8601(),
  query('end_date').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { period = 'week', start_date, end_date } = req.query;

    // Calculate date range
    let startDate, endDate;
    if (start_date && end_date) {
      startDate = new Date(start_date);
      endDate = new Date(end_date);
    } else {
      endDate = new Date();
      switch (period) {
        case 'day':
          startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      }
    }

    // Get analytics data
    const [
      totalViews,
      totalSearches,
      totalBookmarks,
      totalUsers,
      popularRules,
      searchQueries,
      userActivity,
      categoryStats
    ] = await Promise.all([
      // Total views
      Analytics.count({
        where: {
          action: 'view',
          created_at: { [Op.between]: [startDate, endDate] }
        }
      }),

      // Total searches
      Analytics.count({
        where: {
          action: 'search',
          created_at: { [Op.between]: [startDate, endDate] }
        }
      }),

      // Total bookmarks
      Analytics.count({
        where: {
          action: 'bookmark',
          created_at: { [Op.between]: [startDate, endDate] }
        }
      }),

      // Active users
      Analytics.count({
        distinct: true,
        col: 'user_id',
        where: {
          created_at: { [Op.between]: [startDate, endDate] },
          user_id: { [Op.not]: null }
        }
      }),

      // Most popular rules
      Analytics.findAll({
        attributes: [
          'rule_id',
          [Analytics.sequelize.fn('COUNT', Analytics.sequelize.col('rule_id')), 'view_count']
        ],
        where: {
          action: 'view',
          created_at: { [Op.between]: [startDate, endDate] },
          rule_id: { [Op.not]: null }
        },
        include: [
          {
            model: Rule,
            as: 'rule',
            attributes: ['id', 'title', 'slug'],
            include: [
              {
                model: Category,
                as: 'category',
                attributes: ['name', 'slug']
              }
            ]
          }
        ],
        group: ['rule_id'],
        order: [[Analytics.sequelize.fn('COUNT', Analytics.sequelize.col('rule_id')), 'DESC']],
        limit: 10
      }),

      // Popular search queries
      Analytics.findAll({
        attributes: [
          [Analytics.sequelize.fn('JSON_UNQUOTE', Analytics.sequelize.fn('JSON_EXTRACT', Analytics.sequelize.col('metadata'), '$.query')), 'query'],
          [Analytics.sequelize.fn('COUNT', '*'), 'count']
        ],
        where: {
          action: 'search',
          created_at: { [Op.between]: [startDate, endDate] },
          metadata: { [Op.not]: null }
        },
        group: [Analytics.sequelize.fn('JSON_UNQUOTE', Analytics.sequelize.fn('JSON_EXTRACT', Analytics.sequelize.col('metadata'), '$.query'))],
        order: [[Analytics.sequelize.fn('COUNT', '*'), 'DESC']],
        limit: 10,
        raw: true
      }),

      // User activity over time
      Analytics.findAll({
        attributes: [
          [Analytics.sequelize.fn('DATE', Analytics.sequelize.col('created_at')), 'date'],
          [Analytics.sequelize.fn('COUNT', '*'), 'count']
        ],
        where: {
          created_at: { [Op.between]: [startDate, endDate] }
        },
        group: [Analytics.sequelize.fn('DATE', Analytics.sequelize.col('created_at'))],
        order: [[Analytics.sequelize.fn('DATE', Analytics.sequelize.col('created_at')), 'ASC']],
        raw: true
      }),

      // Category performance
      Analytics.findAll({
        attributes: [
          [Analytics.sequelize.fn('COUNT', '*'), 'view_count']
        ],
        where: {
          action: 'view',
          created_at: { [Op.between]: [startDate, endDate] },
          rule_id: { [Op.not]: null }
        },
        include: [
          {
            model: Rule,
            as: 'rule',
            attributes: [],
            include: [
              {
                model: Category,
                as: 'category',
                attributes: ['id', 'name', 'slug']
              }
            ]
          }
        ],
        group: ['rule.category.id'],
        order: [[Analytics.sequelize.fn('COUNT', '*'), 'DESC']],
        raw: false
      })
    ]);

    res.json({
      summary: {
        totalViews,
        totalSearches,
        totalBookmarks,
        totalUsers,
        period,
        startDate,
        endDate
      },
      popularRules: popularRules.map(item => ({
        rule: item.rule,
        viewCount: parseInt(item.dataValues.view_count)
      })),
      searchQueries: searchQueries.map(item => ({
        query: item.query,
        count: parseInt(item.count)
      })),
      userActivity,
      categoryStats: categoryStats.map(item => ({
        category: item.rule?.category,
        viewCount: parseInt(item.dataValues.view_count)
      })).filter(item => item.category)
    });

  } catch (error) {
    console.error('Analytics dashboard error:', error);
    res.status(500).json({ error: 'Failed to get analytics data' });
  }
});

// Get rule analytics (staff only)
router.get('/rules/:id', authenticate, authorize(['moderator', 'admin', 'owner']), [
  query('period').optional().isIn(['day', 'week', 'month', 'year'])
], async (req, res) => {
  try {
    const { id } = req.params;
    const { period = 'month' } = req.query;

    // Calculate date range
    const endDate = new Date();
    let startDate;
    switch (period) {
      case 'day':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const [
      viewsOverTime,
      totalViews,
      uniqueViewers,
      bookmarkCount
    ] = await Promise.all([
      // Views over time
      Analytics.findAll({
        attributes: [
          [Analytics.sequelize.fn('DATE', Analytics.sequelize.col('created_at')), 'date'],
          [Analytics.sequelize.fn('COUNT', '*'), 'views']
        ],
        where: {
          rule_id: id,
          action: 'view',
          created_at: { [Op.between]: [startDate, endDate] }
        },
        group: [Analytics.sequelize.fn('DATE', Analytics.sequelize.col('created_at'))],
        order: [[Analytics.sequelize.fn('DATE', Analytics.sequelize.col('created_at')), 'ASC']],
        raw: true
      }),

      // Total views
      Analytics.count({
        where: {
          rule_id: id,
          action: 'view',
          created_at: { [Op.between]: [startDate, endDate] }
        }
      }),

      // Unique viewers
      Analytics.count({
        distinct: true,
        col: 'user_id',
        where: {
          rule_id: id,
          action: 'view',
          created_at: { [Op.between]: [startDate, endDate] },
          user_id: { [Op.not]: null }
        }
      }),

      // Bookmark count
      Analytics.count({
        where: {
          rule_id: id,
          action: 'bookmark',
          created_at: { [Op.between]: [startDate, endDate] }
        }
      })
    ]);

    res.json({
      ruleId: id,
      period,
      summary: {
        totalViews,
        uniqueViewers,
        bookmarkCount
      },
      viewsOverTime
    });

  } catch (error) {
    console.error('Rule analytics error:', error);
    res.status(500).json({ error: 'Failed to get rule analytics' });
  }
});

// Get user analytics (for their own data)
router.get('/my-activity', authenticate, [
  query('period').optional().isIn(['day', 'week', 'month', 'year'])
], async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    // Calculate date range
    const endDate = new Date();
    let startDate;
    switch (period) {
      case 'day':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const [
      activityOverTime,
      rulesViewed,
      searchesCount,
      bookmarksCount
    ] = await Promise.all([
      // Activity over time
      Analytics.findAll({
        attributes: [
          [Analytics.sequelize.fn('DATE', Analytics.sequelize.col('created_at')), 'date'],
          'action',
          [Analytics.sequelize.fn('COUNT', '*'), 'count']
        ],
        where: {
          user_id: req.user.id,
          created_at: { [Op.between]: [startDate, endDate] }
        },
        group: [
          Analytics.sequelize.fn('DATE', Analytics.sequelize.col('created_at')),
          'action'
        ],
        order: [
          [Analytics.sequelize.fn('DATE', Analytics.sequelize.col('created_at')), 'ASC'],
          ['action', 'ASC']
        ],
        raw: true
      }),

      // Rules viewed
      Analytics.count({
        distinct: true,
        col: 'rule_id',
        where: {
          user_id: req.user.id,
          action: 'view',
          created_at: { [Op.between]: [startDate, endDate] },
          rule_id: { [Op.not]: null }
        }
      }),

      // Searches count
      Analytics.count({
        where: {
          user_id: req.user.id,
          action: 'search',
          created_at: { [Op.between]: [startDate, endDate] }
        }
      }),

      // Bookmarks count
      Analytics.count({
        where: {
          user_id: req.user.id,
          action: 'bookmark',
          created_at: { [Op.between]: [startDate, endDate] }
        }
      })
    ]);

    res.json({
      period,
      summary: {
        rulesViewed,
        searchesCount,
        bookmarksCount
      },
      activityOverTime
    });

  } catch (error) {
    console.error('User analytics error:', error);
    res.status(500).json({ error: 'Failed to get user analytics' });
  }
});

// Track custom event
router.post('/track', authenticate, [
  body('action').isIn(['view', 'search', 'bookmark', 'share', 'download', 'comment']),
  body('rule_id').optional().isInt(),
  body('metadata').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { action, rule_id, metadata = {} } = req.body;

    await Analytics.create({
      user_id: req.user.id,
      rule_id,
      action,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      referrer: req.get('Referrer'),
      session_id: req.sessionID,
      metadata
    });

    res.json({ message: 'Event tracked successfully' });

  } catch (error) {
    console.error('Track event error:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

module.exports = router; 