const fs = require('fs').promises;
const path = require('path');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Read the MOTD HTML file
    const motdPath = path.join(process.cwd(), 'motd.html');
    const motdContent = await fs.readFile(motdPath, 'utf8');
    
    // Set appropriate headers for HTML content
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(motdContent);
  } catch (error) {
    console.error('MOTD error:', error);
    res.status(500).json({ error: 'Failed to load MOTD' });
  }
}