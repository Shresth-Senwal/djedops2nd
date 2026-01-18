# 🚀 Quick Render Deployment Commands

## One-Time Setup

### 1. Login to Render
```bash
# Install Render CLI (optional)
npm install -g render-cli
render login
```

### 2. Create Web Service via Dashboard
1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect GitHub repo: `sameezy667/djedops`
4. Render auto-detects `backend/render.yaml`
5. Click "Create Web Service"

## Required Environment Variables

Set these in Render Dashboard → Environment:

```bash
# Secrets (NEVER commit to Git)
WALLET_PRIVATE_KEY=<your_private_key>
WALLET_ADDRESS=<your_wallet_address>
WALLET_MNEMONIC=<your_mnemonic_phrase>

# Public Config (auto-configured from render.yaml)
NODE_ENV=production
PORT=10000
ALLOWED_ORIGIN=https://djedops.vercel.app
WEIL_RPC_URL=https://sentinel.unweil.me
COORDINATOR_CONTRACT_ADDRESS=weil1coordinator00000000000000000000000
WIDL_CLI_PATH=/opt/render/project/src/widl/widl-cli
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=10
```

## Deployment Process

### Automatic Deployment (Recommended)
```bash
# Push to GitHub - Render auto-deploys
git add .
git commit -m "Deploy backend to Render"
git push origin main
```

Render will automatically:
1. ✅ Detect push to main branch
2. ✅ Run `npm install`
3. ✅ Execute `bin/install-widl.sh` (downloads widl-cli)
4. ✅ Start server with `npm start`
5. ✅ Monitor health at `/health`

### Manual Deployment
```bash
# Via Render dashboard
1. Go to your service
2. Click "Manual Deploy" → "Deploy latest commit"
```

## Verify Deployment

### Check Health Endpoint
```bash
curl https://djedops-backend.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-17T12:34:56.789Z",
  "walletAddress": "d12e90e9c66896b256dd8d5f2259b5aad49f94d8017c91b72a00cb75d823b9ed"
}
```

### Test Deployment
```bash
curl -X POST https://djedops-backend.onrender.com/api/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": {
      "nodes": [{"id":"1","type":"swap","data":{}}],
      "edges": []
    },
    "name": "Test Workflow",
    "owner": "weil1test..."
  }'
```

## View Logs

### Via Dashboard
```
https://dashboard.render.com/web/<your-service-id>/logs
```

### Via CLI
```bash
render logs --tail djedops-backend
```

## Troubleshooting

### Build Failed: widl-cli not installed
```bash
# Check build logs for:
[install-widl] Downloading: https://github.com/...
[install-widl] Binary installed: /opt/render/project/src/widl/widl-cli

# If missing, verify bin/install-widl.sh has execute permissions
chmod +x backend/bin/install-widl.sh
git add backend/bin/install-widl.sh
git commit -m "Fix widl install script permissions"
git push
```

### Health Check Failing
```bash
# Ensure PORT matches Render's default
PORT=10000  # Must be 10000 for Render

# Check server.js has health endpoint:
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

### CORS Errors
```bash
# Update ALLOWED_ORIGIN to match frontend URL
ALLOWED_ORIGIN=https://your-actual-frontend.vercel.app

# Verify in server.js:
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000'
}));
```

### Wallet Not Configured
```bash
# Verify environment variables are set in Render dashboard:
WALLET_PRIVATE_KEY=<must be set>
WALLET_ADDRESS=<must be set>

# Check startup logs:
[Startup] ✓ Wrote wallet key to /opt/render/.../.weilliptic/private_key.wc
[Startup] ✓ Wallet key file exists
```

## Update Deployment

### Update Code
```bash
# Make changes, commit, push
git add .
git commit -m "Update backend logic"
git push origin main

# Render auto-deploys in ~2 minutes
```

### Update Environment Variables
```bash
# Via dashboard:
1. Go to service → Environment
2. Edit variable
3. Click "Save Changes"
4. Render automatically redeploys
```

### Rollback
```bash
# Via dashboard:
1. Go to service → Events
2. Find previous successful deploy
3. Click "..." → "Rollback to this version"
```

## Monitoring

### Service Health
```
https://dashboard.render.com/web/<service-id>
```

Shows:
- ✅ Deploy status (Live/Deploying/Failed)
- ✅ Health check status
- ✅ Resource usage (CPU, memory)
- ✅ Request metrics

### Set Up Alerts
```bash
# Via dashboard:
1. Go to service → Notifications
2. Add email/Slack webhook
3. Choose alerts:
   - Deploy succeeded/failed
   - Health check failing
   - High CPU/memory usage
```

## Cost Optimization

### Free Tier Limits
- ✅ 750 hours/month (31.25 days)
- ✅ Spins down after 15 minutes of inactivity
- ✅ Cold start: ~30 seconds

### Paid Plans (if needed)
```
Starter: $7/month
- Always on (no spin down)
- Faster builds
- More CPU/memory
```

## Quick Links

- 📊 Dashboard: https://dashboard.render.com
- 📖 Render Docs: https://render.com/docs
- 🐛 DjedOPS Issues: https://github.com/sameezy667/djedops/issues
- 📝 Full Guide: [RENDER_DEPLOYMENT_GUIDE.md](./RENDER_DEPLOYMENT_GUIDE.md)
- ✅ Checklist: [PRE_DEPLOYMENT_CHECKLIST.md](./PRE_DEPLOYMENT_CHECKLIST.md)

## Success!

Your backend is live when you see:
- ✅ Green "Live" badge in dashboard
- ✅ Health endpoint returns 200 OK
- ✅ Logs show "✓ DjedOps backend running on port 10000"
- ✅ Frontend can deploy workflows

**Deployment URL:** `https://djedops-backend.onrender.com`

**Next Step:** Update frontend's `NEXT_PUBLIC_BACKEND_URL` on Vercel!

---

**Estimated Total Time:** 5 minutes (first deploy) | 2 minutes (updates)
