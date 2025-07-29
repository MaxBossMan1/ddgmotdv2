# DigitalDeltaGaming - Server Rules Addon

A professional GMod addon that displays server rules in a modern UI that matches your website design.

## Features

- **Modern UI Design** - Matches your website's dark theme and layout
- **Backend Integration** - Loads rules from your API at `http://34.69.68.239/api/rules`
- **Automatic Display** - Shows to players when they join the server
- **Interactive Navigation** - Sidebar with different rule categories
- **Responsive Design** - Adapts to different screen sizes
- **Fallback Content** - Shows default rules if backend is unavailable

## Installation

### Method 1: Direct Server Installation
1. Copy the `gmod-addon` folder to your GMod server
2. Rename it to `ddg-motd` 
3. Place it in: `garrysmod/addons/ddg-motd/`
4. Restart your server

### Method 2: Workshop Upload
1. Copy the addon folder to: `GarrysMod/garrysmod/addons/`
2. Use GMod's built-in workshop uploader
3. Subscribe players to the workshop addon

## Usage

### Automatic Display
- Players will see the MOTD 2 seconds after joining the server

### Manual Commands
- **Chat Commands**: `!motd`, `/motd`, `!rules`, `/rules`
- **Console Command**: `ddg_motd`

### Admin Commands
- Server console: `ddg_motd` (to test the UI)

## Customization

### Colors
Edit the `colors` table in `lua/autorun/client/cl_motd.lua`:
```lua
local colors = {
    background = Color(44, 62, 80),     -- Main background
    sidebar = Color(52, 73, 94),        -- Sidebar background
    accent = Color(52, 152, 219),       -- Blue accent color
    text = Color(236, 240, 241),        -- Main text
    textSecondary = Color(189, 195, 199) -- Secondary text
}
```

### Backend URL
Change the API URL in the `LoadRulesData()` function:
```lua
url = "http://your-server.com/api/rules",
```

### Navigation Items
Modify the `navItems` table to add/remove categories:
```lua
local navItems = {
    {id = "general", title = "General", subtitle = "DOs & DONTs"},
    {id = "nlr", title = "NLR", subtitle = "Example of NLR & cooldown timers"},
    -- Add more categories here
}
```

## API Integration

The addon expects your backend API to return JSON in this format:
```json
{
    "rules": [
        {
            "category": "general",
            "title": "General Rules - DOs & DONTs",
            "description": "Basic server rules and guidelines for all players",
            "content": "Rule content here..."
        }
    ]
}
```

## Troubleshooting

### MOTD Not Showing
1. Check server console for errors
2. Verify the addon is in the correct folder
3. Ensure players have the addon downloaded

### Backend Connection Issues
1. Check if your API URL is accessible
2. Verify the JSON response format
3. Check server console for HTTP errors

### UI Issues
1. Try different screen resolutions
2. Check for conflicting addons
3. Verify GMod client is up to date

## File Structure
```
ddg-motd/
├── addon.json
├── lua/
│   └── autorun/
│       ├── server/
│       │   └── sv_motd.lua
│       └── client/
│           └── cl_motd.lua
└── README.md
```

## Support

For issues or customization requests, contact the development team. 