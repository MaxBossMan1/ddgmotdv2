const { requireAdmin } = require('../../lib/auth');
const { getUsers, setUsers } = require('../../lib/kv');

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  return requireAdmin(req, res, async (req, res) => {
    try {
      const { discordId } = req.query;

      // Prevent users from deleting themselves
      if (discordId === req.user.discordId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Cannot delete yourself' 
        });
      }

      const users = await getUsers();
      const filteredUsers = users.filter(user => user.discordId !== discordId);

      if (filteredUsers.length === users.length) {
        return res.status(404).json({ 
          success: false, 
          error: 'User not found' 
        });
      }

      await setUsers(filteredUsers);

      res.json({ 
        success: true, 
        message: 'User deleted successfully' 
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete user' });
    }
  });
}