# Discord Bot Setup for Role-Based Permissions

## Overview
This system uses Discord OAuth for user authentication and a Discord bot to check user roles and assign appropriate permissions in the staff panel.

## Required Environment Variables

Add these to your `.env` file in the `backend` directory:

```env
# Discord OAuth (for user authentication)
DISCORD_CLIENT_ID=your-discord-oauth-client-id
DISCORD_CLIENT_SECRET=your-discord-oauth-client-secret
DISCORD_CALLBACK_URL=http://localhost:3001/api/auth/discord/callback

# Discord Bot (for role-based permissions)
DISCORD_BOT_TOKEN=your-discord-bot-token
DISCORD_GUILD_ID=your-discord-server-guild-id
```

## Setup Steps

### 1. Create Discord Application
1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name it (e.g., "DDG MOTD Staff Panel")
4. Save the **Application ID** as `DISCORD_CLIENT_ID`

### 2. Configure OAuth2
1. Go to OAuth2 → General in your Discord app
2. Add redirect URL: `http://localhost:3001/api/auth/discord/callback`
3. Copy the **Client Secret** as `DISCORD_CLIENT_SECRET`

### 3. Create Discord Bot
1. Go to Bot section in your Discord app
2. Click "Add Bot"
3. Copy the **Bot Token** as `DISCORD_BOT_TOKEN`
4. Enable these **Privileged Gateway Intents**:
   - Server Members Intent ✅
   - Message Content Intent ✅

### 4. Invite Bot to Server
1. Go to OAuth2 → URL Generator
2. Select scopes: `bot`
3. Select bot permissions: `View Channels`, `Read Message History`
4. Copy the generated URL and invite the bot to your Discord server

### 5. Get Guild ID
1. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
2. Right-click your server name → "Copy Server ID"
3. Use this as `DISCORD_GUILD_ID`

## Role Permission Mapping

The system maps Discord roles to permission levels:

| Discord Role | Permission Level | Access |
|-------------|------------------|---------|
| Owner | `owner` | Full access to everything |
| Admin/Administrator | `admin` | Can manage categories, users, settings |
| Moderator/Mod | `moderator` | Can edit rules and moderate content |
| Staff/Helper/Support | `staff` | Can edit rules |
| Any other role | `user` | No staff panel access |

## Customizing Role Mappings

You can customize role mappings through the API:

```javascript
// Add or update role permission
POST /api/discord/role-permissions
{
  "roleName": "Senior Staff",
  "permission": "moderator"
}

// Remove role permission
DELETE /api/discord/role-permissions/Senior Staff

// Get all role permissions
GET /api/discord/role-permissions
```

## Testing the Setup

1. Start the server: `npm start`
2. Go to `http://localhost:3001/staff`
3. Click "Login with Discord"
4. Check the console logs to see your assigned permission level

## Troubleshooting

### Bot Not Connecting
- Verify `DISCORD_BOT_TOKEN` is correct
- Check bot has required permissions in your server
- Ensure `DISCORD_GUILD_ID` matches your server

### Permission Issues
- Check if your Discord role is mapped in the system
- Verify the bot can see your roles (check bot permissions)
- Look at console logs for role detection

### OAuth Issues
- Verify `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`
- Check redirect URL matches exactly
- Ensure Discord app has proper OAuth2 setup

## Security Notes

- Keep your bot token secret - never commit it to version control
- Use environment variables for all sensitive data
- Consider using role IDs instead of names for production (more stable)
- Regularly rotate your bot token and OAuth secrets 