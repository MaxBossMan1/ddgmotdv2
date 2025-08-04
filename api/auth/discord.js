export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/api/auth/callback';

  if (!DISCORD_CLIENT_ID) {
    return res.status(500).json({ error: 'Discord client ID not configured' });
  }

  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?` +
    `client_id=${DISCORD_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
    `response_type=code&` +
    `scope=identify`;

  res.redirect(discordAuthUrl);
}