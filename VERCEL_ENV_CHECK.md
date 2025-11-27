# Vercel Environment Variables Checklist

## ✅ Required Variables (Set in Vercel Dashboard)

Go to: **Project Settings > Environment Variables**

### 1. Database Connection
**Variable Name:** `MONGODB_URI` (NOT `MONGO_URI`)
**Value:** Your MongoDB Atlas connection string
**Example:** `mongodb+srv://username:password@cluster.mongodb.net/screen-monitoring`

**⚠️ IMPORTANT:** 
- Variable name MUST be `MONGODB_URI` (exact match)
- Use MongoDB Atlas connection string (not localhost)
- Make sure your IP is whitelisted in MongoDB Atlas (or use 0.0.0.0/0 for all IPs)

### 2. JWT Secret
**Variable Name:** `JWT_SECRET`
**Value:** A strong random string (minimum 32 characters)
**Generate:** `openssl rand -base64 32`

### 3. Application URLs
**Variable Name:** `NEXT_PUBLIC_APP_URL`
**Value:** `https://screen-linker.vercel.app`

**Variable Name:** `NEXT_PUBLIC_SOCKET_URL`
**Value:** `https://screen-linker.vercel.app` (or your Socket.IO server URL if separate)

### 4. Node Environment
**Variable Name:** `NODE_ENV`
**Value:** `production`

### 5. JWT Expiration (Optional)
**Variable Name:** `JWT_EXPIRES_IN`
**Value:** `7d`

## ❌ Do NOT Set These (Vercel handles automatically)
- `HOSTNAME` - Leave empty or don't set
- `PORT` - Leave empty or don't set

## 🔍 How to Verify

1. Go to Vercel Dashboard > Your Project > Settings > Environment Variables
2. Check that `MONGODB_URI` exists (not `MONGO_URI`)
3. Make sure it's set for **Production** environment
4. Redeploy after adding variables

## 🐛 Troubleshooting

If you see: `connect ECONNREFUSED 127.0.0.1:27017`
- This means `MONGODB_URI` is not set or not being read
- Check variable name is exactly `MONGODB_URI`
- Make sure it's set for the correct environment (Production)
- Redeploy after adding the variable
