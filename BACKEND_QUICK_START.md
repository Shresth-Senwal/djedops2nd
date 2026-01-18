# DjedOps Quick Start - Backend Architecture

## 🚀 Quick Setup (5 minutes)

### 1. Install Dependencies

```powershell
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Configure Environment

```powershell
# Frontend (.env.local in project root)
@"
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here
NEXT_PUBLIC_WEIL_SENTINEL_ENDPOINT=https://sentinel.unweil.me
NEXT_PUBLIC_DJED_COORDINATOR_ADDRESS=weil1coordinator00000000000000000000000
NEXT_PUBLIC_TELEPORT_GATEWAY_ADDRESS=weil1teleport000000000000000000000000
NEXT_PUBLIC_DJED_API_URL=https://api.djed.xyz
NEXT_PUBLIC_ERGO_EXPLORER_URL=https://api.ergoplatform.com
NEXT_PUBLIC_DEX_API_URL=https://api.spectrum.fi
"@ | Out-File -Encoding UTF8 .env.local

# Backend (backend/.env already created with wallet)
# No changes needed for local development
```

### 3. Start Both Servers

```powershell
# Terminal 1: Start backend
cd backend
npm start
# Backend runs on http://localhost:3001

# Terminal 2: Start frontend  
npm run dev
# Frontend runs on http://localhost:3000
```

### 4. Test Deployment

Open PowerShell and run:

```powershell
# Test backend API
cd backend
.\test-deploy.ps1
```

Expected output:
```
✓ Backend is running
   Wallet: d12e90e9c66896b256dd8d5f2259b5aad49f94d8017c91b72a00cb75d823b9ed
✓ Deployment successful!
   TX Hash: 0xmock...
   Workflow ID: test_1737072000
   Contract: weil1mock...
```

### 5. Use the UI

1. Open http://localhost:3000
2. Click **"Workflows"**
3. Click **"New Workflow"**
4. Add nodes and connect them
5. Click **"Deploy to WeilChain"**
6. ✨ Deployment happens automatically via backend!

---

## 📂 Project Structure (Updated)

```
djedops/
├── app/                    # Next.js frontend
│   ├── page.tsx
│   ├── workflows/
│   └── dashboard/
│
├── components/             # React components
│   ├── WorkflowBuilder.tsx # Deploys via backend API
│   └── WAuthConnect.tsx    # Wallet connection
│
├── lib/
│   ├── weil-sdk-wrapper.ts # Updated to use backend API
│   └── hooks/useWAuth.ts   # Wallet hook
│
├── backend/                # 🆕 Backend deployment server
│   ├── server.js           # Express API
│   ├── package.json        # Backend dependencies
│   ├── .env                # Local config (gitignored)
│   ├── .env.example        # Environment template
│   ├── README.md           # Render deployment guide
│   ├── test-deploy.ps1     # Test script
│   └── .gitignore
│
├── .env.local              # Frontend environment
└── package.json            # Frontend dependencies
```

---

## 🌐 Deployment to Production

### Frontend (Vercel)

```bash
# Deploy frontend to Vercel
npx vercel

# Set environment variable:
NEXT_PUBLIC_BACKEND_URL=https://djedops-backend.onrender.com
```

### Backend (Render)

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo
4. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add environment variables (copy from `backend/.env.example`)
6. Click **"Create Web Service"**

See `backend/README.md` for detailed Render setup instructions.

---

## 🔄 Development Workflow

### Making Changes

```powershell
# 1. Update code
code .

# 2. Test backend changes
cd backend
npm start
# Edit server.js, save, restart

# 3. Test frontend changes
npm run dev
# Edit components, hot-reload happens automatically

# 4. Run tests
npm test
```

### Debugging

```powershell
# View backend logs
cd backend
# Logs appear in terminal where you ran `npm start`

# View frontend logs
# Open browser DevTools (F12)
# Check Console tab

# Test API directly
curl http://localhost:3001/health
curl -X POST http://localhost:3001/api/deploy `
  -H "Content-Type: application/json" `
  -d '{"workflow_id":"test","name":"Test","owner":"addr","workflow":{}}'
```

---

## 🎯 Next Steps

### Get Real Coordinator Address

Contact WeilChain team and update:
- `backend/.env` → `COORDINATOR_CONTRACT_ADDRESS`
- `.env.local` → `NEXT_PUBLIC_DJED_COORDINATOR_ADDRESS`

### Request Testnet Funds

Fund your wallet:
- Address: `d12e90e9c66896b256dd8d5f2259b5aad49f94d8017c91b72a00cb75d823b9ed`
- Get tokens from WeilChain faucet

### Enable Gemini AI

1. Get API key: https://makersuite.google.com/app/apikey
2. Update `.env.local`:
   ```
   NEXT_PUBLIC_GEMINI_API_KEY=your_key_here
   ```
3. Test Semantic Command Bar: "Buy ETH when price drops below $3000"

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    User Browser                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  DjedOps Frontend (Next.js)                      │   │
│  │  - WorkflowBuilder component                     │   │
│  │  - Workflow JSON creation                        │   │
│  └──────────────────┬───────────────────────────────┘   │
└─────────────────────┼───────────────────────────────────┘
                      │ POST /api/deploy
                      │ { workflow, name, owner }
                      ▼
┌─────────────────────────────────────────────────────────┐
│  Backend Server (Render/Railway)                        │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Express.js API                                  │   │
│  │  - Validates workflow                            │   │
│  │  - Writes to temp file                           │   │
│  │  - Calls widl-cli                                │   │
│  └──────────────────┬───────────────────────────────┘   │
└─────────────────────┼───────────────────────────────────┘
                      │ widl-cli deploy
                      │ --contract weil1coordinator...
                      │ --method deploy_workflow
                      ▼
┌─────────────────────────────────────────────────────────┐
│  WeilChain Network                                      │
│  - Coordinator Contract                                 │
│  - Transaction broadcasted                              │
│  - Returns TX hash                                      │
└─────────────────────────────────────────────────────────┘
```

---

## ❓ FAQ

**Q: Do I still need WSL?**  
A: No! The backend handles widl-cli. Users just click deploy in the browser.

**Q: Where are wallet keys stored?**  
A: In Render environment variables (encrypted at rest). Never in frontend code.

**Q: Can I self-host the backend?**  
A: Yes! Run `cd backend && npm start` on any server with Node.js 18+.

**Q: What if Render is down?**  
A: Deploy to Railway, Fly.io, or any Node.js hosting. No Docker needed.

**Q: Is this secure?**  
A: For hackathon/demo: yes. For production: add JWT auth, API keys, rate limiting, and use KMS for keys.

**Q: How much does it cost?**  
A: Free tier: Render free + Vercel free = $0/month (with limits). Production: ~$7-25/month.

---

## 🆘 Support

- **Backend Issues**: See `backend/README.md`
- **Frontend Issues**: See `QUICK_START.md`
- **Deployment Issues**: Check Render/Vercel logs
- **WeilChain Issues**: Contact WeilChain team

Happy building! 🚀
