const { requireAuth, requireAdmin } = require('../../lib/auth');
const { getCategories, setCategories } = require('../../lib/kv');

export default async function handler(req, res) {
  const { id } = req.query;
  
  if (req.method === 'PUT') {
    return requireAuth(req, res, async (req, res) => {
      try {
        const { name, content } = req.body;
        
        if (!name && !content) {
          return res.status(400).json({ 
            success: false, 
            error: 'Name or content is required' 
          });
        }

        const categories = await getCategories();
        const categoryIndex = categories.findIndex(cat => cat.id === id);

        if (categoryIndex === -1) {
          return res.status(404).json({ 
            success: false, 
            error: 'Category not found' 
          });
        }

        // Update category
        if (name) categories[categoryIndex].name = name;
        if (content) categories[categoryIndex].content = content;

        await setCategories(categories);

        res.json({ 
          success: true, 
          message: 'Category updated successfully', 
          category: categories[categoryIndex] 
        });
      } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({ success: false, error: 'Failed to update category' });
      }
    });
  }
  
  if (req.method === 'DELETE') {
    return requireAdmin(req, res, async (req, res) => {
      try {
        const categories = await getCategories();
        const filteredCategories = categories.filter(cat => cat.id !== id);

        if (filteredCategories.length === categories.length) {
          return res.status(404).json({ 
            success: false, 
            error: 'Category not found' 
          });
        }

        await setCategories(filteredCategories);

        res.json({ 
          success: true, 
          message: 'Category deleted successfully' 
        });
      } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete category' });
      }
    });
  }
  
  res.status(405).json({ error: 'Method not allowed' });
}