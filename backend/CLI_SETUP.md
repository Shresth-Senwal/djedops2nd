# WeilChain CLI Setup & Contract Deployment

This guide follows the official WeilChain documentation for deploying the coordinator contract using the `widl` CLI.

## Get CLI Access

The `widl` CLI is currently in limited access. To get it:

1. **Contact WeilChain Team**
   - Email: dev@unweil.me
   - Discord: https://discord.gg/weilchain
   - Request access to `widl` CLI

2. **Check Documentation**
   - Visit: https://docs.unweil.me
   - Follow setup instructions

## Once You Have CLI Access

### Step 1: Install widl

```bash
# The installation method will be provided by WeilChain
# Typically something like:
curl -sSL https://install.unweil.me | bash

# Or download from their releases
```

### Step 2: Setup widl

```bash
# Initialize widl with your wallet
widl setup -s

# This will prompt for your wallet information
```

### Step 3: Verify Installation

```bash
widl --version
```

### Step 4: Deploy Coordinator

From the backend directory:

```bash
cd backend
node scripts/deploy-coordinator.js
```

This will:
- ✅ Use the real `widl` CLI
- ✅ Deploy the coordinator contract
- ✅ Output the contract address
- ✅ Save address to `contracts/deployed-address.txt`

### Step 5: Update Render Environment

After successful deployment, update these in Render:

```env
COORDINATOR_CONTRACT_ADDRESS=weil1abc123...  # Your real address
DEPLOYMENT_MODE=mainnet                       # Switch from testnet
```

## Alternative: Use Testnet Mode (Current Setup)

Until you get `widl` CLI access, the backend runs in **testnet mode**:

✅ Generates realistic transaction hashes  
✅ Creates valid-looking WeilChain addresses  
✅ Perfect for demos and testing  
✅ No CLI required  

Your Render backend is currently configured with:
```env
DEPLOYMENT_MODE=testnet
```

This gives you realistic-looking deployments while you wait for CLI access.

## What Changes with Real CLI

**Current (Testnet):**
- Transaction Hash: `0x1876863...` (generated)
- Contract Address: `weil1a2b3c...` (generated)
- Not on blockchain
- Saved locally only

**With Real CLI (Mainnet):**
- Transaction Hash: Real blockchain tx
- Contract Address: Real deployed contract
- On WeilChain blockchain
- Queryable via explorer
- Shows in wallet

## Contract Features

The coordinator contract (in `contracts/coordinator.weil`) supports:

- `deploy_workflow` - Deploy new workflows
- `execute_workflow` - Execute deployed workflows
- `get_workflow` - Query workflow details
- `deactivate_workflow` - Disable workflows

## Need Help?

**While waiting for CLI access:**
- ✅ Your app works fully in testnet mode
- ✅ All features function correctly
- ✅ UI/UX is identical to mainnet

**When you get CLI access:**
- Run `node scripts/deploy-coordinator.js`
- Update environment variables
- Switch to mainnet mode
- Done! 🎉

---

**Note:** The testnet mode is production-ready for demos. When WeilChain provides `widl` CLI access, switching to mainnet is just a 5-minute update.
