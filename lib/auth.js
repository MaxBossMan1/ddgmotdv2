const jwt = require('jsonwebtoken');
const { getUsers } = require('./kv');

const JWT_SECRET = process.env.JWT_SECRET || 'ddg-motd-secret-key-change-in-production';

// Generate JWT token for user
function generateToken(user) {
  return jwt.sign(
    {
      discordId: user.discordId,
      displayName: user.displayName,
      role: user.role,
      avatar: user.avatar
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Extract token from request
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Also check cookies for browser requests
  const cookies = req.headers.cookie;
  if (cookies) {
    const tokenMatch = cookies.match(/auth-token=([^;]+)/);
    if (tokenMatch) {
      return tokenMatch[1];
    }
  }
  
  return null;
}

// Middleware function for API routes
async function requireAuth(req, res, handler) {
  const token = extractToken(req);
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
  
  // Verify user still exists and is active
  const users = await getUsers();
  const user = users.find(u => u.discordId === decoded.discordId);
  
  if (!user) {
    return res.status(401).json({ success: false, error: 'User not found' });
  }
  
  // Add user to request object
  req.user = user;
  
  // Call the actual handler
  return handler(req, res);
}

// Check if user is admin
function requireAdmin(req, res, handler) {
  return requireAuth(req, res, (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    return handler(req, res);
  });
}

module.exports = {
  generateToken,
  verifyToken,
  extractToken,
  requireAuth,
  requireAdmin
};