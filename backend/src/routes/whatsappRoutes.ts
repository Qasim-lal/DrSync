/**
 * WhatsApp Business API Webhook Routes
 * 
 * Handles webhook verification and incoming messages from WhatsApp Business API.
 * Supports multi-organization routing with webhook signature verification.
 * 
 * Endpoints:
 * - GET /webhook: Webhook verification (required by Meta)
 * - POST /webhook: Incoming message handling
 * 
 * @version 1.0
 * @author DrSync Development Team
 * @date October 17, 2025
 */

import express, { Request, Response } from 'express';
import crypto from 'crypto';
import logger from '../utils/logger';
import whatsappService from '../services/whatsappService';

const router = express.Router();

/**
 * GET /webhook - Webhook verification endpoint
 * 
 * Meta calls this endpoint to verify webhook URL ownership.
 * Validates the verify token and responds with the challenge.
 * 
 * Query Parameters:
 * - hub.mode: Should be 'subscribe'
 * - hub.verify_token: Token to verify (matches WEBHOOK_VERIFY_TOKEN env var)
 * - hub.challenge: Random string to echo back
 * 
 * @implements TDD Section 7.1: WhatsApp Business API Integration
 * @implements TASK-033: Multi-client message routing
 */
router.get('/webhook', (req: Request, res: Response) => {
  try {
    // Extract verification parameters
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    logger.info('WhatsApp webhook verification request', {
      mode,
      hasToken: !!token,
      hasChallenge: !!challenge
    });

    // Verify the request is for subscription
    if (mode !== 'subscribe') {
      logger.warn('Invalid webhook mode', { mode });
      return res.sendStatus(403);
    }

    // Verify the token matches our webhook verify token
    const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN;
    if (!verifyToken) {
      logger.error('WEBHOOK_VERIFY_TOKEN not configured');
      return res.sendStatus(500);
    }

    // Check if token matches
    if (token !== verifyToken) {
      logger.warn('Invalid webhook verify token');
      return res.sendStatus(403);
    }

    // Respond with challenge to verify webhook
    logger.info('Webhook verification successful');
    return res.status(200).send(challenge);

  } catch (error) {
    logger.error('Error in webhook verification:', error);
    return res.sendStatus(500);
  }
});

/**
 * POST /webhook - Incoming message handler
 * 
 * Receives and processes incoming WhatsApp messages.
 * Verifies webhook signature and routes to correct organization.
 * 
 * Headers:
 * - X-Hub-Signature-256: HMAC SHA256 signature for verification
 * 
 * @implements TDD Section 7.1: WhatsApp Business API Integration
 * @implements TASK-033: Multi-client message routing
 * @implements REQ-WA-001 through REQ-WA-010: WhatsApp integration requirements
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    // Respond immediately to Meta (required within 20 seconds)
    // Process message asynchronously to avoid timeout
    res.sendStatus(200);

    // Verify webhook signature
    const signature = req.headers['x-hub-signature-256'] as string;
    const appSecret = process.env.WHATSAPP_APP_SECRET;

    if (!appSecret) {
      logger.error('WHATSAPP_APP_SECRET not configured');
      return;
    }

    // Verify signature if present
    if (signature) {
      const isValid = verifyWebhookSignature(
        JSON.stringify(req.body),
        signature,
        appSecret
      );

      if (!isValid) {
        logger.warn('Invalid webhook signature', {
          signature: signature.substring(0, 20) + '...'
        });
        return;
      }

      logger.debug('Webhook signature verified successfully');
    } else {
      logger.warn('Webhook signature missing - processing anyway for development');
    }

    // Extract webhook data
    const webhookData = req.body;

    logger.info('Incoming WhatsApp webhook', {
      hasEntry: !!webhookData?.entry,
      entryCount: webhookData?.entry?.length || 0
    });

    // Check if this is a status update or message
    const entry = webhookData?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (value?.statuses) {
      // Handle message status updates (delivered, read, failed)
      await handleStatusUpdate(value.statuses);
    } else if (value?.messages) {
      // Handle incoming messages
      await whatsappService.routeMessage(webhookData);
    } else {
      logger.debug('Webhook event not a message or status update', {
        hasValue: !!value,
        keys: value ? Object.keys(value) : []
      });
    }

  } catch (error) {
    logger.error('Error processing webhook:', error);
    // Don't throw - webhook already responded with 200
  }
});

/**
 * Verify webhook signature using HMAC SHA256
 * 
 * @param payload - Raw request body as string
 * @param signature - X-Hub-Signature-256 header value
 * @param appSecret - WhatsApp App Secret
 * @returns True if signature is valid
 * 
 * @implements TDD Section 7.1: Webhook signature verification
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  appSecret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(payload)
      .digest('hex');

    const providedSignature = signature.replace('sha256=', '');

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(providedSignature)
    );
  } catch (error) {
    logger.error('Error verifying webhook signature:', error);
    return false;
  }
}

/**
 * Handle message status updates
 * 
 * @param statuses - Array of status update objects
 * 
 * Status types:
 * - sent: Message sent to WhatsApp server
 * - delivered: Message delivered to recipient's device
 * - read: Message read by recipient
 * - failed: Message delivery failed
 */
async function handleStatusUpdate(statuses: any[]): Promise<void> {
  try {
    for (const status of statuses) {
      logger.info('Message status update', {
        messageId: status.id,
        status: status.status,
        timestamp: status.timestamp,
        recipientId: status.recipient_id
      });

      // TODO: Update message status in database (SUBTASK 3.2.2)
      // This will be implemented in the message delivery tracking section
    }
  } catch (error) {
    logger.error('Error handling status update:', error);
  }
}

/**
 * Health check endpoint for WhatsApp service
 * 
 * Returns the status of WhatsApp clients and service health.
 * 
 * @returns Service status and client statistics
 */
router.get('/health', (_req: Request, res: Response) => {
  try {
    const stats = whatsappService.getClientStats();
    const activeClients = Object.keys(stats).length;

    res.json({
      status: 'healthy',
      service: 'whatsapp',
      activeClients,
      clients: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error checking WhatsApp service health:', error);
    res.status(503).json({
      status: 'unhealthy',
      service: 'whatsapp',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
