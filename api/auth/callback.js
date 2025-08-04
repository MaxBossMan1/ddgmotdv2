const { getUsers, setUsers } = require('../../lib/kv');
const { generateToken } = require('../../lib/auth');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, error } = req.query;

  if (error) {
    return res.redirect('/staff/login?error=access_denied');
  }

  if (!code) {
    return res.redirect('/staff/login?error=no_code');
  }

  try {
    const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
    const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
    const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/api/auth/callback';

    if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
      return res.redirect('/staff/login?error=config_error');
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      return res.redirect('/staff/login?error=token_exchange_failed');
    }

    const tokenData = await tokenResponse.json();
    const { access_token } = tokenData;

    // Get user info from Discord
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!userResponse.ok) {
      return res.redirect('/staff/login?error=user_fetch_failed');
    }

    const discordUser = await userResponse.json();
    const discordId = discordUser.id;

    // Check if user is authorized
    const users = await getUsers();
    const authorizedUser = users.find(user => user.discordId === discordId);

    if (!authorizedUser) {
      return res.redirect('/staff/login?error=unauthorized');
    }

    // Update user info
    authorizedUser.displayName = discordUser.username;
    authorizedUser.avatar = discordUser.avatar 
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : null;
    authorizedUser.lastLogin = new Date().toISOString();

    await setUsers(users);

    // Generate JWT token
    const token = generateToken(authorizedUser);

    // Set cookie and redirect
    res.setHeader('Set-Cookie', [
      `auth-token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    ]);

    res.redirect('/staff/dashboard');
  } catch (error) {
    console.error('Auth callback error:', error);
    res.redirect('/staff/login?error=server_error');
  }
}