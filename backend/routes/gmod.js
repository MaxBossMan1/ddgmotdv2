const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { ServerStatus, User, Analytics } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get server status
router.get('/status', async (req, res) => {
  try {
    const servers = await ServerStatus.findAll({
      where: { is_active: true },
      order: [['priority', 'ASC'], ['name', 'ASC']]
    });

    res.json({ servers });

  } catch (error) {
    console.error('Get server status error:', error);
    res.status(500).json({ error: 'Failed to get server status' });
  }
});

// Get specific server info
router.get('/servers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const server = await ServerStatus.findByPk(id);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    res.json({ server });

  } catch (error) {
    console.error('Get server error:', error);
    res.status(500).json({ error: 'Failed to get server' });
  }
});

// Update server status (GMod server endpoint)
router.post('/update-status', [
  body('server_key').notEmpty(),
  body('name').notEmpty(),
  body('map').notEmpty(),
  body('gamemode').notEmpty(),
  body('players').isInt({ min: 0 }),
  body('max_players').isInt({ min: 1 }),
  body('online_players').optional().isArray(),
  body('server_info').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      server_key,
      name,
      map,
      gamemode,
      players,
      max_players,
      online_players = [],
      server_info = {}
    } = req.body;

    // Find or create server
    let server = await ServerStatus.findOne({
      where: { server_key }
    });

    if (!server) {
      server = await ServerStatus.create({
        server_key,
        name,
        ip: req.ip,
        port: server_info.port || 27015,
        map,
        gamemode,
        players,
        max_players,
        online_players,
        server_info,
        is_active: true,
        last_heartbeat: new Date()
      });
    } else {
      await server.update({
        name,
        map,
        gamemode,
        players,
        max_players,
        online_players,
        server_info,
        is_active: true,
        last_heartbeat: new Date()
      });
    }

    res.json({ 
      message: 'Server status updated successfully',
      server_id: server.id 
    });

  } catch (error) {
    console.error('Update server status error:', error);
    res.status(500).json({ error: 'Failed to update server status' });
  }
});

// Player connect event
router.post('/player-connect', [
  body('server_key').notEmpty(),
  body('steam_id').notEmpty(),
  body('player_name').notEmpty(),
  body('player_data').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      server_key,
      steam_id,
      player_name,
      player_data = {}
    } = req.body;

    // Find server
    const server = await ServerStatus.findOne({
      where: { server_key }
    });

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // Find or create user
    let user = await User.findOne({
      where: { steam_id }
    });

    if (!user) {
      user = await User.create({
        username: player_name,
        steam_id,
        email: `${steam_id}@steam.local`,
        password: 'steam_login', // Will be hashed
        is_verified: true,
        last_login: new Date(),
        game_data: player_data
      });
    } else {
      await user.update({
        username: player_name,
        last_login: new Date(),
        game_data: { ...user.game_data, ...player_data }
      });
    }

    // Update server player list
    const updatedPlayers = [...server.online_players];
    const existingPlayerIndex = updatedPlayers.findIndex(p => p.steam_id === steam_id);
    
    if (existingPlayerIndex >= 0) {
      updatedPlayers[existingPlayerIndex] = {
        steam_id,
        name: player_name,
        connected_at: new Date(),
        ...player_data
      };
    } else {
      updatedPlayers.push({
        steam_id,
        name: player_name,
        connected_at: new Date(),
        ...player_data
      });
    }

    await server.update({
      online_players: updatedPlayers,
      players: updatedPlayers.length
    });

    res.json({ 
      message: 'Player connect recorded',
      user_id: user.id 
    });

  } catch (error) {
    console.error('Player connect error:', error);
    res.status(500).json({ error: 'Failed to record player connect' });
  }
});

// Player disconnect event
router.post('/player-disconnect', [
  body('server_key').notEmpty(),
  body('steam_id').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { server_key, steam_id } = req.body;

    // Find server
    const server = await ServerStatus.findOne({
      where: { server_key }
    });

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // Remove player from online list
    const updatedPlayers = server.online_players.filter(p => p.steam_id !== steam_id);

    await server.update({
      online_players: updatedPlayers,
      players: updatedPlayers.length
    });

    res.json({ message: 'Player disconnect recorded' });

  } catch (error) {
    console.error('Player disconnect error:', error);
    res.status(500).json({ error: 'Failed to record player disconnect' });
  }
});

// Get player ban status (for GMod server to check)
router.get('/player-ban-status/:steam_id', async (req, res) => {
  try {
    const { steam_id } = req.params;

    const user = await User.findOne({
      where: { steam_id },
      attributes: ['id', 'username', 'ban_expires', 'ban_reason', 'warns', 'role']
    });

    if (!user) {
      return res.json({ 
        banned: false, 
        message: 'Player not found in database' 
      });
    }

    const isBanned = user.isBanned();
    
    res.json({
      banned: isBanned,
      ban_expires: user.ban_expires,
      ban_reason: user.ban_reason,
      warns: user.warns,
      role: user.role,
      message: isBanned ? 'Player is banned' : 'Player is not banned'
    });

  } catch (error) {
    console.error('Check ban status error:', error);
    res.status(500).json({ error: 'Failed to check ban status' });
  }
});

// Add server (staff only)
router.post('/servers', authenticate, authorize(['admin', 'owner']), [
  body('name').notEmpty(),
  body('server_key').notEmpty(),
  body('ip').isIP(),
  body('port').isInt({ min: 1, max: 65535 }),
  body('gamemode').notEmpty(),
  body('priority').optional().isInt({ min: 0 }),
  body('is_active').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const serverData = req.body;

    // Check if server key already exists
    const existingServer = await ServerStatus.findOne({
      where: { server_key: serverData.server_key }
    });

    if (existingServer) {
      return res.status(400).json({ error: 'Server key already exists' });
    }

    const server = await ServerStatus.create({
      ...serverData,
      created_by: req.user.id,
      last_heartbeat: new Date()
    });

    res.status(201).json({
      message: 'Server added successfully',
      server
    });

  } catch (error) {
    console.error('Add server error:', error);
    res.status(500).json({ error: 'Failed to add server' });
  }
});

// Update server (staff only)
router.put('/servers/:id', authenticate, authorize(['admin', 'owner']), [
  body('name').optional().notEmpty(),
  body('ip').optional().isIP(),
  body('port').optional().isInt({ min: 1, max: 65535 }),
  body('gamemode').optional().notEmpty(),
  body('priority').optional().isInt({ min: 0 }),
  body('is_active').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updates = req.body;

    const server = await ServerStatus.findByPk(id);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    await server.update(updates);

    res.json({
      message: 'Server updated successfully',
      server
    });

  } catch (error) {
    console.error('Update server error:', error);
    res.status(500).json({ error: 'Failed to update server' });
  }
});

// Delete server (staff only)
router.delete('/servers/:id', authenticate, authorize(['admin', 'owner']), async (req, res) => {
  try {
    const { id } = req.params;

    const server = await ServerStatus.findByPk(id);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    await server.destroy();

    res.json({ message: 'Server deleted successfully' });

  } catch (error) {
    console.error('Delete server error:', error);
    res.status(500).json({ error: 'Failed to delete server' });
  }
});

// Get server analytics (staff only)
router.get('/servers/:id/analytics', authenticate, authorize(['moderator', 'admin', 'owner']), [
  query('period').optional().isIn(['day', 'week', 'month', 'year'])
], async (req, res) => {
  try {
    const { id } = req.params;
    const { period = 'week' } = req.query;

    const server = await ServerStatus.findByPk(id);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

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
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get analytics data for players who connected to this server
    const playerActivity = await Analytics.findAll({
      attributes: [
        [Analytics.sequelize.fn('DATE', Analytics.sequelize.col('created_at')), 'date'],
        [Analytics.sequelize.fn('COUNT', Analytics.sequelize.col('user_id')), 'unique_players']
      ],
      where: {
        created_at: { [Op.between]: [startDate, endDate] },
        metadata: {
          server_id: id
        }
      },
      group: [Analytics.sequelize.fn('DATE', Analytics.sequelize.col('created_at'))],
      order: [[Analytics.sequelize.fn('DATE', Analytics.sequelize.col('created_at')), 'ASC']],
      raw: true
    });

    res.json({
      server,
      period,
      playerActivity
    });

  } catch (error) {
    console.error('Server analytics error:', error);
    res.status(500).json({ error: 'Failed to get server analytics' });
  }
});

module.exports = router; 