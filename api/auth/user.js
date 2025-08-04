const { extractToken, verifyToken } = require('../../lib/auth');
const { getUsers } = require('../../lib/kv');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = extractToken(req);
    
    if (!token) {
      return res.json({ success: false, user: null });
    }
    
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.json({ success: false, user: null });
    }
    
    // Verify user still exists
    const users = await getUsers();
    const user = users.find(u => u.discordId === decoded.discordId);
    
    if (!user) {
      return res.json({ success: false, user: null });
    }
    
    // Return user info (without sensitive data)
    const safeUser = {
      discordId: user.discordId,
      displayName: user.displayName,
      role: user.role,
      avatar: user.avatar,
      lastLogin: user.lastLogin
    };
    
    res.json({ success: true, user: safeUser });
  } catch (error) {
    console.error('User info error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
}