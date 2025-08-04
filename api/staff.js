export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Redirect to staff dashboard
  res.redirect(302, '/staff.html');
}