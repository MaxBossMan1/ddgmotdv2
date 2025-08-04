const { requireAuth } = require('../../lib/auth');
const { getUsers, setUsers } = require('../../lib/kv');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return requireAuth(req, res, async (req, res) => {
      try {
        const users = await getUsers();
        // Remove sensitive information
        const safeUsers = users.map(user => ({
          discordId: user.discordId,
          displayName: user.displayName,
          role: user.role,
          addedBy: user.addedBy,
          addedAt: user.addedAt,
          lastLogin: user.lastLogin,
          avatar: user.avatar
        }));
        res.json({ success: true, users: safeUsers });
      } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ success: false, error: 'Failed to read users' });
      }
    });
  }
  
  if (req.method === 'POST') {
    return requireAuth(req, res, async (req, res) => {
      try {
        const { discordId, displayName, role } = req.body;
        
        if (!discordId || !displayName) {
          return res.status(400).json({ 
            success: false, 
            error: 'Discord ID and display name are required' 
          });
        }

        const users = await getUsers();

        // Check if user already exists
        if (users.find(user => user.discordId === discordId)) {
          return res.status(400).json({ 
            success: false, 
            error: 'User already exists' 
          });
        }

        const newUser = {
          discordId: discordId,
          displayName: displayName,
          role: role || 'staff',
          addedBy: req.user.discordId,
          addedAt: new Date().toISOString()
        };

        users.push(newUser);
        await setUsers(users);

        res.json({ 
          success: true, 
          message: 'User added successfully', 
          user: newUser 
        });
      } catch (error) {
        console.error('Add user error:', error);
        res.status(500).json({ success: false, error: 'Failed to add user' });
      }
    });
  }
  
  res.status(405).json({ error: 'Method not allowed' });
}