/**
 * DjedOPS Backend Server
 * 
 * Express API server that handles WeilChain CLI interactions for the DjedOPS platform.
 * This server acts as a bridge between the frontend and the WeilChain network,
 * managing wallet connections, transaction signing, and workflow deployment.
 * 
 * Features:
 * - RESTful API for wallet and workflow operations
 * - CORS support for cross-origin requests from frontend
 * - Rate limiting for API protection
 * - Security headers via Helmet
 * - Request logging
 * - Environment-based configuration
 * 
 * Deployment:
 * - Designed to run on Render (or any Node.js hosting platform)
 * - Requires widl CLI binary to be available in PATH
 * - Environment variables must be configured (see .env.example)
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import walletRoutes from './routes/wallet';
import workflowRoutes from './routes/workflow';

/**
 * Initialize Express application
 */
const app: Application = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Security Middleware
 */
app.use(helmet()); // Security headers

/**
 * CORS Configuration
 * Allow requests from the frontend (Vercel deployment)
 */
const allowedOrigins = [
  'http://localhost:3000',
  'https://djedops67-two.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.some(allowed => origin.startsWith(allowed as string))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

/**
 * Rate Limiting
 * Prevent abuse by limiting request frequency
 */
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

/**
 * Body Parsing Middleware
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Logging Middleware
 */
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

/**
 * Health Check Endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    version: '1.0.0'
  });
});

/**
 * Root Endpoint
 */
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'DjedOPS Backend API',
    version: '1.0.0',
    description: 'Backend API server for DjedOPS - handles WeilChain CLI interactions',
    endpoints: {
      health: '/health',
      wallet: '/api/wallet',
      workflow: '/api/workflow'
    },
    documentation: 'https://github.com/sameezy667/djedops'
  });
});

/**
 * API Routes
 */
app.use('/api/wallet', walletRoutes);
app.use('/api/workflow', workflowRoutes);

/**
 * 404 Handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

/**
 * Global Error Handler
 */
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: NODE_ENV === 'development' ? err.message : 'Something went wrong',
    stack: NODE_ENV === 'development' ? err.stack : undefined
  });
});

/**
 * Start Server
 */
const server = app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🚀 DjedOPS Backend Server Started');
  console.log('='.repeat(60));
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`🛡️  CORS: ${corsOptions.origin}`);
  console.log(`⏱️  Rate Limit: ${process.env.RATE_LIMIT_MAX_REQUESTS || 100} requests per ${process.env.RATE_LIMIT_WINDOW_MS || 900000}ms`);
  console.log('='.repeat(60));
  console.log('✅ Ready to accept requests');
  console.log('='.repeat(60));
});

/**
 * Graceful Shutdown
 */
const gracefulShutdown = () => {
  console.log('\n🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default app;
