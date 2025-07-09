# GMod MOTD System with Backend Integration

A comprehensive MOTD (Message of the Day) system for DarkRP servers with full backend integration, designed specifically for GMod's non-Chromium browser compatibility.

## Features

- **🎮 GMod Compatible**: Uses only traditional JavaScript (no ES6) with synchronous XMLHttpRequest
- **📊 Backend Integration**: Full API integration with user management, analytics, and rule versioning
- **🔍 Smart Search**: Real-time rule searching with fallback support
- **👥 Staff Panel**: Rich text editor for rule management with authentication
- **📱 Responsive Design**: Works on all screen sizes
- **🔄 Real-time Updates**: Live rule updates (with fallback for older browsers)
- **🛡️ Security**: JWT authentication with role-based permissions
- **📈 Analytics**: Track user interactions and rule usage

## Quick Start

### 1. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
```

### 2. Configure Database

```bash
# Copy and edit the database configuration
cd backend
cp config/database.js.example config/database.js
# Edit database.js with your MySQL credentials
```

### 3. Run the System

```bash
# Terminal 1: Start the backend server
cd backend
npm start

# Terminal 2: Start the frontend server
npm start
```

### 4. Access the System

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **Staff Panel**: Click "Staff Panel" button (default password: `staff123`)

## Configuration

### Frontend Configuration

The frontend automatically connects to the backend API. If you need to change the API endpoint, edit `script.js`:

```javascript
var apiBaseUrl = '/api'; // Change this if backend runs on different port
```

### Backend Configuration

Edit `backend/config/database.js` for database settings:

```javascript
module.exports = {
  development: {
    username: 'your_username',
    password: 'your_password',
    database: 'motd_system',
    host: 'localhost',
    dialect: 'mysql'
  }
};
```

## GMod Integration

### For GMod Server Owners

1. **Upload Files**: Upload the entire system to your web server
2. **Set MOTD URL**: Point your `motd_url` to `http://yourserver.com:3000`
3. **Database Setup**: Configure MySQL database for rule storage
4. **Staff Access**: Share the staff panel password with your staff team

### Browser Compatibility

This system is specifically designed for GMod's non-Chromium browser:

- ✅ **Traditional JavaScript**: No ES6 features that might break
- ✅ **Synchronous Requests**: No async/await or promises
- ✅ **Old DOM Methods**: Uses `document.getElementById` and traditional event handling
- ✅ **Fallback Support**: Works even if backend API is unavailable

### Example GMod Configuration

```lua
-- In your DarkRP configuration
motd_url = "http://yourserver.com:3000"
motd_silkicons = true
```

## API Endpoints

### Rules API
- `GET /api/rules` - Get all rules
- `GET /api/rules/categories` - Get rule categories
- `GET /api/rules/search?q=term` - Search rules
- `POST /api/rules` - Create/update rule (requires auth)

### Authentication API
- `POST /api/auth/login` - Staff login
- `GET /api/auth/verify` - Verify token

### Analytics API
- `GET /api/analytics/dashboard` - Get analytics data
- `POST /api/analytics/track` - Track user interaction

## Staff Panel Features

- **Rich Text Editor**: Full WYSIWYG editor for rule creation
- **Category Management**: Create and organize rule categories
- **Rule Versioning**: Track changes to rules over time
- **User Management**: Manage staff permissions
- **Analytics Dashboard**: View rule usage statistics

## Troubleshooting

### Backend Not Starting
```bash
# Check if MySQL is running
sudo service mysql status

# Check if database exists
mysql -u root -p
CREATE DATABASE motd_system;
```

### Frontend Not Loading Rules
1. Check if backend is running on port 3001
2. Verify database connection in backend logs
3. Check browser console for API errors

### GMod Browser Issues
1. Ensure no ES6 features are used in JavaScript
2. Test with Internet Explorer 8+ for compatibility
3. Check that all API calls are synchronous

## Development

### File Structure
```
/
├── index.html          # Main frontend page
├── styles.css          # GMod-compatible styles
├── script.js           # Ultra-compatible JavaScript
├── server.js           # Frontend server with API proxy
├── package.json        # Frontend dependencies
└── backend/            # Backend API system
    ├── server.js       # Express server
    ├── models/         # Database models
    ├── routes/         # API routes
    └── config/         # Configuration files
```

### Adding New Features

1. **Frontend**: Add to `script.js` using traditional JavaScript only
2. **Backend**: Add routes to `backend/routes/` directory
3. **Database**: Add models to `backend/models/` directory

## License

MIT License - Feel free to use and modify for your server! 