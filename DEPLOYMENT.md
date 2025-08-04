# Vercel Deployment Guide

This guide will help you deploy the DDG MOTD v2 application to Vercel with serverless functions.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel KV Database**: Create a KV database in your Vercel dashboard
3. **Discord OAuth App**: Set up a Discord application for authentication

## Setup Steps

### 1. Environment Variables

In your Vercel project settings, add these environment variables:

```
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=https://your-domain.vercel.app/api/auth/callback
JWT_SECRET=your_random_jwt_secret
```

### 2. Vercel KV Setup

1. Go to your Vercel dashboard
2. Navigate to Storage → Create Database → KV
3. Create a new KV database
4. Connect it to your project
5. The KV environment variables will be automatically added

### 3. Data Migration

Before deploying, run the migration script to transfer your existing data:

```bash
node migrate-data.js
```

### 4. Deploy

```bash
vercel --prod
```

## Important Notes

- **GMod Compatibility**: All existing API endpoints remain the same
- **MOTD URL**: `https://your-domain.vercel.app/motd`
- **Staff Dashboard**: `https://your-domain.vercel.app/staff`
- **API Endpoints**: All `/api/*` routes work identically to the Express version

## Troubleshooting

- Ensure all environment variables are set correctly
- Verify KV database is connected to your project
- Check Vercel function logs for any errors
- Make sure Discord OAuth redirect URI matches your domain

## GMod Integration

No changes needed to your GMod addon! The API endpoints remain exactly the same:
- `/api/rules` - Get rules data
- `/api/categories` - Get categories
- `/motd` - MOTD HTML page