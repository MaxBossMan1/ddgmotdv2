const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_PORT = process.env.BACKEND_PORT || 3001;

// Serve static files (frontend)
app.use(express.static(path.join(__dirname)));

// Proxy API requests to backend
app.use('/api', createProxyMiddleware({
    target: `http://localhost:${BACKEND_PORT}`,
    changeOrigin: true,
    onError: (err, req, res) => {
        console.log('Backend proxy error:', err.message);
        res.status(503).json({ 
            error: 'Backend service unavailable', 
            message: 'Make sure the backend server is running on port ' + BACKEND_PORT 
        });
    }
}));

// Fallback: serve index.html for any non-API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 MOTD System running on http://localhost:${PORT}`);
    console.log(`📁 Serving frontend files from: ${__dirname}`);
    console.log(`🔄 Proxying API requests to backend on port: ${BACKEND_PORT}`);
    console.log(`\n⚠️  Make sure to start the backend server separately:`);
    console.log(`   cd backend && npm install && npm start`);
    console.log(`\n🎮 GMod-compatible frontend with ultra-compatible JavaScript!`);
});

// Handle server shutdown gracefully
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down MOTD System...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down MOTD System...');
    process.exit(0);
}); 