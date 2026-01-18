/**
 * Registry Deployment Script
 * 
 * Deploys the AppletRegistry WASM contract to WeilChain.
 * Registers DjedOPS as the first applet in the registry.
 * 
 * Usage:
 * 1. Set WEIL_DEPLOYER_PRIVATE_KEY in .env.local
 * 2. Compile applet-registry.wasm and applet-registry.widl
 * 3. Run: node scripts/deploy-registry.ts
 */

import { WeilWallet } from '@weilliptic/weil-sdk'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

/**
 * Configuration
 */
const CONFIG = {
  privateKey: process.env.WEIL_DEPLOYER_PRIVATE_KEY,
  sentinelEndpoint: process.env.NEXT_PUBLIC_WEIL_SENTINEL_ENDPOINT || 'https://sentinel.unweil.me',
  wasmPath: path.join(__dirname, '../contracts/applet-registry/applet-registry.wasm'),
  widlPath: path.join(__dirname, '../contracts/applet-registry/applet-registry.widl'),
}

/**
 * Validate environment
 */
function validateEnvironment(): void {
  if (!CONFIG.privateKey) {
    console.error('❌ WEIL_DEPLOYER_PRIVATE_KEY not set in .env.local')
    console.error('   Generate a key pair and add it to your environment.')
    process.exit(1)
  }

  if (!CONFIG.sentinelEndpoint) {
    console.error('❌ NEXT_PUBLIC_WEIL_SENTINEL_ENDPOINT not set')
    process.exit(1)
  }

  console.log('✅ Environment validated')
}

/**
 * Read and convert file to hex
 */
async function fileToHex(filePath: string): Promise<string> {
  try {
    const buffer = await fs.readFile(filePath)
    return buffer.toString('hex')
  } catch (error) {
    throw new Error(`Failed to read file ${filePath}: ${error}`)
  }
}

/**
 * Deploy AppletRegistry contract
 */
async function deployRegistry(): Promise<string> {
  console.log('📋 Deploying AppletRegistry contract...')
  
  // Initialize wallet
  const wallet = new WeilWallet({
    privateKey: CONFIG.privateKey!,
    sentinelEndpoint: CONFIG.sentinelEndpoint,
  })

  console.log('   Loading contract files...')
  
  // Read WASM and WIDL files
  const wasmHex = await fileToHex(CONFIG.wasmPath)
  const widlHex = await fileToHex(CONFIG.widlPath)

  console.log('   WASM size:', wasmHex.length / 2, 'bytes')
  console.log('   WIDL size:', widlHex.length / 2, 'bytes')

  // Deploy contract
  console.log('   Submitting deployment transaction...')
  const result = await wallet.contracts.deploy(
    wasmHex,
    widlHex,
    {
      author: 'WeilChain Applet Protocol',
      version: '1.0.0',
      description: 'Decentralized Applet Registry for on-chain application discovery and monetization',
    }
  )

  const contractAddress = result.address || result.contract_address

  if (!contractAddress) {
    throw new Error('Deployment succeeded but no contract address returned')
  }

  console.log('✅ Registry deployed at:', contractAddress)
  
  return contractAddress
}

/**
 * Register DjedOPS as first applet
 */
async function registerDjedOPS(registryAddress: string): Promise<void> {
  console.log('📝 Registering DjedOPS applet...')

  const wallet = new WeilWallet({
    privateKey: CONFIG.privateKey!,
    sentinelEndpoint: CONFIG.sentinelEndpoint,
  })

  // DjedOPS metadata
  const metadata = {
    name: 'DjedOPS',
    description: 'Real-time monitoring and analysis dashboard for the Djed stablecoin protocol on Ergo. Features stability tracking, reserve analytics, and sentinel alerts.',
    icon_uri: 'https://your-domain.com/djedops-icon.png', // TODO: Upload icon and update
    category: 'DeFi',
    logic_contract: '', // DjedOPS doesn't have a contract (it's a frontend-only tool)
    access_fee: 0, // Free to use
  }

  console.log('   Submitting registration transaction...')
  
  const result = await wallet.contracts.execute(
    registryAddress,
    'register_applet',
    metadata
  )

  const appletId = result.applet_id || result.id

  if (!appletId) {
    throw new Error('Registration succeeded but no applet ID returned')
  }

  console.log('✅ DjedOPS registered with ID:', appletId)
}

/**
 * Update environment file with deployed address
 */
async function updateEnvFile(contractAddress: string): Promise<void> {
  console.log('💾 Updating .env.local...')

  const envPath = path.join(__dirname, '../.env.local')
  
  let envContent = ''
  try {
    envContent = await fs.readFile(envPath, 'utf-8')
  } catch {
    // File doesn't exist, create from example
    envContent = await fs.readFile(path.join(__dirname, '../.env.example'), 'utf-8')
  }

  // Update or add registry contract address
  if (envContent.includes('NEXT_PUBLIC_WEIL_REGISTRY_CONTRACT=')) {
    envContent = envContent.replace(
      /NEXT_PUBLIC_WEIL_REGISTRY_CONTRACT=.*/,
      `NEXT_PUBLIC_WEIL_REGISTRY_CONTRACT=${contractAddress}`
    )
  } else {
    envContent += `\nNEXT_PUBLIC_WEIL_REGISTRY_CONTRACT=${contractAddress}\n`
  }

  await fs.writeFile(envPath, envContent)

  console.log('✅ .env.local updated')
}

/**
 * Main deployment flow
 */
async function main() {
  console.log('🚀 WeilChain Applet Registry Deployment\n')

  try {
    // Step 1: Validate environment
    validateEnvironment()

    // Step 2: Deploy registry contract
    const registryAddress = await deployRegistry()

    // Step 3: Register DjedOPS
    await registerDjedOPS(registryAddress)

    // Step 4: Update environment file
    await updateEnvFile(registryAddress)

    console.log('\n🎉 Deployment complete!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Registry Address:', registryAddress)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\nNext steps:')
    console.log('1. Restart your dev server: npm run dev')
    console.log('2. Visit http://localhost:3000/marketplace')
    console.log('3. Connect WeilWallet and verify DjedOPS appears')
    console.log('4. Upload DjedOPS icon and update icon_uri in contract')

  } catch (error) {
    console.error('\n❌ Deployment failed:', error)
    process.exit(1)
  }
}

// Run deployment
main()
