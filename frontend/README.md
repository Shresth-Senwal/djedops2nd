# DjedOPS Frontend

Next.js-based frontend for the DjedOPS visual workflow automation platform.

## Features

- Visual workflow builder with drag-and-drop interface
- WAuth wallet integration
- AI-powered semantic command bar (Gemini)
- DeFi tools and analytics
- Real-time blockchain data
- Responsive design with Tailwind CSS

## Prerequisites

- Node.js 18+
- npm or yarn
- Backend API running (locally or on Render)

## Installation

```bash
npm install
```

## Configuration

Create `.env.local` file:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```bash
# Backend API URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001  # Local development
# Or: https://your-backend.onrender.com        # Production

# Optional: Gemini AI API key
NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here

# WeilChain endpoints (for display)
NEXT_PUBLIC_WEIL_SENTINEL_ENDPOINT=https://sentinel.unweil.me
NEXT_PUBLIC_WEIL_BLOCK_EXPLORER=https://www.unweil.me
```

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Build

```bash
npm run build
npm start
```

## Deployment to Vercel

### Via Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Set **Root Directory** to `frontend`
5. Set environment variables:
   - `NEXT_PUBLIC_BACKEND_URL`: Your Render backend URL
   - `NEXT_PUBLIC_GEMINI_API_KEY`: (Optional) Your Gemini API key
6. Click "Deploy"

### Via CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

## Environment Variables

All environment variables must start with `NEXT_PUBLIC_` to be accessible in the browser.

Required:
- `NEXT_PUBLIC_BACKEND_URL`: Backend API base URL

Optional:
- `NEXT_PUBLIC_GEMINI_API_KEY`: For AI semantic command bar
- Other config variables (see `.env.example`)

## Project Structure

```
frontend/
├── app/                 # Next.js 14 app router
│   ├── page.tsx         # Homepage
│   ├── layout.tsx       # Root layout
│   ├── workflows/       # Workflow builder page
│   └── dashboard/       # DeFi dashboard
├── components/          # React components
│   ├── WorkflowBuilder.tsx
│   ├── WAuthConnect.tsx
│   └── ...
├── lib/                 # Utilities
│   ├── api-client.ts    # Backend API client
│   ├── hooks/           # React hooks
│   └── ...
└── public/              # Static assets
```

## Key Components

- **WorkflowBuilder**: Visual workflow editor
- **WAuthConnect**: Wallet connection button
- **SemanticCommandBar**: AI-powered natural language interface
- **OpportunityHolodeck**: DeFi opportunity scanner
- **TemporalDebugger**: Time-travel debugging tool

## Testing

```bash
npm test              # Run tests
npm run test:watch    # Watch mode
```

## Linting

```bash
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues
```

## Troubleshooting

### "Cannot connect to backend"
- Ensure backend is running
- Check `NEXT_PUBLIC_BACKEND_URL` is correct
- Verify CORS is configured in backend

### "WAuth not detected"
- Install WAuth browser extension
- Refresh page after installation

### Build errors
- Clear Next.js cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version` (should be 18+)

## Support

- [Backend README](../backend/README.md)
- [Main Project README](../README.md)
- [GitHub Issues](https://github.com/sameezy667/djedops/issues)

## License

MIT
