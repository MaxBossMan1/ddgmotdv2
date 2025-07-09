const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const { createServer } = require('http');
const { Server } = require('socket.io');
const winston = require('winston');
const cron = require('node-cron');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const { sequelize } = require('./models');
const authRoutes = require('./routes/auth');
const rulesRoutes = require('./routes/rules');
const usersRoutes = require('./routes/users');
const analyticsRoutes = require('./routes/analytics');
const gmodRoutes = require('./routes/gmod');
const discordRoutes = require('./routes/discord');
const { authenticateSocket } = require('./middleware/auth');
const discordBot = require('./services/discordBot');

// Initialize Express app
const app = express();
app.set('trust proxy', 1); // Trust first proxy (nginx)
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [`http://localhost:${process.env.PORT || 3001}`, "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Session store
const sessionStore = new SequelizeStore({
  db: sequelize,
  expiration: 24 * 60 * 60 * 1000 // 24 hours
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts for GMod compatibility
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors({
  origin: [`http://localhost:${process.env.PORT || 3001}`, "http://localhost:3000"],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(limiter);

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Static files
app.use('/uploads', express.static('uploads'));
app.use('/resources', express.static(path.join(__dirname, '..', 'resources')));

// Serve main MOTD files
app.use('/', express.static(path.join(__dirname, '..'), {
  index: false // Don't auto-serve index.html
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rules', rulesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/gmod', gmodRoutes);
app.use('/api/discord', discordRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Route for main MOTD page (GMod compatible)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Route for staff panel
app.get('/staff', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'staff.html'));
});

// WebSocket connection handling
io.use(authenticateSocket);

io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.user.username} (${socket.user.id})`);
  
  // Join user to their role room for targeted updates
  socket.join(`role_${socket.user.role}`);
  socket.join(`user_${socket.user.id}`);
  
  // Handle real-time events
  socket.on('join_room', (room) => {
    socket.join(room);
    logger.info(`User ${socket.user.username} joined room: ${room}`);
  });
  
  socket.on('leave_room', (room) => {
    socket.leave(room);
    logger.info(`User ${socket.user.username} left room: ${room}`);
  });
  
  socket.on('rule_update', (data) => {
    // Broadcast rule updates to all connected clients
    socket.broadcast.emit('rule_updated', {
      ruleId: data.ruleId,
      updatedBy: socket.user.username,
      timestamp: new Date().toISOString()
    });
  });
  
  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.user.username}`);
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Global error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// Catch-all handler - serve main page for any unmatched routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Scheduled tasks
cron.schedule('0 0 * * *', () => {
  logger.info('Running daily cleanup tasks...');
  // Clean up old sessions, analytics data, etc.
});

cron.schedule('*/5 * * * *', () => {
  // Update GMod server status every 5 minutes
  // This would ping your GMod server for live data
});

// Database connection and server startup
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');
    
    // Sync database models
    await sequelize.sync();
    logger.info('Database synchronized successfully.');
    
    // Create session store table
    await sessionStore.sync();
    
    // Start server
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Main MOTD available at: http://localhost:${PORT}`);
      logger.info(`Staff Panel available at: http://localhost:${PORT}/staff`);
    });
    
  } catch (error) {
    logger.error('Unable to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
});

startServer();

module.exports = { app, io, logger }; 