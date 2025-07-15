const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;

const app = express();
const PORT = process.env.PORT || 3000;
const STEAM_API_KEY = process.env.STEAM_API_KEY || '5342416E0F6A68B894D89F5FFF53D496'; // You'll need to get this from Steam

// Middleware
app.use(cors({
    origin: `http://localhost:${PORT}`,
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'ddg-motd-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

// Serve public files
app.use(express.static(path.join(__dirname, 'public')));

// Staff panel routes
app.get('/staff/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'staff-login.html'));
});

app.get('/staff/dashboard', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'staff-dashboard.html'));
});

// For any other /staff/* routes, serve the dashboard if authenticated
app.get('/staff/*', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'staff-dashboard.html'));
});

// Data storage files
const RULES_FILE = path.join(__dirname, 'data', 'rules.txt');
const CATEGORIES_FILE = path.join(__dirname, 'data', 'categories.json');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}

// Steam Passport Strategy
passport.use(new SteamStrategy({
    returnURL: `http://localhost:${PORT}/auth/steam/return`,
    realm: `http://localhost:${PORT}/`,
    apiKey: STEAM_API_KEY
}, (identifier, profile, done) => {
    // Extract Steam ID from identifier
    const steamId = identifier.split('/').pop();
    
    // Check if user is authorized
    const users = readUsers();
    const authorizedUser = users.find(user => user.steamid === steamId);
    
    if (authorizedUser) {
        // Update display name from Steam profile
        authorizedUser.displayName = profile.displayName;
        authorizedUser.avatar = profile.photos[0]?.value;
        authorizedUser.lastLogin = new Date().toISOString();
        writeUsers(users);
        
        return done(null, authorizedUser);
    } else {
        return done(null, false, { message: 'Unauthorized Steam ID' });
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.steamid);
});

passport.deserializeUser((steamid, done) => {
    const users = readUsers();
    const user = users.find(u => u.steamid === steamid);
    done(null, user);
});

// Initialize default data if files don't exist
function initializeData() {
    if (!fs.existsSync(RULES_FILE)) {
        const defaultRules = `General Rules

1. Use common sense.
2. If you find yourself using a "loophole" in the rules to your advantage, it is likely you are breaking at least one other rule.
3. No politics, harassment, sexism, racism, discrimination, bigotry, porn, NSFW content, malicious behavior, etc.
4. Crossfire is counted as RDM.
5. Running into spawn to avoid any roleplay situation is considered FailRP.
6. No class can /advert murder or /advert counter.

Basing Rules

1. Individuals or groups may own one building and must own every door in that building; if a situation occurs where more than one person owns doors in a building, whoever owns the "front-doors" gains ownership of the building.
2. Your base has to be clear and concise.
   • No collided props, invisible props, One-way props of any kind not allowed. glow/flickering material(You may have no no collide crops if you are a Hobo w/out contraband.
   • You cannot force players to crouch, jump, or climb into your base (This includes world ladders).
   • You may only shoot out of shooting windows, not one-way props.
   • Only use materials that are easy on the eyes or transparent. Be fair or don't use them at all.
   • No traps, or mazes. This includes designs inhibiting the use of a fading door bomb (Floor falling out from under raiders, ramp only accessible with keypad cracker).
   • No builds that inhibit players walking/running speed.
3. No roof bases unless it is accessible.
4. You may have a KOS line + sign outside the entrance of your base. It must be noticeable. No tiny letters or hard to see colors. (Keep KOS reasons reasonable. no KOS **** cause I don't like him, etc)`;
        fs.writeFileSync(RULES_FILE, defaultRules);
    }
    
    if (!fs.existsSync(CATEGORIES_FILE)) {
        const defaultCategories = [
            { "id": "general", "name": "General Rules", "content": "<h2>General Rules</h2><ol><li>Use common sense.</li><li>If you find yourself using a 'loophole' in the rules to your advantage, it is likely you are breaking at least one other rule.</li><li>No politics, harassment, sexism, racism, discrimination, bigotry, porn, NSFW content, malicious behavior, etc.</li><li>Crossfire is counted as RDM.</li><li>Running into spawn to avoid any roleplay situation is considered FailRP.</li><li>No class can /advert murder or /advert counter.</li></ol>" },
            { "id": "basing", "name": "Basing Rules", "content": "<h2>Basing Rules</h2><ol><li>Individuals or groups may own one building and must own every door in that building; if a situation occurs where more than one person owns doors in a building, whoever owns the 'front-doors' gains ownership of the building.</li><li>Your base has to be clear and concise.</li></ol>" },
            { "id": "escaping", "name": "Escaping/Break in Rules", "content": "<h2>Escaping/Break in Rules</h2><p>Content to be added...</p>" },
            { "id": "hit-kidnap", "name": "Hit, Kidnap, Mugging, and Pick-Pocketing rules.", "content": "<h2>Hit, Kidnap, Mugging, and Pick-Pocketing rules</h2><p>Content to be added...</p>" },
            { "id": "raiding", "name": "Raiding Rules", "content": "<h2>Raiding Rules</h2><p>Content to be added...</p>" },
            { "id": "pd-tower", "name": "PD/Tower Raids", "content": "<h2>PD/Tower Raids</h2><p>Content to be added...</p>" },
            { "id": "specific-job", "name": "Specific Job Rules", "content": "<h2>Specific Job Rules</h2><p>Content to be added...</p>" },
            { "id": "citizen", "name": "Citizen Rules", "content": "<h2>Citizen Rules</h2><p>Content to be added...</p>" },
            { "id": "gang", "name": "Gang Rules", "content": "<h2>Gang Rules</h2><p>Content to be added...</p>" },
            { "id": "printer", "name": "Printer/Bitcoin Rules", "content": "<h2>Printer/Bitcoin Rules</h2><p>Content to be added...</p>" },
            { "id": "rioting", "name": "Rioting Rules", "content": "<h2>Rioting Rules</h2><p>Content to be added...</p>" },
            { "id": "lockdown", "name": "Lockdown Rules", "content": "<h2>Lockdown Rules</h2><p>Content to be added...</p>" },
            { "id": "correctional", "name": "Correctional Staff Rules", "content": "<h2>Correctional Staff Rules</h2><p>Content to be added...</p>" },
            { "id": "casino", "name": "Casino Rules", "content": "<h2>Casino Rules</h2><p>Content to be added...</p>" },
            { "id": "rp-custom", "name": "RP Custom Class Rules", "content": "<h2>RP Custom Class Rules</h2><p>Content to be added...</p>" },
            { "id": "donator", "name": "Donator Custom Jobs", "content": "<h2>Donator Custom Jobs</h2><p>Content to be added...</p>" },
            { "id": "ddg", "name": "DDG Staff Rules", "content": "<h2>DDG Staff Rules</h2><p>Content to be added...</p>" },
            { "id": "punishments", "name": "Punishments & Ban Times", "content": "<h2>Punishments & Ban Times</h2><p>Content to be added...</p>" }
        ];
        fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(defaultCategories, null, 2));
    }
}

// Helper function to read categories
function readCategories() {
    try {
        return JSON.parse(fs.readFileSync(CATEGORIES_FILE, 'utf8'));
    } catch (error) {
        return [];
    }
}

// Helper function to write categories
function writeCategories(categories) {
    fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(categories, null, 2));
}

// Helper function to read users
function readUsers() {
    try {
        return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    } catch (error) {
        return [];
    }
}

// Helper function to write users
function writeUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ success: false, error: 'Authentication required' });
}

// API Routes

// Authentication Routes
app.get('/auth/steam', passport.authenticate('steam'));

app.get('/auth/steam/return', 
    passport.authenticate('steam', { failureRedirect: '/staff/login?error=unauthorized' }),
    (req, res) => {
        res.redirect('/staff/dashboard');
    }
);

app.get('/auth/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ success: false, error: 'Logout failed' });
        }
        res.redirect('/staff/login');
    });
});

app.get('/auth/user', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ success: true, user: req.user });
    } else {
        res.json({ success: false, user: null });
    }
});

// User Management Routes (Protected)
app.get('/api/users', requireAuth, (req, res) => {
    try {
        const users = readUsers();
        // Remove sensitive information
        const safeUsers = users.map(user => ({
            steamid: user.steamid,
            displayName: user.displayName,
            role: user.role,
            addedBy: user.addedBy,
            addedAt: user.addedAt,
            lastLogin: user.lastLogin,
            avatar: user.avatar
        }));
        res.json({ success: true, users: safeUsers });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to read users' });
    }
});

app.post('/api/users', requireAuth, (req, res) => {
    try {
        const { steamid, displayName, role } = req.body;
        if (!steamid || !displayName) {
            return res.status(400).json({ success: false, error: 'Steam ID and display name are required' });
        }
        
        const users = readUsers();
        
        // Check if user already exists
        if (users.find(user => user.steamid === steamid)) {
            return res.status(400).json({ success: false, error: 'User already exists' });
        }
        
        const newUser = {
            steamid: steamid,
            displayName: displayName,
            role: role || 'staff',
            addedBy: req.user.steamid,
            addedAt: new Date().toISOString()
        };
        
        users.push(newUser);
        writeUsers(users);
        
        res.json({ success: true, message: 'User added successfully', user: newUser });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to add user' });
    }
});

app.delete('/api/users/:steamid', requireAuth, (req, res) => {
    try {
        const steamid = req.params.steamid;
        
        // Prevent users from deleting themselves
        if (steamid === req.user.steamid) {
            return res.status(400).json({ success: false, error: 'Cannot delete yourself' });
        }
        
        const users = readUsers();
        const filteredUsers = users.filter(user => user.steamid !== steamid);
        
        if (filteredUsers.length === users.length) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        writeUsers(filteredUsers);
        
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete user' });
    }
});

// Get rules content (for GMod MOTD)
app.get('/api/rules', (req, res) => {
    try {
        const rules = fs.readFileSync(RULES_FILE, 'utf8');
        res.json({ success: true, content: rules });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to read rules' });
    }
});

// Get categories (for GMod MOTD and staff panel)
app.get('/api/categories', (req, res) => {
    try {
        const categories = readCategories();
        res.json({ success: true, categories });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to read categories' });
    }
});

// Create new category (for staff panel)
app.post('/api/categories', requireAuth, (req, res) => {
    try {
        const { name, id } = req.body;
        if (!name || !id) {
            return res.status(400).json({ success: false, error: 'Name and ID are required' });
        }
        
        const categories = readCategories();
        
        // Check if ID already exists
        if (categories.find(cat => cat.id === id)) {
            return res.status(400).json({ success: false, error: 'Category ID already exists' });
        }
        
        const newCategory = {
            id: id,
            name: name,
            content: `<h2>${name}</h2><p>Content to be added...</p>`
        };
        
        categories.push(newCategory);
        writeCategories(categories);
        
        res.json({ success: true, message: 'Category created successfully', category: newCategory });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to create category' });
    }
});

// Update specific category (for staff panel)
app.put('/api/categories/:id', requireAuth, (req, res) => {
    try {
        const categoryId = req.params.id;
        const { name, content } = req.body;
        
        const categories = readCategories();
        const categoryIndex = categories.findIndex(cat => cat.id === categoryId);
        
        if (categoryIndex === -1) {
            return res.status(404).json({ success: false, error: 'Category not found' });
        }
        
        if (name) categories[categoryIndex].name = name;
        if (content) categories[categoryIndex].content = content;
        
        writeCategories(categories);
        
        res.json({ success: true, message: 'Category updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to update category' });
    }
});

// Delete specific category (for staff panel)
app.delete('/api/categories/:id', requireAuth, (req, res) => {
    try {
        const categoryId = req.params.id;
        
        const categories = readCategories();
        const filteredCategories = categories.filter(cat => cat.id !== categoryId);
        
        if (filteredCategories.length === categories.length) {
            return res.status(404).json({ success: false, error: 'Category not found' });
        }
        
        writeCategories(filteredCategories);
        
        res.json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete category' });
    }
});

// Update rules content (for staff panel)
app.post('/api/rules', requireAuth, (req, res) => {
    try {
        const { content } = req.body;
        if (!content) {
            return res.status(400).json({ success: false, error: 'Content is required' });
        }
        fs.writeFileSync(RULES_FILE, content);
        res.json({ success: true, message: 'Rules updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to update rules' });
    }
});

// Redirect /staff to /staff/login
app.get('/staff', (req, res) => {
    res.redirect('/staff/login');
});

// Serve MOTD HTML (for GMod)
app.get('/motd', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'motd.html'));
});

// Initialize data and start server
initializeData();

app.listen(PORT, () => {
    console.log(`DDG MOTD Server running on port ${PORT}`);
    console.log(`MOTD URL: http://localhost:${PORT}/motd`);
    console.log(`Staff Panel: http://localhost:${PORT}/staff`);
});