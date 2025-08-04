const { requireAuth } = require('../../lib/auth');
const { getCategories, setCategories } = require('../../lib/kv');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Public endpoint - no auth required for GMod compatibility
    try {
      const categories = await getCategories();
      res.json({ success: true, categories });
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({ success: false, error: 'Failed to read categories' });
    }
    return;
  }
  
  if (req.method === 'POST') {
    return requireAuth(req, res, async (req, res) => {
      try {
        const { name, id } = req.body;
        
        if (!name || !id) {
          return res.status(400).json({ 
            success: false, 
            error: 'Name and ID are required' 
          });
        }

        const categories = await getCategories();

        // Check if ID already exists
        if (categories.find(cat => cat.id === id)) {
          return res.status(400).json({ 
            success: false, 
            error: 'Category ID already exists' 
          });
        }

        const newCategory = {
          id: id,
          name: name,
          content: `<h2>${name}</h2><p>Content to be added...</p>`
        };

        categories.push(newCategory);
        await setCategories(categories);

        res.json({ 
          success: true, 
          message: 'Category created successfully', 
          category: newCategory 
        });
      } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({ success: false, error: 'Failed to create category' });
      }
    });
  }
  
  res.status(405).json({ error: 'Method not allowed' });
}