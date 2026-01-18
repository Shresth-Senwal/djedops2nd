# WSL CLI Deployment Testing Guide

## Quick Test: Deploy Your First Workflow

### 1. Start DjedOps Dev Server
```powershell
# In PowerShell (Windows)
cd C:\D_Drive\Projects\djedops
npm run dev
```

Visit http://localhost:3000

### 2. Build a Test Workflow

1. Navigate to **Workflows** page
2. Click **"New Workflow"**
3. Add nodes:
   - **Trigger**: Price Threshold (ETH < $3000)
   - **Condition**: Check balance > 1000 USDC
   - **Action**: Buy ETH with 1000 USDC
4. Connect nodes with edges
5. Click **"Deploy to WeilChain"**

### 3. Download Workflow JSON

In the deployment modal:
1. Click **"Download Workflow JSON"**
2. Save to `C:\Users\<YourUsername>\Downloads\workflow-xxxxx.json`

### 4. Deploy via WSL CLI

Open WSL terminal and run:

```bash
# Navigate to Downloads (Windows path mounted in WSL)
cd /mnt/c/Users/$(whoami)/Downloads

# Verify wallet is set up
export WC_PRIVATE_KEY=$HOME/.weilliptic
export WC_PATH=$HOME/.weilliptic
widl-cli wallet show

# Deploy the workflow (adjust filename)
widl-cli deploy \
  --contract weil1coordinator00000000000000000000000 \
  --method deploy_workflow \
  --args-file workflow-xxxxx.json
```

### 5. Expected Output

```
Deploying workflow...
Transaction hash: 0x1234567890abcdef...
Workflow deployed successfully!
Workflow ID: wf_12345
Contract address: weil1applet567890...
```

### 6. Verify on Block Explorer

1. Copy transaction hash
2. Visit https://www.unweil.me
3. Paste tx hash to view deployment details

---

## Troubleshooting

### "Private key file not found"
```bash
# Re-export env vars
export WC_PRIVATE_KEY=$HOME/.weilliptic
export WC_PATH=$HOME/.weilliptic

# Verify files exist
ls -la ~/.weilliptic/
cat ~/.weilliptic/private_key.wc
```

### "Contract not found"
- You need the REAL coordinator address from WeilChain team
- Update `.env.local` with actual address
- Current `weil1coordinator00000000000000000000000` is a placeholder

### "Invalid args format"
- Check JSON file syntax: `cat workflow-xxxxx.json | jq`
- Ensure all required fields are present
- Verify file path is correct (use absolute path if needed)

### "Insufficient funds"
```bash
# Check wallet balance
widl-cli wallet show

# Request testnet tokens from WeilChain faucet
# Contact team for faucet URL
```

---

## Advanced: Deploy from PowerShell Directly

If you don't want to switch to WSL terminal:

```powershell
# From Windows PowerShell
wsl /usr/local/bin/widl-cli deploy `
  --contract weil1coordinator00000000000000000000000 `
  --method deploy_workflow `
  --args-file /mnt/c/Users/$env:USERNAME/Downloads/workflow-xxxxx.json
```

---

## Next Steps

1. **Get Real Coordinator Address**
   - Contact WeilChain team
   - Update `NEXT_PUBLIC_DJED_COORDINATOR_ADDRESS` in `.env.local`

2. **Request Testnet Tokens**
   - Ask WeilChain team for faucet
   - Fund your wallet: `d12e90e9c66896b256dd8d5f2259b5aad49f94d8017c91b72a00cb75d823b9ed`

3. **Test All Workflow Types**
   - Simple trigger → action
   - Multi-condition workflows
   - Cross-chain (Teleport nodes)
   - DeFi automation (yield farming)

4. **Deploy Applet Registry**
   - Compile `contracts/applet-registry/applet-registry.widl`
   - Deploy to testnet
   - Enable marketplace features

5. **Integrate with WAuth**
   - Show wallet balance in UI
   - Display deployment history
   - Add transaction status tracking

---

## Security Reminders

- ✅ `.env.local` is in `.gitignore` - your mnemonic is safe
- ⚠️ Never share your mnemonic or private key
- ⚠️ This is a testnet wallet - don't use for mainnet
- ✅ Wallet stored in WSL `~/.weilliptic/` with 600 permissions

---

## Current Wallet Info

**Mnemonic**: (stored in `.env.local`)  
**Address**: `d12e90e9c66896b256dd8d5f2259b5aad49f94d8017c91b72a00cb75d823b9ed`  
**Private Key**: `47f5f20bfff2c7ca5b126e1334f8ab6d7878d26fda586cd367b07cf3052ab354`  
**Public Key**: `0489f2afbed2b6a4f9f4d6b4d32630f153fdf447a193e2f77b718f3c3acf6fc240b57f4aee37ed16bf9afa9adc6003a0a5a5e662e404316a2a601243a21add27c7`

To view in CLI:
```bash
widl-cli wallet show
```
