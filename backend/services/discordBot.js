const { Client, GatewayIntentBits } = require('discord.js');
const { DiscordRoleMapping } = require('../models');

class DiscordBotService {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers
            ]
        });
        
        this.isReady = false;
        this.guild = null;
        
        // Role to permission mapping (loaded from database)
        this.rolePermissions = {};
        
        this.init();
    }
    
    async init() {
        try {
            // Load role mappings from database first
            await this.loadRolePermissions();
            
            const token = process.env.DISCORD_BOT_TOKEN;
            const guildId = process.env.DISCORD_GUILD_ID;
            
            if (!token) {
                console.warn('Discord bot token not provided. Role-based permissions will be disabled.');
                return;
            }
            
            if (!guildId) {
                console.warn('Discord guild ID not provided. Role-based permissions will be disabled.');
                return;
            }
            
            this.client.once('ready', async () => {
                console.log(`Discord bot logged in as ${this.client.user.tag}`);
                this.guild = this.client.guilds.cache.get(guildId);
                
                if (!this.guild) {
                    console.error(`Could not find guild with ID: ${guildId}`);
                    return;
                }
                
                console.log(`Connected to Discord server: ${this.guild.name}`);
                this.isReady = true;
                
                // Ensure default role mappings exist
                await this.ensureDefaultRoleMappings();
            });
            
            this.client.on('error', (error) => {
                console.error('Discord bot error:', error);
            });
            
            await this.client.login(token);
            
        } catch (error) {
            console.error('Failed to initialize Discord bot:', error);
        }
    }
    
    async getUserPermissions(discordId) {
        if (!this.isReady || !this.guild) {
            console.warn('Discord bot not ready, falling back to default permissions');
            return 'user'; // Default permission level
        }
        
        try {
            // Fetch the member from the guild
            const member = await this.guild.members.fetch(discordId);
            
            if (!member) {
                console.log(`User ${discordId} not found in guild`);
                return 'user';
            }
            
            // Get user's roles
            const userRoles = member.roles.cache.map(role => role.name);
            console.log(`User ${discordId} has roles:`, userRoles);
            
            // Check for highest permission level
            let highestPermission = 'user';
            
            for (const roleName of userRoles) {
                const permission = this.rolePermissions[roleName];
                if (permission) {
                    // Permission hierarchy: owner > admin > moderator > staff > user
                    if (permission === 'owner') {
                        highestPermission = 'owner';
                        break;
                    } else if (permission === 'admin' && highestPermission !== 'owner') {
                        highestPermission = 'admin';
                    } else if (permission === 'moderator' && !['owner', 'admin'].includes(highestPermission)) {
                        highestPermission = 'moderator';
                    } else if (permission === 'staff' && !['owner', 'admin', 'moderator'].includes(highestPermission)) {
                        highestPermission = 'staff';
                    }
                }
            }
            
            console.log(`User ${discordId} assigned permission level: ${highestPermission}`);
            return highestPermission;
            
        } catch (error) {
            console.error(`Error fetching user permissions for ${discordId}:`, error);
            return 'user';
        }
    }
    
    async hasRole(discordId, roleName) {
        if (!this.isReady || !this.guild) {
            return false;
        }
        
        try {
            const member = await this.guild.members.fetch(discordId);
            if (!member) return false;
            
            return member.roles.cache.some(role => 
                role.name.toLowerCase() === roleName.toLowerCase()
            );
        } catch (error) {
            console.error(`Error checking role ${roleName} for user ${discordId}:`, error);
            return false;
        }
    }
    
    async getUserRoles(discordId) {
        if (!this.isReady || !this.guild) {
            return [];
        }
        
        try {
            const member = await this.guild.members.fetch(discordId);
            if (!member) return [];
            
            return member.roles.cache.map(role => ({
                id: role.id,
                name: role.name,
                color: role.color,
                position: role.position
            }));
        } catch (error) {
            console.error(`Error fetching roles for user ${discordId}:`, error);
            return [];
        }
    }
    
    // Load role permissions from database
    async loadRolePermissions() {
        try {
            const mappings = await DiscordRoleMapping.findAll();
            this.rolePermissions = {};
            
            mappings.forEach(mapping => {
                this.rolePermissions[mapping.role_name] = mapping.permission_level;
            });
            
            console.log('Loaded role permissions from database:', Object.keys(this.rolePermissions).length, 'mappings');
        } catch (error) {
            console.error('Failed to load role permissions from database:', error);
            // Use fallback defaults if database fails
            this.rolePermissions = {
                'Owner': 'owner',
                'Community Manager': 'owner',
                'Admin': 'admin',
                'Administrator': 'admin',
                'Moderator': 'moderator',
                'Mod': 'moderator',
                'Staff': 'staff',
                'Helper': 'staff',
                'Support': 'staff'
            };
        }
    }
    
    // Ensure default role mappings exist in database
    async ensureDefaultRoleMappings() {
        try {
            const defaultMappings = [
                { role_name: 'Owner', permission_level: 'owner', is_default: true },
                { role_name: 'Community Manager', permission_level: 'owner', is_default: true },
                { role_name: 'Admin', permission_level: 'admin', is_default: true },
                { role_name: 'Administrator', permission_level: 'admin', is_default: true },
                { role_name: 'Moderator', permission_level: 'moderator', is_default: true },
                { role_name: 'Mod', permission_level: 'moderator', is_default: true },
                { role_name: 'Staff', permission_level: 'staff', is_default: true },
                { role_name: 'Helper', permission_level: 'staff', is_default: true },
                { role_name: 'Support', permission_level: 'staff', is_default: true }
            ];
            
            for (const mapping of defaultMappings) {
                await DiscordRoleMapping.findOrCreate({
                    where: { role_name: mapping.role_name },
                    defaults: mapping
                });
            }
            
            // Reload permissions after ensuring defaults
            await this.loadRolePermissions();
            console.log('Default role mappings ensured');
        } catch (error) {
            console.error('Failed to ensure default role mappings:', error);
        }
    }
    
    // Add or update role permission mapping (persistent)
    async setRolePermission(roleName, permission, userId = null) {
        try {
            const [mapping, created] = await DiscordRoleMapping.findOrCreate({
                where: { role_name: roleName },
                defaults: {
                    role_name: roleName,
                    permission_level: permission,
                    is_default: false,
                    created_by: userId,
                    updated_by: userId
                }
            });
            
            if (!created) {
                await mapping.update({
                    permission_level: permission,
                    updated_by: userId
                });
            }
            
            // Update in-memory cache
            this.rolePermissions[roleName] = permission;
            console.log(`Updated role permission: ${roleName} -> ${permission}`);
            
            return mapping;
        } catch (error) {
            console.error('Failed to set role permission:', error);
            throw error;
        }
    }
    
    // Remove role permission mapping (persistent)
    async removeRolePermission(roleName) {
        try {
            const mapping = await DiscordRoleMapping.findOne({
                where: { role_name: roleName }
            });
            
            if (mapping) {
                if (mapping.is_default) {
                    throw new Error('Cannot delete default role mapping');
                }
                
                await mapping.destroy();
                delete this.rolePermissions[roleName];
                console.log(`Removed role permission for: ${roleName}`);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Failed to remove role permission:', error);
            throw error;
        }
    }
    
    // Get current role permission mappings
    getRolePermissions() {
        return { ...this.rolePermissions };
    }
    
    // Check if bot is ready
    isConnected() {
        return this.isReady && this.guild !== null;
    }
    
    // Get guild information
    getGuildInfo() {
        if (!this.guild) return null;
        
        return {
            id: this.guild.id,
            name: this.guild.name,
            memberCount: this.guild.memberCount,
            roles: this.guild.roles.cache.map(role => ({
                id: role.id,
                name: role.name,
                color: role.color,
                position: role.position,
                permissions: role.permissions.toArray()
            }))
        };
    }
}

// Create singleton instance
const discordBot = new DiscordBotService();

module.exports = discordBot; 