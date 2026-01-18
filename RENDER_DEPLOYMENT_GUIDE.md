# Render Deployment Guide - DjedOps Backend

**Complete step-by-step guide for deploying the DjedOps backend API server to Render.com**

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure you have:

- [ ] GitHub repository with latest code pushed
- [ ] Wallet mnemonic or private key (from `widl-cli wallet setup --generate_mnemonic`)
- [ ] Wallet address (output from wallet setup)
- [ ] Coordinator contract address (from WeilChain team - currently using placeholder)
- [ ] Render.com account (free tier works)

---

## 🔑 Required Environment Variables

You will need to configure **13 environment variables** in Render. Here are the exact values:

### 1. Core Server Configuration

```bash
NODE_ENV=production
PORT=3001
ALLOWED_ORIGIN=https://your-frontend-domain.vercel.app
```

### 2. widl-cli Configuration

```bash
WIDL_CLI_PATH=/opt/render/project/src/$HOME/widl/widl-cli
WC_PRIVATE_KEY=/opt/render/project/src/$HOME/.weilliptic
WC_PATH=/opt/render/project/src/$HOME/.weilliptic
```

### 3. Wallet Configuration

```bash
WALLET_PRIVATE_KEY=47f5f20bfff2c7ca5b126e1334f8ab6d7878d26fda586cd367b07cf3052ab354
WALLET_ADDRESS=d12e90e9c66896b256dd8d5f2259b5aad49f94d8017c91b72a00cb75d823b9ed
WIDL_WALLET_MNEMONIC=erode camera ticket insane horse struggle town token hint vote paper glimpse sense capable discover mimic rubber input artefact oil opera winner twin squeeze
```

**⚠️ SECURITY WARNING**: Replace these with your actual wallet credentials. Never commit them to Git.

### 4. WeilChain Network Configuration

```bash
COORDINATOR_CONTRACT_ADDRESS=weil1coordinator00000000000000000000000
WEIL_RPC_URL=https://sentinel.unweil.me
```

**🔴 IMPORTANT**: Contact the WeilChain team to get the real testnet coordinator address before production deployment.

### 5. Rate Limiting

```bash
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 🚀 Deployment Steps

### Step 1: Create New Web Service

1. Log in to [Render.com](https://render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select the **DjedOps** repository

### Step 2: Configure Build Settings

Use these exact settings in the Render dashboard:

| Setting | Value |
|---------|-------|
| **Name** | `djedops-backend` |
| **Region** | Choose closest to your users |
| **Branch** | `main` (or your default branch) |
| **Root Directory** | `backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm ci --production` |
| **Start Command** | `npm start` |

**📝 Explanation:**
- `npm ci` does a clean install (faster and more reliable than `npm install`)
- `--production` skips devDependencies
- Root directory is `backend/` because our server code is in that subfolder
- The `preinstall` script will automatically run `bin/install-widl.sh` before dependencies install

### Step 3: Set Environment Variables

In the Render dashboard, go to the **Environment** tab and add all 13 variables from the section above.

**Quick Copy Format** (paste these one-by-one in Render):

```
NODE_ENV=production
PORT=3001
ALLOWED_ORIGIN=https://your-frontend-domain.vercel.app
WIDL_CLI_PATH=/opt/render/project/src/$HOME/widl/widl-cli
WC_PRIVATE_KEY=/opt/render/project/src/$HOME/.weilliptic
WC_PATH=/opt/render/project/src/$HOME/.weilliptic
WALLET_PRIVATE_KEY=47f5f20bfff2c7ca5b126e1334f8ab6d7878d26fda586cd367b07cf3052ab354
WALLET_ADDRESS=d12e90e9c66896b256dd8d5f2259b5aad49f94d8017c91b72a00cb75d823b9ed
WIDL_WALLET_MNEMONIC=erode camera ticket insane horse struggle town token hint vote paper glimpse sense capable discover mimic rubber input artefact oil opera winner twin squeeze
COORDINATOR_CONTRACT_ADDRESS=weil1coordinator00000000000000000000000
WEIL_RPC_URL=https://sentinel.unweil.me
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**🔒 Important Notes:**
- Replace `https://your-frontend-domain.vercel.app` with your actual frontend URL
- Replace wallet credentials with your own (never use the example values in production)
- Update `COORDINATOR_CONTRACT_ADDRESS` with the real address from WeilChain team

### Step 4: Configure Health Check

1. Go to **Settings** → **Health & Alerts**
2. Set **Health Check Path**: `/health`
3. Set **Health Check Interval**: `30 seconds`

This ensures Render can monitor if your backend is running correctly.

### Step 5: Deploy

1. Click **"Create Web Service"**
2. Render will:
   - Clone your repository
   - Run `npm ci --production` (which triggers `preinstall` script)
   - Download and install widl-cli binaries via `bin/install-widl.sh`
   - Install Node.js dependencies
   - Start the server with `npm start`
3. Watch the build logs for any errors

**Expected Build Output:**
```
==> Running 'npm ci --production'
> djedops-backend@1.0.0 preinstall
> bash ./bin/install-widl.sh || true

[Install] Fetching latest WeilChain CLI release...
[Install] Found release: v0.1.0
[Install] Found asset: widl-cli-linux-x64.tar.gz
[Install] Downloading widl-cli...
[Install] Extracting to /opt/render/project/src/$HOME/widl...
[Install] Making binaries executable...
[Install] ✓ widl-cli installed successfully
[Install] Testing binaries:
widl --help
widl-cli --help

added 50 packages in 3s
==> Starting server with 'npm start'

> djedops-backend@1.0.0 start
> node server.js

[Startup] Checking wallet configuration...
[Startup] Wallet directory: /opt/render/project/src/$HOME/.weilliptic
[Startup] Created wallet directory: /opt/render/project/src/$HOME/.weilliptic
[Startup] ✓ Wrote wallet key to /opt/render/project/src/$HOME/.weilliptic/private_key.wc
[Server] Listening on port 3001
[Server] Wallet address: d12e90e9c66896b256dd8d5f2259b5aad49f94d8017c91b72a00cb75d823b9ed
```

### Step 6: Verify Deployment

Once deployed, Render will give you a URL like: `https://djedops-backend.onrender.com`

Test the health endpoint:

```bash
curl https://djedops-backend.onrender.com/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "walletAddress": "d12e90e9c66896b256dd8d5f2259b5aad49f94d8017c91b72a00cb75d823b9ed",
  "coordinatorAddress": "weil1coordinator00000000000000000000000"
}
```

---

## 🔗 Frontend Integration

After the backend is deployed, update your Next.js frontend environment variables:

### In Vercel (or your frontend host):

```bash
NEXT_PUBLIC_BACKEND_URL=https://djedops-backend.onrender.com
```

### Locally (`.env.local`):

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

**🔄 Update ALLOWED_ORIGIN:**
Go back to Render → Environment → `ALLOWED_ORIGIN` and set it to your frontend URL (e.g., `https://djedops.vercel.app`)

---

## 🧪 Testing the Deployment

### 1. Test Health Endpoint

```bash
curl https://djedops-backend.onrender.com/health
```

### 2. Test Deployment Endpoint

Use the provided PowerShell test script:

```powershell
cd backend
.\test-deploy.ps1
```

Or manually with curl:

```bash
curl -X POST https://djedops-backend.onrender.com/api/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": {
      "nodes": [
        {
          "id": "trigger-1",
          "type": "trigger",
          "data": { "event": "priceChange", "threshold": "100" }
        },
        {
          "id": "action-1",
          "type": "action",
          "data": { "type": "swap", "amount": "1000" }
        }
      ],
      "edges": [
        { "source": "trigger-1", "target": "action-1" }
      ]
    },
    "metadata": {
      "name": "Test Workflow",
      "description": "Test deployment from curl"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "txHash": "0x1234567890abcdef...",
  "workflowId": "workflow-123",
  "contractAddress": "weil1abc123..."
}
```

---

## 🐛 Troubleshooting

### Issue 1: Build Fails - "bash: bin/install-widl.sh: No such file or directory"

**Cause:** Git didn't preserve executable permissions on the script.

**Fix:**
```bash
chmod +x backend/bin/install-widl.sh
git add backend/bin/install-widl.sh
git commit -m "Fix: Make install-widl.sh executable"
git push
```

Then redeploy in Render.

---

### Issue 2: Server Crashes - "WALLET_PRIVATE_KEY not set"

**Cause:** Missing environment variable in Render.

**Fix:**
1. Go to Render dashboard → Environment tab
2. Add `WALLET_PRIVATE_KEY` with your private key value
3. Click **"Save Changes"** (this triggers automatic redeploy)

---

### Issue 3: CORS Errors from Frontend

**Cause:** `ALLOWED_ORIGIN` doesn't match your frontend URL.

**Fix:**
1. Go to Render → Environment → `ALLOWED_ORIGIN`
2. Update to match your exact frontend URL (include https://, no trailing slash)
3. Example: `https://djedops.vercel.app`
4. Save and wait for redeploy

---

### Issue 4: widl-cli Command Not Found

**Cause:** `install-widl.sh` failed during build or `WIDL_CLI_PATH` is wrong.

**Fix:**
1. Check build logs in Render for errors during preinstall script
2. Verify `WIDL_CLI_PATH` matches the install location: `/opt/render/project/src/$HOME/widl/widl-cli`
3. SSH into Render shell (if available) and check:
   ```bash
   ls -la $HOME/widl/
   which widl-cli
   ```

---

### Issue 5: Deployment Returns Mock Data

**Cause:** `COORDINATOR_CONTRACT_ADDRESS` is still the placeholder value.

**Fix:**
1. Contact WeilChain team for the real testnet coordinator address
2. Update the environment variable in Render
3. Redeploy

**How to tell if using mock:**
- Response will have `txHash` starting with `0xmock`
- Logs will say `[Deploy] ⚠ Using placeholder coordinator - returning mock response`

---

## 📊 Monitoring & Logs

### View Real-Time Logs

1. Go to Render dashboard → Your service
2. Click **"Logs"** tab
3. Watch for:
   - `[Server] Listening on port 3001` - Server started successfully
   - `[Startup] ✓ Wrote wallet key` - Wallet initialized
   - `[Deploy] Executing widl-cli command` - Deployment requests

### Set Up Alerts

1. Go to **Settings** → **Health & Alerts**
2. Enable **"Notify on failed deploy"**
3. Enable **"Notify on service down"**
4. Add your email or Slack webhook

---

## 🔐 Security Best Practices

### 1. Rotate Wallet Keys Regularly

Generate a new wallet for production:

```bash
widl-cli wallet setup --generate_mnemonic
```

Update environment variables in Render with the new credentials.

### 2. Use Different Wallets for Dev/Staging/Production

Never use the same wallet across environments.

### 3. Enable IP Whitelisting (Optional)

If your frontend has a static IP, restrict access:

In `server.js`, add IP whitelist middleware before routes:

```javascript
const allowedIPs = process.env.ALLOWED_IPS?.split(',') || [];

app.use((req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  if (allowedIPs.length && !allowedIPs.includes(clientIP)) {
    return res.status(403).json({ error: 'Forbidden IP' });
  }
  next();
});
```

Then set `ALLOWED_IPS=1.2.3.4,5.6.7.8` in Render.

### 4. Monitor Rate Limits

Current settings allow 100 requests per 15 minutes per IP. Adjust in environment variables if needed.

---

## 🎯 Post-Deployment Checklist

After successful deployment, verify:

- [ ] Health endpoint returns 200 OK
- [ ] Wallet address matches your expected wallet
- [ ] CORS allows requests from your frontend domain
- [ ] Rate limiting is working (test with >100 rapid requests)
- [ ] Deployment endpoint accepts workflow JSON
- [ ] Real coordinator address is configured (not placeholder)
- [ ] Logs show successful widl-cli command execution
- [ ] Frontend can successfully call `/api/deploy`
- [ ] Transaction hashes appear on WeilChain explorer
- [ ] Alerts are configured for downtime

---

## 📚 Additional Resources

- [Render Documentation](https://render.com/docs)
- [WeilChain SDK Documentation](https://docs.unweil.me)
- [widl-cli GitHub Repository](https://github.com/weilliptic-public/wadk)
- [Backend README](./backend/README.md)
- [Backend Quick Start](./BACKEND_QUICK_START.md)

---

## 🆘 Getting Help

If you encounter issues not covered here:

1. Check Render build logs for error messages
2. Review server logs in Render dashboard
3. Test locally with `cd backend && npm start`
4. Verify all environment variables are set correctly
5. Contact WeilChain team for coordinator/network issues
6. Open an issue in the DjedOps repository

---

**✅ You're ready to deploy!** Follow the steps above and your backend will be live on Render in ~5 minutes.
