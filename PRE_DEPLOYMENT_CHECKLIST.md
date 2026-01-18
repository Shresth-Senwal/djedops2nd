# Pre-Deployment Checklist ✅

**Last Updated**: January 16, 2026  
**Target Platform**: Render.com (Backend) + Vercel (Frontend)

---

## 📦 Code Implementation Status

### Backend Server
- [x] Express server created (`backend/server.js` - 207 lines)
- [x] POST `/api/deploy` endpoint implemented
- [x] GET `/health` endpoint with wallet info
- [x] Wallet initialization logic on startup
- [x] Windows/Linux temp path compatibility
- [x] Rate limiting configured (100 req/15min)
- [x] CORS middleware with configurable origin
- [x] Error handling and logging
- [x] Binary installation script (`backend/bin/install-widl.sh`)
- [x] Package.json preinstall hook configured
- [x] Environment variable validation
- [x] Test scripts created (PowerShell + Bash)

### Frontend Integration
- [x] WorkflowBuilder.tsx updated to POST to backend
- [x] weil-sdk-wrapper.ts deployWorkflowOnWeil() uses fetch()
- [x] Removed CLI modal flow
- [x] Added success/error alerts for deployment
- [x] Environment variable configured (NEXT_PUBLIC_BACKEND_URL)

### Documentation
- [x] RENDER_DEPLOYMENT_GUIDE.md (complete step-by-step)
- [x] BACKEND_QUICK_START.md (local development)
- [x] BACKEND_MIGRATION_COMPLETE.md (architecture docs)
- [x] backend/README.md (Render-specific instructions)
- [x] CONTEXT.md updated with deployment status

### Security & Configuration
- [x] .gitignore excludes .env files
- [x] .env.example template provided
- [x] Wallet credentials managed via environment variables
- [x] No hardcoded secrets in code
- [x] Private key stored with 0o600 permissions

---

## 🧪 Local Testing Required

Before deploying to Render, test locally:

### 1. Backend Server Test
```powershell
# Terminal 1: Start backend
cd backend
npm install
npm start

# Should see:
# [Startup] ✓ Wrote wallet key to ...
# [Server] Listening on port 3001
# [Server] Wallet address: d12e90e9c66896b256dd8d5f2259b5aad49f94d8017c91b72a00cb75d823b9ed
```

**Expected Output**:
```
[Startup] Checking wallet configuration...
[Startup] Wallet directory: C:\Users\<you>\.weilliptic
[Startup] ✓ Wrote wallet key to C:\Users\<you>\.weilliptic\private_key.wc
[Server] Listening on port 3001
[Server] Wallet address: d12e90e9c66896b256dd8d5f2259b5aad49f94d8017c91b72a00cb75d823b9ed
```

**Verification**:
- [ ] Server starts without errors
- [ ] Wallet directory created successfully
- [ ] Wallet address logged matches your wallet

### 2. Health Endpoint Test
```powershell
# In browser or curl:
curl http://localhost:3001/health
```

**Expected Response**:
```json
{
  "status": "ok",
  "walletAddress": "d12e90e9c66896b256dd8d5f2259b5aad49f94d8017c91b72a00cb75d823b9ed",
  "coordinatorAddress": "weil1coordinator00000000000000000000000"
}
```

**Verification**:
- [ ] Returns 200 OK
- [ ] Wallet address present and correct
- [ ] Coordinator address shown (placeholder is fine for now)

### 3. Deployment Endpoint Test
```powershell
cd backend
.\test-deploy.ps1
```

**Expected Output**:
```json
{
  "success": true,
  "txHash": "0xmock1234567890abcdef...",
  "workflowId": "workflow-xxx",
  "contractAddress": "weil1abc123..."
}
```

**Verification**:
- [ ] Returns 200 OK
- [ ] Response includes txHash
- [ ] Response includes workflowId
- [ ] Response includes contractAddress
- [ ] Backend logs show workflow file written
- [ ] Backend logs show widl-cli command executed
- [ ] Mock response returned (since coordinator is placeholder)

### 4. Frontend Integration Test
```powershell
# Terminal 2: Start frontend (keep backend running in Terminal 1)
npm run dev
```

**Steps**:
1. Open http://localhost:3000/workflows
2. Create a workflow:
   - Add Trigger node (e.g., Price Change)
   - Add Action node (e.g., Swap)
   - Connect them
3. Click "Deploy to WeilChain"
4. Should see success alert with transaction hash

**Verification**:
- [ ] Workflow builder loads without errors
- [ ] Can add and connect nodes
- [ ] Deploy button visible
- [ ] Clicking deploy shows loading state
- [ ] Success alert appears with TX hash
- [ ] No CLI modal appears
- [ ] Backend logs show POST request received
- [ ] Frontend console shows no CORS errors

---

## 🌐 Render Deployment Prerequisites

### 1. GitHub Repository
- [ ] All code committed and pushed to main branch
- [ ] .gitignore excludes .env files
- [ ] README.md up to date
- [ ] No sensitive data in repository

### 2. Environment Variables Prepared

Have these 13 values ready to paste into Render:

```bash
# Core Configuration
NODE_ENV=production
PORT=3001
ALLOWED_ORIGIN=https://your-frontend-domain.vercel.app

# widl-cli Paths
WIDL_CLI_PATH=/opt/render/project/src/$HOME/widl/widl-cli
WC_PRIVATE_KEY=/opt/render/project/src/$HOME/.weilliptic
WC_PATH=/opt/render/project/src/$HOME/.weilliptic

# Wallet Credentials (REPLACE WITH YOUR OWN)
WALLET_PRIVATE_KEY=47f5f20bfff2c7ca5b126e1334f8ab6d7878d26fda586cd367b07cf3052ab354
WALLET_ADDRESS=d12e90e9c66896b256dd8d5f2259b5aad49f94d8017c91b72a00cb75d823b9ed
WIDL_WALLET_MNEMONIC=erode camera ticket insane horse struggle town token hint vote paper glimpse sense capable discover mimic rubber input artefact oil opera winner twin squeeze

# WeilChain Configuration
COORDINATOR_CONTRACT_ADDRESS=weil1coordinator00000000000000000000000
WEIL_RPC_URL=https://sentinel.unweil.me

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**⚠️ SECURITY WARNING**:
- [ ] Replace wallet credentials with production wallet
- [ ] Never use example values in production
- [ ] Store credentials in password manager
- [ ] Get real coordinator address from WeilChain team

### 3. Render Account
- [ ] Created free account at render.com
- [ ] GitHub repository connected
- [ ] Payment method added (free tier available)

---

## 🚀 Deployment Steps

Follow the complete guide: [RENDER_DEPLOYMENT_GUIDE.md](./RENDER_DEPLOYMENT_GUIDE.md)

**Quick Summary**:
1. Create new Web Service in Render
2. Connect GitHub repository
3. Set root directory to `backend`
4. Build command: `npm ci --production`
5. Start command: `npm start`
6. Add all 13 environment variables
7. Deploy and monitor logs

**Deployment Time**: ~3-5 minutes

---

## ✅ Post-Deployment Verification

After deployment completes:

### 1. Backend Health Check
```bash
curl https://djedops-backend.onrender.com/health
```

**Must Return**:
```json
{
  "status": "ok",
  "walletAddress": "d12e90e9c...",
  "coordinatorAddress": "weil1coordinator..."
}
```

**Verification**:
- [ ] Returns 200 OK
- [ ] Wallet address matches your wallet
- [ ] No server errors in Render logs

### 2. Deployment Endpoint Test
```bash
curl -X POST https://djedops-backend.onrender.com/api/deploy \
  -H "Content-Type: application/json" \
  -d '{"workflow":{"nodes":[{"id":"t1","type":"trigger","data":{}}]},"metadata":{"name":"Test"}}'
```

**Must Return**:
```json
{
  "success": true,
  "txHash": "0xmock...",
  "workflowId": "workflow-...",
  "contractAddress": "weil1..."
}
```

**Verification**:
- [ ] Returns 200 OK
- [ ] Response structure correct
- [ ] Render logs show workflow processing

### 3. Frontend Integration Test

**Update Frontend Environment**:
```bash
# In Vercel or .env.local:
NEXT_PUBLIC_BACKEND_URL=https://djedops-backend.onrender.com
```

**Update Backend CORS**:
```bash
# In Render environment variables:
ALLOWED_ORIGIN=https://your-frontend.vercel.app
```

**Test Workflow Deployment**:
1. Open production frontend URL
2. Navigate to /workflows
3. Create and deploy a test workflow
4. Verify success alert with TX hash

**Verification**:
- [ ] Frontend can reach backend (no CORS errors)
- [ ] Deployment succeeds from live frontend
- [ ] Transaction hash returned
- [ ] No console errors

---

## 📊 Monitoring Setup

### Render Monitoring
- [ ] Enable "Notify on failed deploy" in Render
- [ ] Enable "Notify on service down" in Render
- [ ] Set health check path to `/health`
- [ ] Set health check interval to 30 seconds

### Log Monitoring
- [ ] Watch Render logs for errors after first deploy
- [ ] Verify wallet initialization logs
- [ ] Check for widl-cli command execution logs
- [ ] Monitor for rate limit triggers

---

## 🔧 Known Issues & Workarounds

### Issue: Coordinator Address is Placeholder
**Status**: Expected - waiting for WeilChain team
**Impact**: Deployments return mock transaction hashes
**Workaround**: Backend detects placeholder and returns mock data
**Fix**: Update `COORDINATOR_CONTRACT_ADDRESS` when real address available

### Issue: First Render Deploy May Time Out
**Status**: Common on free tier - cold start
**Impact**: First request may take 30+ seconds
**Workaround**: Health check warms up the instance
**Fix**: Upgrade to paid tier for instant scaling

### Issue: widl-cli Binary Download Fails
**Status**: Rare - GitHub API rate limit
**Impact**: Build fails with "curl: 403 Forbidden"
**Workaround**: Retry deploy after 1 hour
**Fix**: Use authenticated GitHub API request (future)

---

## 🎯 Success Criteria

Deployment is successful when:

- [x] Backend code is production-ready
- [x] Frontend integration is complete
- [x] Documentation is comprehensive
- [ ] Local testing passes all checks
- [ ] Backend deploys to Render without errors
- [ ] Health endpoint returns 200 OK
- [ ] Deployment endpoint accepts workflows
- [ ] Frontend can call backend API
- [ ] CORS allows frontend domain
- [ ] Wallet is initialized from environment
- [ ] widl-cli binaries installed correctly
- [ ] Logs show successful workflow processing

---

## 🔜 Next Steps After Deployment

1. **Get Real Coordinator Address**
   - Contact WeilChain team
   - Update environment variable in Render
   - Test with real contract deployment

2. **Frontend Deployment**
   - Deploy to Vercel
   - Set `NEXT_PUBLIC_BACKEND_URL` to Render URL
   - Update backend `ALLOWED_ORIGIN` to Vercel URL

3. **End-to-End Testing**
   - Deploy real workflow from production frontend
   - Verify transaction on WeilChain explorer
   - Test multiple workflows
   - Test rate limiting

4. **Monitoring & Optimization**
   - Set up error alerting
   - Monitor response times
   - Optimize API endpoints if needed
   - Add transaction status polling

5. **Security Hardening**
   - Rotate wallet keys regularly
   - Use different wallets for dev/prod
   - Consider IP whitelisting
   - Add request logging

---

## 📞 Support Resources

- **Render Documentation**: https://render.com/docs
- **WeilChain Docs**: https://docs.unweil.me
- **widl-cli GitHub**: https://github.com/weilliptic-public/wadk
- **Backend README**: [backend/README.md](./backend/README.md)
- **Deployment Guide**: [RENDER_DEPLOYMENT_GUIDE.md](./RENDER_DEPLOYMENT_GUIDE.md)

---

**✅ Ready to deploy when all checkboxes above are checked!**
