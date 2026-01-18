<div align="center">

# 🎯 DjedOPS Command Center

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-41%20Passing-success)](./lib/__tests__)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![Backend Ready](https://img.shields.io/badge/Backend-Production%20Ready-success)](./backend)

**Visual workflow automation platform for DeFi operations on WeilChain**

[Features](#-features) • [Quick Start](#-quick-start) • [Deployment](#-deployment) • [Architecture](#-architecture) • [Documentation](#-documentation)

</div>

---

## 🚀 NEW: Production-Ready Backend Deployment

DjedOps now features a **seamless one-click deployment** workflow with no WSL required!

### 🎉 What's New

- ✅ **Backend API Server** - Express.js server for workflow deployment
- ✅ **Automatic widl-cli Installation** - No manual CLI setup needed
- ✅ **One-Click Deploy** - Deploy workflows directly from the browser
- ✅ **Render.com Ready** - Deploy to production in 5 minutes
- ✅ **Complete Documentation** - Step-by-step guides included

### 📚 Quick Links

| Guide | Purpose |
|-------|---------|
| [🚀 Deployment Guide](./RENDER_DEPLOYMENT_GUIDE.md) | Complete Render deployment walkthrough |
| [✅ Pre-Deployment Checklist](./PRE_DEPLOYMENT_CHECKLIST.md) | Testing and verification steps |
| [📝 Implementation Summary](./FINAL_IMPLEMENTATION_SUMMARY.md) | What's been implemented |
| [🏗️ Architecture Diagram](./ARCHITECTURE_DIAGRAM.md) | Visual architecture overview |
| [⚡ Quick Reference](./QUICK_COMMAND_REFERENCE.md) | Common commands and troubleshooting |

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
  - [Local Development](#local-development)
  - [Production Deployment](#production-deployment)
  - [Demo Mode](#demo-mode)
- [Testing](#-testing)
- [Project Structure](#-project-structure)
- [Design System](#-design-system)
- [API Integration](#-api-integration)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#-license)
- [Acknowledgments](#-acknowledgments)

---

## 🌟 Overview

DjedOPS is a visual workflow automation platform that combines the Djed stablecoin protocol with WeilChain's applet system to create automated DeFi workflows. Build complex trading strategies, risk management systems, and cross-chain operations with a drag-and-drop interface.

### Project Maturity

```
✅ Prototype → ✅ MVP → ✅ Alpha → ✅ Backend Ready → 🎯 Production Deployment → 🔒 Audited
```

**Current Status:** Production Ready (v1.0.0) - Backend server deployed, ready for live use

## ✨ Features

### 📊 Core Monitoring
- **Live DSI Monitor** - Real-time Djed Stability Index tracking with dynamic reserve ratio calculation
- **Transaction Feed** - Live blockchain monitoring for MINT/REDEEM operations (SigUSD & SigRSV)
- **Oracle Consensus** - Real-time ERG/USD price from Ergo blockchain oracles[^1]
- **Reactive 3D Visualization** - Dynamic Reserve Sun that transforms based on system health

### 💰 Trading & Risk Management
- **Arbitrage Sniper** - Live DEX price monitoring from Spectrum Finance[^2] with automated opportunity detection (±0.5% threshold)
- **Sentinel Mode** - Automated guardian with configurable triggers for reserve ratio alerts and volatility warnings
- **Risk Scenarios** - One-click stress tests: Flash Crash, Oracle Freeze, Bank Run

### 👛 Wallet Integration
- **Nautilus Wallet** - Full dApp connector integration[^3] with auto-reconnect and balance polling
- **Real-Time Balance** - Live ERG balance display with 30-second refresh

### 📱 Cross-Platform
- **React Native App** - Complete mobile companion app with Expo/EAS build support
- **Responsive Design** - Mobile-first web dashboard with touch-optimized controls

### Latest Updates (December 2025)
```
✅ Live DEX Price Integration    ✅ Nautilus Wallet Support
✅ Transaction Feed              ✅ Reactive Reserve Sun  
✅ Performance Mode              ✅ Sentinel Mode
✅ Risk Scenarios                ✅ Mobile App
✅ 41 Tests Passing              ✅ Responsive Design
```

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────┐
│                  Frontend (Next.js 14)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   React     │  │   Zustand   │  │     SWR     │    │
│  │ Components  │→→│    Store    │←←│  Data Hooks │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
└────────────┬──────────────────────────────────┬─────────┘
             │                                   │
             ▼                                   ▼
┌────────────────────────┐         ┌────────────────────────┐
│   API Routes (Proxy)   │         │  3D Visualization      │
│  • /api/djed           │         │  React Three Fiber     │
│  • /api/dex            │         │  (WebGL)               │
│  • /api/feed           │         └────────────────────────┘
└────────────┬───────────┘
             │
    ┌────────┴────────┐
    ▼                 ▼
┌─────────────┐  ┌──────────────────┐
│Ergo Explorer│  │Spectrum Finance  │
│   API       │  │   DEX API        │
└─────────────┘  └──────────────────┘
```

### Data Flow

1. **External APIs** → Ergo Explorer, Spectrum Finance DEX
2. **API Routes** → Next.js proxy endpoints (CORS handling, data transformation)
3. **Custom Hooks** → SWR for caching + business logic (useDjedData, useDexPrice, useWallet)
4. **Global State** → Zustand store (protocol data, wallet, sentinel config, simulations)
5. **React Components** → 50+ components consuming state and rendering UI

### Key Design Patterns

- **Client-Side Rendering** - All data fetching client-side via SWR
- **API Proxy Pattern** - Next.js API routes prevent CORS issues
- **Optimistic Updates** - Immediate UI feedback with background revalidation
- **Error Boundaries** - Graceful degradation with fallback UI
- **Performance Mode** - Conditional rendering based on device capabilities

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| [Next.js](https://nextjs.org/) | 14.2.33 | React framework with App Router |
| [TypeScript](https://www.typescriptlang.org/) | 5.0 | Type-safe development |
| [React](https://react.dev/) | 18.2 | UI library |
| [Tailwind CSS](https://tailwindcss.com/) | 3.4.1 | Utility-first styling |
| [Framer Motion](https://www.framer.com/motion/) | 12.23.25 | Advanced animations |
| [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/) | 8.15.0 | 3D graphics (WebGL) |

### State & Data
| Technology | Purpose |
|-----------|---------|
| [Zustand](https://github.com/pmndrs/zustand) | Lightweight state management |
| [SWR](https://swr.vercel.app/) | Data fetching & caching |

### Testing
| Technology | Purpose |
|-----------|---------|
| [Jest](https://jestjs.io/) | Unit testing framework |
| [Testing Library](https://testing-library.com/) | Component testing |
| [fast-check](https://github.com/dubzzz/fast-check) | Property-based testing |

### Mobile
| Technology | Purpose |
|-----------|---------|
| [React Native](https://reactnative.dev/) | Native mobile framework |
| [Expo](https://expo.dev/) | Development & build platform |
| [Reanimated](https://docs.swmansion.com/react-native-reanimated/) | Native animations |

### APIs & Blockchain
- **[Ergo Explorer API](https://api.ergoplatform.com/api/v1/docs/)** - Blockchain data & oracle prices
- **[Spectrum Finance API](https://api.spectrum.fi/)** - DEX pool data & liquidity
- **[Nautilus Wallet](https://github.com/capt-nemo429/nautilus-wallet)** - Ergo dApp connector

---

## 🚀 Quick Start

### Prerequisites

```bash
Node.js 18+ or 20+
npm 9+ or yarn
Git
```

### Web Dashboard

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/djedops.git
cd djedops

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Open browser
# Navigate to http://localhost:3000
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Mobile App

```bash
# 1. Navigate to mobile directory
cd mobile

# 2. Install dependencies
npm install

# 3. Start Expo development server
npm start

# 4. Run on specific platform
npm run ios       # iOS simulator (Mac only)
npm run android   # Android emulator
npm run web       # Web browser

# 5. Build for production (requires EAS CLI)
npm install -g eas-cli
eas login
npm run build:android  # or build:ios
```

### Demo Mode

For testing without external API access:

```
http://localhost:3000?demo=true
```

Uses static mock data from `public/mock-data.json`

---

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage
```

### Test Coverage

| Test Suite | Tests | Status | Coverage |
|-----------|-------|--------|----------|
| `calculations.test.ts` | 12 | ✅ | Unit tests for DSI & reserve ratio |
| `simulation.test.ts` | 15 | ✅ | Scenario & price simulation logic |
| `wallet.test.ts` | 8 | ✅ | Nautilus wallet integration |
| `TerminalFeed.test.ts` | 6 | ✅ | Transaction feed component |
| **Total** | **41** | **✅** | **Comprehensive coverage** |

### Testing Approach

- **Unit Tests** - Pure functions, calculations, utilities
- **Component Tests** - React component rendering & interactions
- **Integration Tests** - Multi-component workflows
- **Property-Based Tests** - Using fast-check for edge cases

**Status**: All 41 tests passing ✅

For detailed testing guide, see [NEW_FEATURES_TESTING.md](./NEW_FEATURES_TESTING.md)

---

## 📁 Project Structure

```
djedops/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout with fonts & error boundary
│   ├── page.tsx                 # Main dashboard
│   ├── globals.css              # Financial Brutalism theme
│   └── api/                     # API routes (CORS proxy)
│       ├── djed/route.ts       # Ergo Explorer proxy
│       ├── dex/route.ts        # Spectrum Finance proxy
│       └── feed/route.ts       # Transaction feed proxy
├── components/                   # React components (50+)
│   ├── HeroSection.tsx          # Main dashboard section
│   ├── ReserveSunWithVisibility.tsx  # 3D visualization wrapper
│   ├── MarketOpportunityCard.tsx     # Arbitrage signals
│   ├── SentinelPanel.tsx        # Automated monitoring
│   ├── TerminalFeed.tsx         # Transaction log
│   ├── WalletConnect.tsx        # Nautilus integration
│   ├── ErrorBoundary.tsx        # Global error handling
│   └── isolated/                # Reusable components
│       ├── ReserveSun.tsx       # 3D sphere visualization
│       └── DataGrid.tsx         # Metrics display
├── lib/                         # Business logic & utilities
│   ├── calculations.ts          # DSI & reserve ratio formulas
│   ├── store.ts                 # Zustand global state
│   ├── types.ts                 # TypeScript interfaces
│   ├── constants.ts             # Configuration constants
│   ├── demo-service.ts          # Mock data service
│   ├── hooks/                   # Custom React hooks
│   │   ├── useDjedData.ts      # Protocol data fetching
│   │   ├── useDexPrice.ts      # DEX price & arbitrage
│   │   ├── useTransactionFeed.ts # Blockchain transactions
│   │   ├── useWallet.ts        # Nautilus wallet logic
│   │   └── usePageVisibility.ts # Tab visibility detection
│   ├── utils/
│   │   └── dsiCalculator.ts    # DSI calculation logic
│   └── __tests__/               # Unit tests
│       ├── calculations.test.ts
│       ├── simulation.test.ts
│       └── wallet.test.ts
├── mobile/                       # React Native app
│   ├── app/                     # Expo Router
│   ├── components/              # Mobile components
│   ├── utils/                   # Mobile utilities
│   └── package.json             # Mobile dependencies
├── public/                      # Static assets
│   ├── mock-data.json          # Demo mode data
│   └── manifest.json           # PWA manifest
├── stories/                     # Storybook stories
├── tailwind.config.ts          # Tailwind + theme config
├── jest.config.js              # Jest configuration
└── package.json                # Dependencies & scripts
```

---

## 🎨 Design System

### Financial Brutalism Philosophy

High-contrast, terminal-inspired aesthetics with zero fluff. Designed for rapid data interpretation in high-stress trading scenarios.

#### Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Deep Void Black | `#050505` | Background |
| Obsidian | `#080808` | Surface |
| Terminal Green | `#39FF14` | SAFE/NORMAL state, primary actions |
| Alert Red | `#FF2A2A` | CRITICAL state, warnings |
| Off-white | `#E5E5E5` | Primary text |
| Steel Grey | `#888888` | Secondary text |

#### Typography

- **Display**: Unbounded (700, 900) - Headers and emphasis
- **Body**: Inter (400, 700, 900) - General text
- **Monospace**: JetBrains Mono, Space Mono - All numeric data

#### Visual Effects

- ✨ CRT scanline overlay (nostalgic terminal aesthetic)
- 💚 Green glow on positive signals (`text-shadow: 0 0 10px rgba(57, 255, 20, 0.6)`)
- ❤️ Red glow on alerts (`text-shadow: 0 0 10px rgba(255, 42, 42, 0.6)`)
- 📐 Corner L-brackets on all containers (brutalist decoration)
- 🔲 Hollow text effect (stroke with transparent fill)

#### Accessibility

- ✅ WCAG AA compliant (4.5:1 text contrast)
- ✅ Keyboard navigation with visible focus indicators
- ✅ `prefers-reduced-motion` support
- ✅ ARIA labels and live regions
- ✅ Semantic HTML structure

---

## 🔌 API Integration

### Ergo Explorer API

**Base URL**: `https://api.ergoplatform.com/api/v1`

```typescript
// Oracle price data
GET /oracle/poolBox
Response: { price: number, datapoints: OracleData[] }

// Protocol metrics
GET /addresses/{address}/balance/total
Response: { nanoErgs: number }
```

**Polling**: 15 seconds  
**Cache**: SWR with 10s revalidation  
**Error Handling**: Exponential backoff, fallback to demo data

### Spectrum Finance API

**Base URL**: `https://api.spectrum.fi/v1`

```typescript
// DEX pool data
GET /amm/pools
Response: SpectrumPool[]

// Price calculation
price = (reserveY / 10^decimalsY) / (reserveX / 10^decimalsX)
```

**Polling**: 15 seconds  
**Arbitrage Detection**: ±0.5% spread threshold

### Nautilus Wallet Integration

**dApp Connector**: EIP-0012 standard[^3]

```typescript
// Connection flow
ergo.request({ method: "wallet_connect" })
→ User approves in Nautilus
→ ergo.get_balance() for ERG balance
→ localStorage persistence for auto-reconnect
```

**Balance Polling**: 30 seconds  
**Reconnection**: Automatic on page load

---

## 📚 Documentation

### Core Documentation
- **[SETUP.md](./SETUP.md)** - Development environment setup
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Complete implementation details
- **[CODE_QUALITY.md](./CODE_QUALITY.md)** - Architecture & code standards

### Feature Guides
- **[NEW_FEATURES_TESTING.md](./NEW_FEATURES_TESTING.md)** - Testing guide for all features
- **[LIVE_DEX_PRICE.md](./LIVE_DEX_PRICE.md)** - DEX integration technical docs
- **[LIVE_TRANSACTION_FEED.md](./LIVE_TRANSACTION_FEED.md)** - Transaction monitoring implementation
- **[WALLET_INTEGRATION.md](./WALLET_INTEGRATION.md)** - Nautilus wallet integration
- **[REACTIVE_RESERVE_SUN.md](./REACTIVE_RESERVE_SUN.md)** - 3D visualization details
- **[PERFORMANCE_MODE.md](./PERFORMANCE_MODE.md)** - Performance optimization guide
- **[MOBILE_APP_SUMMARY.md](./MOBILE_APP_SUMMARY.md)** - Mobile app documentation

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Workflow

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes following our code style
4. Write/update tests
5. Run test suite: `npm test`
6. Commit: `git commit -m 'Add amazing feature'`
7. Push: `git push origin feature/amazing-feature`
8. Open Pull Request

### Code Style

- **TypeScript**: Strict mode enabled
- **Components**: Functional components with hooks
- **Styling**: Tailwind utility classes (no CSS modules)
- **Testing**: Jest + Testing Library
- **Commits**: Conventional Commits format

### Design Principles

All contributions must maintain Financial Brutalism aesthetic:
- ✅ High contrast (3:1 minimum)
- ✅ Monospace fonts for all numeric data
- ✅ Terminal green (#39FF14) and alert red (#FF2A2A)
- ❌ No gradients
- ❌ No rounded corners (except functional elements)
- ❌ No decorative shadows (only functional glows)

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2025 The Stable Order

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

---

## 🙏 Acknowledgments

### Core Technologies
- [Next.js Team](https://nextjs.org/) - React framework
- [Vercel](https://vercel.com/) - Deployment platform
- [Pmndrs](https://github.com/pmndrs) - React Three Fiber & Zustand

### Ergo Ecosystem
- **[Ergo Platform](https://ergoplatform.org/)** - Blockchain infrastructure
- **[Djed Protocol](https://djed.io/)** - Algorithmic stablecoin design[^4]
- **[Spectrum Finance](https://spectrum.fi/)** - Decentralized exchange on Ergo[^2]
- **[Nautilus Wallet](https://github.com/capt-nemo429/nautilus-wallet)** - Ergo wallet with dApp connector[^3]

### Resources & Documentation
- **Ergo Explorer API** - Blockchain data provider
- **Ergo Oracle Pools** - Decentralized price feeds[^1]
- **Financial Brutalism** - Design philosophy inspiration

### Contributors
Built with AI-assisted development tools while maintaining human-driven architecture and design decisions.

---

## 📖 References

[^1]: [Ergo Oracle Pools Documentation](https://docs.ergoplatform.com/dev/data-model/oracle/) - Decentralized oracle design
[^2]: [Spectrum Finance Documentation](https://docs.spectrum.fi/) - AMM protocol on Ergo
[^3]: [EIP-0012: dApp Connector Standard](https://github.com/ergoplatform/eips/blob/master/eip-0012.md) - Wallet integration standard
[^4]: [Djed: A Formally Verified Crypto-Backed Stablecoin](https://eprint.iacr.org/2021/1069.pdf) - Academic whitepaper

---

<div align="center">

**Built with ❤️ for the Ergo community**

[Report Bug](https://github.com/yourusername/djedops/issues) • [Request Feature](https://github.com/yourusername/djedops/issues) • [Documentation](./IMPLEMENTATION_SUMMARY.md)

</div>
