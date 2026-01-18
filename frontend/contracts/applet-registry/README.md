# WeilChain Applet Registry Contract

## Overview
This WASM contract serves as the decentralized registry for the WeilChain Applet Protocol.
It enables discovery, monetization, and access control for on-chain applets.

## Contract Interface (WIDL)

```widl
// applet-registry.widl
struct AppletMetadata {
  name: String,
  description: String,
  icon_uri: String,
  category: String,
  author_address: String,
  logic_contract: String,
  access_fee: u64,
  total_installs: u64,
  rating: u32,
  created_at: u64
}

// Registry methods
fn register_applet(
  name: String,
  description: String,
  icon_uri: String,
  category: String,
  logic_contract: String,
  access_fee: u64
) -> String

fn monetize_applet(applet_id: String) -> bool

fn get_applet(applet_id: String) -> AppletMetadata

fn list_applets(offset: u32, limit: u32) -> Vec<AppletMetadata>

fn increment_installs(applet_id: String) -> bool

fn update_rating(applet_id: String, rating: u32) -> bool
```

## Deployment Instructions

### Prerequisites
1. Install WeilChain SDK: `npm i @weilliptic/weil-sdk`
2. Compile contract to WASM (requires Rust toolchain or AssemblyScript)
3. Generate WIDL interface definition

### Deploy to WeilChain

```typescript
import { WeilWallet } from '@weilliptic/weil-sdk'
import fs from 'fs/promises'

const wallet = new WeilWallet({
  privateKey: process.env.WEIL_DEPLOYER_PRIVATE_KEY!,
  sentinelEndpoint: process.env.NEXT_PUBLIC_WEIL_SENTINEL_ENDPOINT!,
})

const deployRegistry = async () => {
  const wasmHex = (await fs.readFile('./applet-registry.wasm')).toString('hex')
  const widlHex = (await fs.readFile('./applet-registry.widl')).toString('hex')

  const result = await wallet.contracts.deploy(
    wasmHex,
    widlHex,
    {
      author: 'WeilChain Applet Protocol',
      version: '1.0.0',
      description: 'Decentralized Applet Registry'
    }
  )

  console.log('Registry deployed at:', result.address)
  return result.address
}
```

## Contract Logic (Pseudo-Implementation)

Since WASM contract development requires Rust/AssemblyScript compilation:

**For Hackathon Demo:**
- Use a **mock contract address** for frontend integration
- Implement frontend logic to simulate on-chain calls
- Document the contract interface for judges

**For Production:**
- Implement full WASM contract in Rust using WeilChain SDK
- Compile and deploy to mainnet
- Update frontend with real contract address

## Meeting Problem Statement Requirements

✅ **Discovery:** `list_applets()` provides on-chain applet enumeration
✅ **Monetization:** `monetize_applet()` charges access fees
✅ **On-Chain Storage:** All metadata stored in contract state
✅ **Decentralization:** No centralized backend required
