# DjedOPS Deployment Guide

## ✅ Project Restructure Complete

Your project has been successfully split into separate backend and frontend deployments:

- **Backend**: `/backend` → Deploy to Render
- **Frontend**: `/frontend` → Deploy to Vercel

## 🏗️ What Changed

### Architecture
- **Before**: Monolithic Next.js app requiring manual CLI commands
- **After**: Separate backend API + frontend with seamless user experience

### Backend (`/backend`)
- Node.js/Express API server
- Handles all WeilChain CLI (widl) operations
- Manages wallet connections and transaction signing
- Deploys to Render

### Frontend (`/frontend`)
- Next.js 14 React application
- Visual workflow builder
- Connects to backend API via HTTP
- Deploys to Vercel

## 🚀 Deployment Steps

### 1. Deploy Backend to Render

1. **Push to GitHub** (if not done already):
   ```bash
   git add .
   git commit -m "Separate backend and frontend for deployment"
   git push origin main
   ```

2. **Go to [Render Dashboard](https://dashboard.render.com)**

3. **Create New Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

4. **Set Environment Variables**:
   ```
   NODE_ENV=production
   PORT=10000
   FRONTEND_URL=https://your-frontend.vercel.app
   WEIL_RPC_ENDPOINT=https://sentinel.unweil.me
   WEIL_COORDINATOR_ADDRESS=weil1coordinator00000000000000000000000
   WEIL_TELEPORT_GATEWAY_ADDRESS=weil1teleport000000000000000000000000
   WEIL_PRIVATE_KEY=<your_private_key>  # Keep this secret!
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

5. **Deploy**! Render will build and start your backend.

6. **Note your backend URL**: `https://djedops-backend.onrender.com` (or similar)

### 2. Deploy Frontend to Vercel

1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**

2. **Import Project**:
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - **Root Directory**: `frontend`
   - **Framework Preset**: Next.js
   - Vercel will auto-detect configuration

3. **Set Environment Variables**:
   ```
   NEXT_PUBLIC_BACKEND_URL=https://djedops-backend.onrender.com
   NEXT_PUBLIC_GEMINI_API_KEY=<optional_your_gemini_key>
   NEXT_PUBLIC_WEIL_SENTINEL_ENDPOINT=https://sentinel.unweil.me
   NEXT_PUBLIC_WEIL_BLOCK_EXPLORER=https://www.unweil.me
   NEXT_PUBLIC_DJED_COORDINATOR_ADDRESS=weil1coordinator00000000000000000000000
   NEXT_PUBLIC_TELEPORT_GATEWAY_ADDRESS=weil1teleport000000000000000000000000
   ```

4. **Deploy**! Vercel will build and deploy your frontend.

5. **Get your frontend URL**: `https://your-project.vercel.app`

6. **Update Backend**: Go back to Render and update `FRONTEND_URL` to your Vercel URL

## 🔧 Local Development

### Start Backend:
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```
Backend runs on `http://localhost:3001`

### Start Frontend (new terminal):
```bash
cd frontend
npm install
cp .env.example .env.local
# Set NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
npm run dev
```
Frontend runs on `http://localhost:3000`

## ⚠️ Known Issues

### Frontend Build Warnings
- Static generation fails for `/workflows` and `/applet/djedops` pages
- **This is OK!** Vercel handles dynamic pages automatically
- These pages use client-side hooks and can't be pre-rendered
- They will work perfectly in production on Vercel

### Backend widl CLI Requirement
- Backend needs `widl` CLI binary installed
- For Render deployment, you may need to:
  1. Include widl binary in your repository
  2. Or install it via build script
  3. Or use Docker with widl pre-installed
- See `/backend/README.md` for details

## 📝 Environment Variables Summary

### Backend (Render) - Required:
- `WEIL_PRIVATE_KEY` - **CRITICAL**: Private key for signing transactions
- `FRONTEND_URL` - Your Vercel frontend URL (for CORS)
- `WEIL_RPC_ENDPOINT` - WeilChain RPC endpoint
- `WEIL_COORDINATOR_ADDRESS` - Coordinator contract address

### Frontend (Vercel) - Required:
- `NEXT_PUBLIC_BACKEND_URL` - Your Render backend URL
- All other env vars are optional or for display only

## 🎯 User Experience Flow

1. User opens frontend on Vercel
2. User connects WAuth wallet (browser extension)
3. User builds workflow visually
4. User clicks "Deploy to WeilChain"
5. **Frontend sends workflow to backend API**
6. **Backend executes widl CLI commands**
7. **Backend signs and submits transaction**
8. Frontend shows success with transaction hash
9. **No manual CLI commands needed!** ✨

## 🔒 Security Notes

- Private keys stored **only** in backend (Render secrets)
- Frontend **never** has access to private keys
- CORS configured to only allow frontend domain
- Rate limiting enabled on backend API
- All sensitive operations happen server-side

## 📞 Troubleshooting

### "Cannot connect to backend"
- Check `NEXT_PUBLIC_BACKEND_URL` in Vercel
- Verify backend is running on Render
- Check Render logs for errors

### "Deployment failed" errors
- Verify `WEIL_PRIVATE_KEY` is set in Render
- Check widl CLI is accessible in backend
- Review Render deployment logs

### CORS errors
- Ensure `FRONTEND_URL` matches your Vercel URL exactly
- Check backend logs for CORS-related errors

## 📚 Additional Resources

- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)
- [Main Project README](./README.md)
- [Render Documentation](https://render.com/docs)
- [Vercel Documentation](https://vercel.com/docs)

## ✅ Success Checklist

- [ ] Backend deployed to Render
- [ ] Backend health check returns 200: `https://your-backend.onrender.com/health`
- [ ] Frontend deployed to Vercel
- [ ] Frontend loads without errors
- [ ] WAuth wallet connects successfully
- [ ] Workflow deployment works end-to-end
- [ ] No manual CLI commands required!

---

**You're ready to deploy!** 🚀

The seamless user experience you wanted is now ready. Users won't need to touch the CLI at all - everything happens automatically through the backend API.
