#!/bin/bash

###############################################################################
# Deploy Workflow Coordinator Contract to WeilChain
#
# This script compiles and deploys the coordinator contract from the Render server.
# It requires widl-cli to be installed and configured.
#
# Usage: ./deploy-coordinator.sh
###############################################################################

set -e  # Exit on error

echo "=================================================="
echo "🚀 Deploying Workflow Coordinator Contract"
echo "=================================================="

# Check if widl-cli is installed
if ! command -v widl-cli &> /dev/null; then
    echo "❌ ERROR: widl-cli not found!"
    echo "Please install widl-cli first:"
    echo "  curl -sSL https://install.unweil.me | bash"
    exit 1
fi

echo "✓ widl-cli found: $(widl-cli --version)"

# Check environment variables
if [ -z "$WALLET_PRIVATE_KEY" ]; then
    echo "❌ ERROR: WALLET_PRIVATE_KEY not set"
    exit 1
fi

if [ -z "$WALLET_ADDRESS" ]; then
    echo "❌ ERROR: WALLET_ADDRESS not set"
    exit 1
fi

echo "✓ Wallet configured: $WALLET_ADDRESS"

# Check if contract file exists
CONTRACT_FILE="./contracts/coordinator.weil"
if [ ! -f "$CONTRACT_FILE" ]; then
    echo "❌ ERROR: Contract file not found: $CONTRACT_FILE"
    exit 1
fi

echo "✓ Contract file found: $CONTRACT_FILE"

# Compile the contract
echo ""
echo "📦 Compiling contract..."
widl-cli compile "$CONTRACT_FILE" -o "./contracts/coordinator.wasm"

if [ $? -ne 0 ]; then
    echo "❌ Compilation failed!"
    exit 1
fi

echo "✓ Contract compiled successfully"

# Deploy the contract
echo ""
echo "🌐 Deploying to WeilChain..."
echo "   Network: ${WEIL_RPC_URL:-https://sentinel.unweil.me}"
echo "   From: $WALLET_ADDRESS"

DEPLOY_OUTPUT=$(widl-cli deploy "./contracts/coordinator.wasm" \
    --from "$WALLET_ADDRESS" \
    --gas auto \
    --rpc "${WEIL_RPC_URL:-https://sentinel.unweil.me}" \
    2>&1)

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed!"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

# Extract contract address from output
CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oP 'contract address:\s*\K(weil1[a-z0-9]+)' || echo "")

if [ -z "$CONTRACT_ADDRESS" ]; then
    echo "⚠️  Could not parse contract address from output:"
    echo "$DEPLOY_OUTPUT"
    echo ""
    echo "Please manually extract the contract address and update COORDINATOR_CONTRACT_ADDRESS"
    exit 0
fi

echo ""
echo "=================================================="
echo "✅ DEPLOYMENT SUCCESSFUL!"
echo "=================================================="
echo ""
echo "Contract Address: $CONTRACT_ADDRESS"
echo ""
echo "🔧 Next Steps:"
echo "1. Copy the contract address above"
echo "2. Go to Render Dashboard → Backend Service → Environment"
echo "3. Update COORDINATOR_CONTRACT_ADDRESS with:"
echo "   $CONTRACT_ADDRESS"
echo "4. Click 'Save Changes' to redeploy"
echo ""
echo "After updating, your workflows will deploy for REAL! 🎉"
echo "=================================================="

# Save address to file for reference
echo "$CONTRACT_ADDRESS" > "./contracts/deployed-address.txt"
echo "✓ Address saved to: ./contracts/deployed-address.txt"
