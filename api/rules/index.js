const { requireAuth } = require('../../lib/auth');
const { getRules, setRules } = require('../../lib/kv');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Public endpoint - no auth required for GMod compatibility
    try {
      const rules = await getRules();
      res.json({ success: true, rules });
    } catch (error) {
      console.error('Get rules error:', error);
      res.status(500).json({ success: false, error: 'Failed to read rules' });
    }
    return;
  }
  
  if (req.method === 'PUT') {
    return requireAuth(req, res, async (req, res) => {
      try {
        const { rules } = req.body;
        
        if (!rules) {
          return res.status(400).json({ 
            success: false, 
            error: 'Rules content is required' 
          });
        }

        await setRules(rules);

        res.json({ 
          success: true, 
          message: 'Rules updated successfully', 
          rules 
        });
      } catch (error) {
        console.error('Update rules error:', error);
        res.status(500).json({ success: false, error: 'Failed to update rules' });
      }
    });
  }
  
  res.status(405).json({ error: 'Method not allowed' });
}