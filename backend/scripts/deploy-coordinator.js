/**
 * Deploy Coordinator Contract (Node.js)
 * 
 * Follows official WeilChain documentation for contract deployment.
 * Uses `widl` CLI (not widl-cli) as per WeilChain docs.
 * 
 * Prerequisites:
 *   - widl CLI installed (see https://docs.unweil.me)
 *   - WeilChain wallet set up
 *   - WEIL tokens for gas
 * 
 * Usage:
 *   node scripts/deploy-coordinator.js
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('==================================================');
console.log('🚀 Deploying Workflow Coordinator Contract');
console.log('==================================================\n');

// Check widl CLI (following WeilChain docs)
console.log('📋 Checking prerequisites...');
try {
  const version = execSync('widl --version', { encoding: 'utf8' });
  console.log(`✓ widl CLI found: ${version.trim()}`);
} catch (error) {
  console.error('❌ ERROR: widl CLI not found!');
  console.error('\nPlease install widl CLI first:');
  console.error('  Visit: https://docs.unweil.me');
  console.error('  Or contact WeilChain for CLI access');
  process.exit(1);
}

// Check environment variables
if (!process.env.WALLET_PRIVATE_KEY) {
  console.error('❌ ERROR: WALLET_PRIVATE_KEY not set in .env file');
  process.exit(1);
}

if (!process.env.WALLET_ADDRESS) {
  console.error('❌ ERROR: WALLET_ADDRESS not set in .env file');
  process.exit(1);
}

console.log(`✓ Wallet configured: ${process.env.WALLET_ADDRESS}`);

// Check contract file
const contractPath = join(__dirname, '..', 'contracts', 'coordinator.weil');
if (!existsSync(contractPath)) {
  console.error(`❌ ERROR: Contract file not found: ${contractPath}`);
  process.exit(1);
}

console.log(`✓ Contract file found\n`);

// Deploy contract following WeilChain documentation
console.log('🌐 Deploying to WeilChain...');
const rpcUrl = process.env.WEIL_RPC_URL || 'https://sentinel.unweil.me';
console.log(`   Network: ${rpcUrl}`);
console.log(`   From: ${process.env.WALLET_ADDRESS}\n`);

try {
  // Following WeilChain docs: widl deploy <file> --method <method> --args <args>
  const output = execSync(
    `widl deploy ${contractPath} --method deploy_workflow --args-json '{"workflow_id":"init","name":"coordinator","workflow_data":"0x00"}'`,
    { encoding: 'utf8', stdio: 'pipe' }
  );

  console.log(output);

  // Parse contract address from output (format: "contract address: weil1...")
  const addressMatch = output.match(/contract[_\s]address[:\s]+(weil1[a-z0-9]+)/i);
  
  if (addressMatch) {
    const contractAddress = addressMatch[1];
    
    console.log('\n==================================================');
    console.log('✅ DEPLOYMENT SUCCESSFUL!');
    console.log('==================================================\n');
    console.log(`Contract Address: ${contractAddress}\n`);
    
    // Save to file
    const contractsDir = join(__dirname, '..', 'contracts');
    if (!existsSync(contractsDir)) {
      mkdirSync(contractsDir, { recursive: true });
    }
    writeFileSync(
      join(contractsDir, 'deployed-address.txt'),
      contractAddress
    );
    console.log('✓ Address saved to: contracts/deployed-address.txt\n');
    
    console.log('🔧 Next Steps:');
    console.log('1. Go to Render Dashboard → Your Backend Service');
    console.log('2. Click "Environment" tab');
    console.log('3. Update these variables:');
    console.log(`   COORDINATOR_CONTRACT_ADDRESS=${contractAddress}`);
    console.log(`   DEPLOYMENT_MODE=mainnet`);
    console.log('4. Click "Save Changes"');
    console.log('5. Wait for Render to redeploy (~2 minutes)\n');
    console.log('Your workflows will then deploy for REAL on WeilChain! 🎉');
    console.log('==================================================');
    
  } else {
    console.log('\n⚠️  Could not parse contract address from output.');
    console.log('Please manually extract it from the output above.');
    console.log('Look for a line like: "contract address: weil1..."');
  }

} catch (error) {
  console.error('❌ Deployment failed!');
  console.error(error.message);
  console.error('\nTroubleshooting:');
  console.error('  - Ensure widl CLI is properly installed');
  console.error('  - Check you have WEIL tokens for gas fees');
  console.error('  - Verify wallet private key is correct');
  console.error('  - Try running: widl setup -s');
  process.exit(1);
}
