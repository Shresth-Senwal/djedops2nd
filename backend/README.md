# DjedOps Backend - Render Deployment Guide

## Quick Deploy to Render

### 1. Prepare Backend for Deployment

The backend is already configured in `/backend` folder:
- `server.js` - Express API server
- `package.json` - Dependencies
- `.env.example` - Environment template

### 2. Install widl-cli on Render

Create a `render.yaml` in your project root:

```yaml
services:
  - type: web
    name: djedops-backend
    env: node
    region: oregon
    plan: free
    buildCommand: |
      cd backend
      npm install
      # Install widl-cli binaries
      curl -L https://github.com/weilliptic-public/wadk/releases/latest/download/widl-linux-x64.tar.gz -o /tmp/widl.tar.gz
      tar -xzf /tmp/widl.tar.gz -C /tmp
      sudo install -m 0755 /tmp/widl /usr/local/bin/widl
      sudo install -m 0755 /tmp/cli /usr/local/bin/widl-cli
    startCommand: cd backend && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: ALLOWED_ORIGIN
        fromGroup: frontend-url
      - key: WEIL_RPC_URL
        value: https://sentinel.unweil.me
      - key: COORDINATOR_CONTRACT_ADDRESS
        sync: false  # Set in Render dashboard
      - key: WALLET_MNEMONIC
        sync: false  # Set in Render dashboard (KEEP SECRET)
      - key: WALLET_PRIVATE_KEY
        sync: false  # Set in Render dashboard (KEEP SECRET)
      - key: WALLET_ADDRESS
        sync: false  # Set in Render dashboard
      - key: WIDL_CLI_PATH
        value: /usr/local/bin/widl-cli
```

### 3. Deploy via Render Dashboard

#### Option A: Connect GitHub Repository

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository: `https://github.com/sameezy667/djedops`
4. Configure:
   - **Name**: `djedops-backend`
   - **Region**: Oregon (US West)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

5. Add Environment Variables (click "Environment" tab):
   ```
   NODE_ENV=production
   PORT=10000
   ALLOWED_ORIGIN=https://your-frontend-url.vercel.app
   WEIL_RPC_URL=https://sentinel.unweil.me
   COORDINATOR_CONTRACT_ADDRESS=weil1coordinator00000000000000000000000
   WALLET_MNEMONIC=erode camera ticket insane horse struggle town token hint vote paper glimpse sense capable discover mimic rubber input artefact oil opera winner twin squeeze
   WALLET_PRIVATE_KEY=47f5f20bfff2c7ca5b126e1334f8ab6d7878d26fda586cd367b07cf3052ab354
   WALLET_ADDRESS=d12e90e9c66896b256dd8d5f2259b5aad49f94d8017c91b72a00cb75d823b9ed
   WIDL_CLI_PATH=/usr/local/bin/widl-cli
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=10
   ```

6. Click **"Create Web Service"**

#### Option B: Manual Deployment

```bash
# From your project root
cd backend
npm install

# Create Render.yaml (already done above)
git add .
git commit -m "Add backend for Render deployment"
git push origin main

# Go to Render dashboard and follow Option A
```

### 4. Install widl-cli on Render (Post-Deploy)

After your service is created, go to **Shell** tab in Render dashboard and run:

```bash
# Download and install widl-cli
curl -L https://github.com/weilliptic-public/wadk/releases/latest/download/linux-binary.tar.gz -o /tmp/widl.tar.gz
tar -xzf /tmp/widl.tar.gz -C /tmp
install -m 0755 /tmp/widl /usr/local/bin/widl
install -m 0755 /tmp/cli /usr/local/bin/widl-cli

# Test installation
widl-cli --help

# Setup wallet environment
export WC_PRIVATE_KEY=/tmp/.weilliptic
export WC_PATH=/tmp/.weilliptic
mkdir -p /tmp/.weilliptic
echo "$WALLET_PRIVATE_KEY" > /tmp/.weilliptic/private_key.wc
chmod 600 /tmp/.weilliptic/private_key.wc

# Test wallet
widl-cli wallet show
```

### 5. Update Frontend to Use Backend

Update `.env.local` (or `.env.production` for Vercel):

```bash
NEXT_PUBLIC_BACKEND_URL=https://djedops-backend.onrender.com
```

### 6. Test Deployment

```bash
# Health check
curl https://djedops-backend.onrender.com/health

# Test deployment (from your local machine)
curl -X POST https://djedops-backend.onrender.com/api/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "workflow_id": "test_001",
    "name": "Test Workflow",
    "owner": "d12e90e9c66896b256dd8d5f2259b5aad49f94d8017c91b72a00cb75d823b9ed",
    "workflow": {
      "nodes": [],
      "edges": []
    }
  }'
```

Expected response:
```json
{
  "success": true,
  "txHash": "0x...",
  "workflowId": "test_001",
  "contractAddress": "weil1...",
  "explorer": "https://www.unweil.me/tx/0x...",
  "timestamp": "2026-01-16T..."
}
```

---

## Production Checklist

### Security

- [x] Wallet private key stored in Render environment variables (encrypted at rest)
- [ ] Add API authentication (JWT) for production
- [ ] Enable HTTPS only (Render provides free SSL)
- [ ] Add request signing/verification
- [ ] Use Render secrets for sensitive env vars
- [ ] Enable rate limiting (already configured)
- [ ] Add IP whitelisting if needed
- [ ] Set up monitoring and alerts

### Monitoring

```bash
# View logs in Render dashboard
# Or use Render API
curl https://api.render.com/v1/services/srv-xxx/logs \
  -H "Authorization: Bearer $RENDER_API_KEY"
```

### Scaling

Free tier limits:
- 750 hours/month (enough for testing)
- Spins down after 15 min inactivity
- Cold start: ~30 seconds

For production:
- Upgrade to Starter plan ($7/month)
- Always on (no spin down)
- Faster CPU/memory

### Cost Estimate

- **Free Tier**: $0/month (good for testing)
- **Starter**: $7/month (production-ready)
- **Standard**: $25/month (high traffic)

---

## Troubleshooting

### "widl-cli: command not found"

Ensure install script ran successfully:
```bash
which widl-cli
# Should output: /usr/local/bin/widl-cli

# If not found, manually install in Shell tab:
curl -L https://github.com/weilliptic-public/wadk/releases/latest/download/linux-binary.tar.gz -o /tmp/widl.tar.gz
tar -xzf /tmp/widl.tar.gz -C /tmp
install -m 0755 /tmp/widl /usr/local/bin/widl
install -m 0755 /tmp/cli /usr/local/bin/widl-cli
```

### "Private key file not found"

Check environment variables:
```bash
echo $WC_PRIVATE_KEY
echo $WALLET_PRIVATE_KEY

# Recreate key file
mkdir -p /tmp/.weilliptic
echo "$WALLET_PRIVATE_KEY" > /tmp/.weilliptic/private_key.wc
chmod 600 /tmp/.weilliptic/private_key.wc
```

### "CORS error"

Update `ALLOWED_ORIGIN` in Render environment:
```
ALLOWED_ORIGIN=https://your-frontend.vercel.app,https://localhost:3000
```

### "Deployment timeout"

Increase timeout in `server.js` (line 122):
```javascript
timeout: 60000  // 60 seconds
```

---

## Alternative: Deploy to Railway

If Render doesn't work, try Railway.app:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
cd backend
railway init
railway up
railway open
```

---

## Next Steps

1. **Get Real Coordinator Address**
   - Contact WeilChain team
   - Update `COORDINATOR_CONTRACT_ADDRESS` in Render

2. **Request Testnet Funds**
   - Fund wallet: `d12e90e9c66896b256dd8d5f2259b5aad49f94d8017c91b72a00cb75d823b9ed`
   - Get tokens from WeilChain faucet

3. **Enable in Frontend**
   - Update `.env.local`: `NEXT_PUBLIC_BACKEND_URL=https://djedops-backend.onrender.com`
   - Deploy frontend to Vercel
   - Test end-to-end workflow deployment

4. **Add Monitoring**
   - Set up Sentry or LogRocket
   - Configure alerts for errors
   - Monitor deployment success rate

---

## Support

- **Render Docs**: https://render.com/docs
- **WeilChain Docs**: (Contact team for URL)
- **GitHub Issues**: https://github.com/sameezy667/djedops/issues
