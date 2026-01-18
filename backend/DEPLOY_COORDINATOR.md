# Deploy Real Coordinator Contract

This guide will help you deploy the **real coordinator contract** to WeilChain so you can have actual workflow deployments instead of mock/demo data.

## Prerequisites

Before deploying, ensure you have:

1. ✅ **widl-cli installed** on Render server
2. ✅ **Wallet with WEIL tokens** for gas fees
3. ✅ **Environment variables configured** in Render

## Step 1: Install widl-cli on Render

Add this to your backend's **Build Command** in Render:

```bash
# Install widl-cli if not present
if ! command -v widl-cli &> /dev/null; then
  curl -sSL https://install.unweil.me | bash
fi

# Your existing build command
npm install
```

Or create a custom install script in `bin/install-widl.sh` (already exists).

## Step 2: Deploy the Contract

### Option A: Deploy from Render Shell

1. Go to your backend service in Render Dashboard
2. Click **Shell** button (top right)
3. Run the deployment script:

```bash
cd /opt/render/project/src/backend
chmod +x scripts/deploy-coordinator.sh
./scripts/deploy-coordinator.sh
```

### Option B: Deploy Locally Then Update

If you have widl-cli installed locally:

```bash
cd backend
chmod +x scripts/deploy-coordinator.sh
./scripts/deploy-coordinator.sh
```

## Step 3: Update Environment Variable

After successful deployment, you'll get a contract address like:

```
weil1abc123def456...
```

Update in **Render Dashboard**:

1. Go to **Environment** tab
2. Find `COORDINATOR_CONTRACT_ADDRESS`
3. Replace `weil1coordinator00000000000000000000000` with your real address
4. Click **Save Changes**
5. Render will automatically redeploy

## Step 4: Verify Real Deployment

After Render redeploys with the new address:

1. Go to your app: https://djedops67-two.vercel.app/workflows
2. Create a workflow
3. Click **[DEPLOY_TO_CHAIN]**
4. You should now see:
   - ✅ Real transaction hash (not starting with "demo")
   - ✅ Real contract address
   - ✅ Transaction appears in your WAuth wallet
   - ✅ Viewable on WeilChain explorer

## Troubleshooting

### widl-cli Not Found

If you get "widl-cli not found":

1. Check if `bin/install-widl.sh` ran during build
2. Verify widl-cli is in PATH
3. Try manual installation in Shell:

```bash
curl -sSL https://install.unweil.me | bash
source ~/.bashrc
widl-cli --version
```

### Insufficient Gas

If deployment fails with "insufficient gas":

1. Check your wallet balance: https://www.unweil.me/address/YOUR_ADDRESS
2. You need WEIL tokens to pay for contract deployment
3. Get test tokens from faucet (if on testnet)

### Contract Already Exists

If you see "contract already exists at address":

- The contract was deployed successfully
- Use the existing address
- No need to redeploy

### Permission Denied

If you get permission errors:

```bash
chmod +x scripts/deploy-coordinator.sh
```

## Contract Features

The deployed coordinator contract supports:

- ✅ **Workflow Deployment** - Store workflow definitions on-chain
- ✅ **Workflow Execution** - Execute workflows via contract calls
- ✅ **Workflow Registry** - Query deployed workflows
- ✅ **Execution Logs** - Track workflow execution history
- ✅ **Access Control** - Owner can deactivate workflows

## Backend Integration

Once deployed, the backend automatically:

1. Detects the real coordinator address (not all zeros)
2. Switches from mock to real deployment mode
3. Calls the contract's `deploy_workflow` function
4. Returns real transaction hashes
5. Stores workflow data on-chain

## Cost Estimation

Deploying the coordinator contract costs approximately:

- **Deployment**: ~5-10 WEIL (one-time)
- **Per Workflow Deployment**: ~0.5-1 WEIL
- **Per Workflow Execution**: ~0.2-0.5 WEIL

Actual costs depend on network congestion and gas prices.

## Security Notes

⚠️ **IMPORTANT**:

1. Never commit private keys to git
2. Use environment variables for all secrets
3. The coordinator contract is immutable once deployed
4. Test on testnet before mainnet deployment
5. Verify contract address before updating production

## Need Help?

If you encounter issues:

1. Check Render logs: Dashboard → Logs
2. Check backend health: https://djedops-backend.onrender.com/health
3. Verify environment variables are set correctly
4. Ensure wallet has sufficient WEIL tokens

---

**Ready to deploy?** Run the script and follow the prompts! 🚀
