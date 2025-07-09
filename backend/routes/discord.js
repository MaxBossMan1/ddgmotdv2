const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const discordBot = require('../services/discordBot');

const router = express.Router();

// Get Discord bot status
router.get('/status', authenticateToken, authorize(['admin', 'owner']), async (req, res) => {
    try {
        const isConnected = discordBot.isConnected();
        const guildInfo = discordBot.getGuildInfo();
        
        res.json({
            connected: isConnected,
            guild: guildInfo,
            rolePermissions: discordBot.getRolePermissions()
        });
    } catch (error) {
        console.error('Discord status error:', error);
        res.status(500).json({ error: 'Failed to get Discord bot status' });
    }
});

// Get user's Discord roles and permissions
router.get('/user/:discordId', authenticateToken, authorize(['moderator', 'admin', 'owner']), async (req, res) => {
    try {
        const { discordId } = req.params;
        
        const userRoles = await discordBot.getUserRoles(discordId);
        const userPermission = await discordBot.getUserPermissions(discordId);
        
        res.json({
            discordId,
            roles: userRoles,
            permission: userPermission
        });
    } catch (error) {
        console.error('Discord user info error:', error);
        res.status(500).json({ error: 'Failed to get user Discord info' });
    }
});

// Update role permission mapping
router.post('/role-permissions', authenticateToken, authorize(['admin', 'owner']), async (req, res) => {
    try {
        const { roleName, permission } = req.body;
        
        if (!roleName || !permission) {
            return res.status(400).json({ error: 'Role name and permission are required' });
        }
        
        const validPermissions = ['user', 'staff', 'moderator', 'admin', 'owner'];
        if (!validPermissions.includes(permission)) {
            return res.status(400).json({ error: 'Invalid permission level' });
        }
        
        await discordBot.setRolePermission(roleName, permission, req.user.id);
        
        res.json({
            message: 'Role permission updated successfully',
            roleName,
            permission,
            allRolePermissions: discordBot.getRolePermissions()
        });
    } catch (error) {
        console.error('Update role permission error:', error);
        res.status(500).json({ error: 'Failed to update role permission' });
    }
});

// Remove role permission mapping
router.delete('/role-permissions/:roleName', authenticateToken, authorize(['admin', 'owner']), async (req, res) => {
    try {
        const { roleName } = req.params;
        
        const removed = await discordBot.removeRolePermission(roleName);
        
        if (removed) {
            res.json({
                message: 'Role permission removed successfully',
                roleName,
                allRolePermissions: discordBot.getRolePermissions()
            });
        } else {
            res.status(404).json({ error: 'Role permission not found' });
        }
    } catch (error) {
        console.error('Remove role permission error:', error);
        res.status(500).json({ error: 'Failed to remove role permission' });
    }
});

// Get all role permissions
router.get('/role-permissions', authenticateToken, authorize(['moderator', 'admin', 'owner']), async (req, res) => {
    try {
        const rolePermissions = discordBot.getRolePermissions();
        const guildInfo = discordBot.getGuildInfo();
        
        res.json({
            rolePermissions,
            availableRoles: guildInfo ? guildInfo.roles : [],
            validPermissions: ['user', 'staff', 'moderator', 'admin', 'owner']
        });
    } catch (error) {
        console.error('Get role permissions error:', error);
        res.status(500).json({ error: 'Failed to get role permissions' });
    }
});

// Check if user has specific Discord role
router.get('/user/:discordId/role/:roleName', authenticateToken, authorize(['moderator', 'admin', 'owner']), async (req, res) => {
    try {
        const { discordId, roleName } = req.params;
        
        const hasRole = await discordBot.hasRole(discordId, roleName);
        
        res.json({
            discordId,
            roleName,
            hasRole
        });
    } catch (error) {
        console.error('Check role error:', error);
        res.status(500).json({ error: 'Failed to check user role' });
    }
});

module.exports = router; 