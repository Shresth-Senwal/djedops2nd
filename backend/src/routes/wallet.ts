/**
 * Wallet Routes
 * 
 * API endpoints for wallet connection, account management, and transaction signing.
 * These endpoints interact with the WeilChain CLI to provide seamless wallet operations.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { weilCLI } from '../services/weil-cli';
import { WalletConnectRequest, SignTransactionRequest } from '../types';

const router = Router();

/**
 * Validation schemas using Zod
 */
const SignTransactionSchema = z.object({
  txData: z.string().min(1, 'Transaction data is required'),
  address: z.string().regex(/^[a-f0-9]{40,}$/i, 'Invalid WeilChain address')
});

/**
 * POST /api/wallet/connect
 * Connect to wallet and retrieve account information
 * 
 * Request body: { address?: string }
 * Response: { success: boolean, address?: string, message?: string }
 */
router.post('/connect', async (req: Request, res: Response) => {
  try {
    const { address } = req.body as WalletConnectRequest;

    // Get account address from CLI
    const accountAddress = await weilCLI.getAccountAddress();

    if (!accountAddress) {
      return res.status(500).json({
        success: false,
        message: 'No account found. Please ensure widl CLI is configured with an account.'
      });
    }

    // Verify address matches if provided
    if (address && address.toLowerCase() !== accountAddress.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'Address mismatch between request and CLI account'
      });
    }

    res.json({
      success: true,
      address: accountAddress,
      message: 'Wallet connected successfully'
    });
  } catch (error: any) {
    console.error('Wallet connection error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to connect wallet',
      details: error.message
    });
  }
});

/**
 * GET /api/wallet/balance/:address
 * Get account balance for a specific address
 * 
 * Path params: { address: string }
 * Response: { success: boolean, balance?: string, message?: string }
 */
router.get('/balance/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    // Validate address format
    if (!/^[a-f0-9]{40,}$/i.test(address)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid WeilChain address format'
      });
    }

    const result = await weilCLI.getBalance(address);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch balance',
        details: result.error
      });
    }

    res.json({
      success: true,
      balance: result.output,
      message: 'Balance retrieved successfully'
    });
  } catch (error: any) {
    console.error('Balance query error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to query balance',
      details: error.message
    });
  }
});

/**
 * POST /api/wallet/sign
 * Sign a transaction using the configured private key
 * 
 * Request body: { txData: string, address: string }
 * Response: { success: boolean, signedTx?: string, message?: string }
 */
router.post('/sign', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = SignTransactionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        details: validation.error.errors
      });
    }

    const { txData, address } = validation.data as SignTransactionRequest;

    // Verify address matches configured account
    const accountAddress = await weilCLI.getAccountAddress();
    if (!accountAddress || accountAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'Address mismatch - cannot sign for this address'
      });
    }

    // Sign the transaction
    const result = await weilCLI.signTransaction(txData);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Transaction signing failed',
        details: result.error
      });
    }

    res.json({
      success: true,
      signedTx: result.signedTx,
      message: 'Transaction signed successfully'
    });
  } catch (error: any) {
    console.error('Transaction signing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sign transaction',
      details: error.message
    });
  }
});

/**
 * GET /api/wallet/account
 * Get the currently configured account address
 * 
 * Response: { success: boolean, address?: string, message?: string }
 */
router.get('/account', async (req: Request, res: Response) => {
  try {
    const accountAddress = await weilCLI.getAccountAddress();

    if (!accountAddress) {
      return res.status(500).json({
        success: false,
        message: 'No account configured in CLI'
      });
    }

    res.json({
      success: true,
      address: accountAddress,
      message: 'Account retrieved successfully'
    });
  } catch (error: any) {
    console.error('Account query error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get account',
      details: error.message
    });
  }
});

export default router;
