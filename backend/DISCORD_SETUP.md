# Discord OAuth Setup

## Prerequisites

1. Create a Discord application at https://discord.com/developers/applications
2. Get your Client ID and Client Secret
3. Set up the redirect URI

## Environment Variables

Add these to your `.env` file:

```env
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
DISCORD_CALLBACK_URL=http://localhost:3001/api/auth/discord/callback
```

## Discord Application Setup

1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name your application (e.g., "GMod Rules System")
4. Go to "OAuth2" section
5. Copy the "Client ID" and "Client Secret"
6. In "Redirects", add: `http://localhost:3001/api/auth/discord/callback`
7. In "Scopes", select: `identify` and `email`

## Frontend Integration

The frontend can now use these endpoints:

- `GET /api/auth/discord` - Redirect to Discord OAuth
- `POST /api/auth/discord-login` - Direct API login with Discord data

## Testing

1. Start the backend server
2. Visit `http://localhost:3001/api/auth/discord`
3. You should be redirected to Discord login
4. After authorization, you'll be redirected back to the frontend

## Production Setup

For production, update the callback URL to your production domain:
```env
DISCORD_CALLBACK_URL=https://yourdomain.com/api/auth/discord/callback
```

And update the Discord application's redirect URI accordingly. 