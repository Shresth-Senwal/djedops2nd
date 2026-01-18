# DjedOps Quick Command Reference

## 🚀 Local Development

### Start Backend Server
```powershell
cd c:\D_Drive\Projects\djedops\backend
npm start
```
**Expected**: Server starts on port 3001, logs wallet address

### Start Frontend Dev Server
```powershell
cd c:\D_Drive\Projects\djedops
npm run dev
```
**Expected**: Frontend available at http://localhost:3000

### Test Backend Health
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/health"
```
**Expected**: Returns wallet address and coordinator info

### Test Deployment Endpoint
```powershell
cd c:\D_Drive\Projects\djedops\backend
.\test-deploy.ps1
```
**Expected**: Returns success with mock TX hash

---

## 📦 Deployment

### Push to GitHub
```bash
git add .
git commit -m "feat: Production-ready backend with auto-deployment"
git push origin main
```

### Render Build Command
```bash
npm ci --production
```
**Note**: Automatically runs `preinstall` script to install widl-cli

### Render Start Command
```bash
npm start
```

### Test Production Health
```bash
curl https://djedops-backend.onrender.com/health
```

### Test Production Deployment
```bash
curl -X POST https://djedops-backend.onrender.com/api/deploy \
  -H "Content-Type: application/json" \
  -d @backend/workflow-example.json
```

---

## 🔧 Troubleshooting

### Check if port 3001 is in use
```powershell
Get-NetTCPConnection -LocalPort 3001
```

### Kill process on port 3001
```powershell
$proc = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($proc) { Stop-Process -Id $proc.OwningProcess -Force }
```

### Verify wallet file exists
```powershell
Test-Path "$env:USERPROFILE\.weilliptic\private_key.wc"
```

### View wallet file (DO NOT share this!)
```powershell
Get-Content "$env:USERPROFILE\.weilliptic\private_key.wc"
```

### Check backend environment variables
```powershell
cd c:\D_Drive\Projects\djedops\backend
Get-Content .env
```

### Reinstall backend dependencies
```powershell
cd c:\D_Drive\Projects\djedops\backend
Remove-Item -Recurse -Force node_modules
npm install
```

---

## 🌐 Environment Variables

### Local (.env.local in root)
```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_DJED_COORDINATOR_ADDRESS=weil1coordinator00000000000000000000000
```

### Local (backend/.env)
```bash
NODE_ENV=development
PORT=3001
ALLOWED_ORIGIN=http://localhost:3000
WALLET_PRIVATE_KEY=47f5f20bfff2c7ca5b126e1334f8ab6d7878d26fda586cd367b07cf3052ab354
WALLET_ADDRESS=d12e90e9c66896b256dd8d5f2259b5aad49f94d8017c91b72a00cb75d823b9ed
COORDINATOR_CONTRACT_ADDRESS=weil1coordinator00000000000000000000000
WEIL_RPC_URL=https://sentinel.unweil.me
```

### Production (Render.com)
See `RENDER_DEPLOYMENT_GUIDE.md` for all 13 variables

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `backend/server.js` | Main Express server |
| `backend/bin/install-widl.sh` | Auto-install widl-cli on Render |
| `backend/package.json` | Dependencies + preinstall script |
| `components/WorkflowBuilder.tsx` | Visual workflow builder UI |
| `lib/weil-sdk-wrapper.ts` | WeilChain API integration |
| `RENDER_DEPLOYMENT_GUIDE.md` | Complete deployment walkthrough |
| `PRE_DEPLOYMENT_CHECKLIST.md` | Testing checklist |
| `FINAL_IMPLEMENTATION_SUMMARY.md` | What's been implemented |

---

## 🔍 Endpoints

### Backend API

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Server health check |
| POST | `/api/deploy` | Deploy workflow to WeilChain |
| GET | `/api/status/:txHash` | Check transaction status |

### Frontend Pages

| Route | Purpose |
|-------|---------|
| `/` | Homepage |
| `/workflows` | Workflow builder |
| `/dashboard` | DeFi dashboard |
| `/marketplace` | Applet marketplace |

---

## 📝 Testing Checklist

- [ ] Backend starts without errors
- [ ] Health endpoint returns 200 OK
- [ ] Wallet address is logged correctly
- [ ] Deployment endpoint returns success
- [ ] Frontend can connect to backend
- [ ] Workflow deployment shows success alert
- [ ] No CORS errors in browser console

---

## 🎯 Deployment Steps (Quick)

1. Test locally (all 4 tests above)
2. Push to GitHub
3. Create Render Web Service
4. Set root directory to `backend`
5. Add 13 environment variables
6. Deploy and verify `/health`
7. Update frontend `NEXT_PUBLIC_BACKEND_URL`
8. Deploy frontend to Vercel
9. Update backend `ALLOWED_ORIGIN`
10. Test end-to-end

**Time**: ~5 minutes after local testing

---

## 📚 Documentation

- **Complete Deployment Guide**: [RENDER_DEPLOYMENT_GUIDE.md](./RENDER_DEPLOYMENT_GUIDE.md)
- **Pre-Deployment Checklist**: [PRE_DEPLOYMENT_CHECKLIST.md](./PRE_DEPLOYMENT_CHECKLIST.md)
- **Implementation Summary**: [FINAL_IMPLEMENTATION_SUMMARY.md](./FINAL_IMPLEMENTATION_SUMMARY.md)
- **Architecture Diagram**: [ARCHITECTURE_DIAGRAM.md](./ARCHITECTURE_DIAGRAM.md)
- **Project Context**: [CONTEXT.md](./CONTEXT.md)
- **Backend README**: [backend/README.md](./backend/README.md)

---

## 🆘 Need Help?

**Common Issues**:
1. Port 3001 in use → Kill the process (see Troubleshooting)
2. CORS errors → Check `ALLOWED_ORIGIN` matches frontend URL
3. Mock TX hash → Expected when using placeholder coordinator
4. Build fails on Render → Check `install-widl.sh` permissions

**Resources**:
- Render Docs: https://render.com/docs
- WeilChain Docs: https://docs.unweil.me
- widl-cli GitHub: https://github.com/weilliptic-public/wadk

---

**Last Updated**: January 16, 2026
