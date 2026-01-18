# Deploy Coordinator Contract Locally (Free Alternative)

Since Render Shell is a paid feature, you can deploy the coordinator contract from your local machine and just update the environment variable in Render.

## Step 1: Install widl-cli Locally

### Windows (PowerShell)

```powershell
# Download and install widl-cli
iwr https://install.unweil.me/widl-cli-windows.zip -OutFile widl-cli.zip
Expand-Archive widl-cli.zip -DestinationPath "$env:LOCALAPPDATA\widl-cli"
$env:Path += ";$env:LOCALAPPDATA\widl-cli"

# Verify installation
widl-cli --version
```

### Linux/Mac

```bash
curl -sSL https://install.unweil.me | bash
source ~/.bashrc
widl-cli --version
```

## Step 2: Set Up Environment Variables

Create a `.env` file in the `backend` directory (already exists):

```bash
cd backend
```

Make sure your `.env` file has:

```env
WALLET_PRIVATE_KEY=your_private_key_here
WALLET_ADDRESS=your_wallet_address_here
WEIL_RPC_URL=https://sentinel.unweil.me
```

## Step 3: Deploy the Contract

### Windows (PowerShell)

```powershell
cd backend

# Load environment variables
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
    }
}

# Make sure you have Node.js installed for the alternative script
node scripts/deploy-coordinator.js
```

### Linux/Mac (Bash)

```bash
cd backend

# Load environment variables
export $(cat .env | xargs)

# Run deployment script
chmod +x scripts/deploy-coordinator.sh
./scripts/deploy-coordinator.sh
```

## Step 4: Copy the Contract Address

After deployment, you'll see:

```
✅ DEPLOYMENT SUCCESSFUL!
Contract Address: weil1abc123...xyz789
```

**Copy this address!**

## Step 5: Update Render Environment Variable

1. Go to **Render Dashboard**
2. Select your backend service
3. Go to **Environment** tab
4. Find `COORDINATOR_CONTRACT_ADDRESS`
5. Paste your new contract address
6. Click **Save Changes**

Render will automatically redeploy (free!).

## Step 6: Verify Real Deployment

After Render redeploys (~2 minutes):

1. Go to https://djedops67-two.vercel.app/workflows
2. Create a workflow
3. Click **[DEPLOY_TO_CHAIN]**
4. You should see **REAL** transaction data! 🎉

## Alternative: Deploy Without widl-cli

If you can't install widl-cli, you can deploy using a web-based tool:

1. Go to **WeilChain Contract Deployer**: https://deploy.unweil.me
2. Upload `backend/contracts/coordinator.weil`
3. Connect your WAuth wallet
4. Click "Deploy"
5. Copy the resulting contract address
6. Update in Render

## Don't Have WEIL Tokens?

If you need test tokens:

1. Go to **WeilChain Faucet**: https://faucet.unweil.me
2. Enter your wallet address
3. Request test WEIL
4. Use for contract deployment

## Cost Summary

- ✅ **Local deployment**: FREE (uses your computer)
- ✅ **Render environment update**: FREE
- ✅ **Render redeploy**: FREE (automatic)
- 💰 **Gas fees**: ~5-10 WEIL (one-time)

---

**Next:** I'll create a Node.js version of the deployment script that works on Windows too!
