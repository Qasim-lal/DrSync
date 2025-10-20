/**
 * Mock WhatsApp Cloud API Server
 * 
 * Simulates Meta's WhatsApp Cloud API for local testing without requiring:
 * - Meta Business Manager approval
 * - Production domain with SSL
 * - Live WhatsApp Business phone number
 * 
 * Features:
 * - Realistic API responses with message IDs
 * - Simulated latency (50-500ms)
 * - Rate limiting simulation
 * - Error scenario simulation
 * - Message delivery status tracking
 * - Webhook callbacks for status updates
 * 
 * @version 1.0
 * @date October 18, 2025
 */

import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import logger from '../utils/logger';

interface MockMessage {
  id: string;
  to: string;
  from: string;
  type: string;
  text?: { body: string };
  timestamp: number;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  organizationId?: string;
}

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

class WhatsAppMockServer {
  private app: express.Application;
  private port: number;
  private messages: Map<string, MockMessage> = new Map();
  private rateLimits: Map<string, RateLimitInfo> = new Map();
  // Use Docker network URL if in container, otherwise localhost
  private webhookUrl: string = process.env.WEBHOOK_URL || 
    (process.env.NODE_ENV === 'development' && process.env.DOCKER === 'true' 
      ? 'http://backend:3001/api/whatsapp/webhook' 
      : 'http://localhost:3001/api/whatsapp/webhook');
  
  // Configuration
  private readonly RATE_LIMIT = 80; // messages per second
  private readonly MIN_LATENCY = 50; // ms
  private readonly MAX_LATENCY = 500; // ms
  private readonly ERROR_RATE = 0.02; // 2% simulated error rate
  
  constructor(port: number = 3099) {
    this.app = express();
    this.port = port;
    this.setupMiddleware();
    this.setupRoutes();
  }
  
  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use((_req, _res, next) => {
      logger.info(`[Mock WhatsApp API] ${_req.method} ${_req.path}`);
      next();
    });
  }
  
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (_req, res) => {
      res.json({ status: 'ok', service: 'WhatsApp Mock API' });
    });
    
    // Send message endpoint
    this.app.post('/:phoneNumberId/messages', this.handleSendMessage.bind(this));
    
    // Get media endpoint (for future use)
    this.app.get('/:mediaId', this.handleGetMedia.bind(this));
    
    // Admin endpoints for testing
    this.app.get('/admin/messages', this.handleGetMessages.bind(this));
    this.app.get('/admin/stats', this.handleGetStats.bind(this));
    this.app.post('/admin/webhook-url', this.handleSetWebhookUrl.bind(this));
    this.app.post('/admin/simulate-incoming', this.handleSimulateIncoming.bind(this));
    this.app.post('/admin/simulate-status', this.handleSimulateStatus.bind(this));
  }
  
  /**
   * Handle message sending (main WhatsApp API endpoint)
   */
  private async handleSendMessage(req: Request, res: Response): Promise<void> {
    const { phoneNumberId } = req.params;
    const { messaging_product, to, type, text } = req.body;
    const authHeader = req.headers.authorization;
    
    // Simulate latency
    await this.simulateLatency();
    
    // Validate authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: {
          message: 'Invalid OAuth access token.',
          type: 'OAuthException',
          code: 190,
        },
      });
      return;
    }
    
    // Validate required fields
    if (!messaging_product || messaging_product !== 'whatsapp') {
      res.status(400).json({
        error: {
          message: 'messaging_product must be "whatsapp"',
          code: 100,
        },
      });
      return;
    }
    
    if (!to || !type) {
      res.status(400).json({
        error: {
          message: 'Missing required parameters',
          code: 100,
        },
      });
      return;
    }
    
    // Validate phone number format
    if (!to.match(/^\+?\d{10,15}$/)) {
      res.status(400).json({
        error: {
          message: 'Invalid recipient phone number',
          code: 131026,
        },
      });
      return;
    }
    
    // Check rate limiting
    if (!phoneNumberId) {
      res.status(400).json({
        error: {
          message: 'Phone number ID is required',
          code: 100,
        },
      });
      return;
    }
    const rateLimitKey = phoneNumberId;
    if (this.isRateLimited(rateLimitKey)) {
      res.status(429).json({
        error: {
          message: 'Too many messages sent from this phone number',
          code: 131048,
          error_data: {
            details: 'Rate limit exceeded. Please retry after some time.',
          },
        },
      });
      return;
    }
    
    // Update rate limit counter
    this.updateRateLimit(rateLimitKey);
    
    // Simulate occasional errors
    if (Math.random() < this.ERROR_RATE) {
      res.status(500).json({
        error: {
          message: 'Temporary service error',
          code: 2,
        },
      });
      return;
    }
    
    // Create mock message
    const messageId = `wamid.${uuidv4().replace(/-/g, '')}`;
    const message: MockMessage = {
      id: messageId,
      to,
      from: phoneNumberId || '',
      type,
      ...(text ? { text: { body: text.body } } : {}),
      timestamp: Date.now(),
      status: 'sent',
    };
    
    this.messages.set(messageId, message);
    
    logger.info(`[Mock WhatsApp API] Message sent: ${messageId} to ${to}`);
    
    // Send success response
    res.status(200).json({
      messaging_product: 'whatsapp',
      contacts: [{ input: to, wa_id: to.replace('+', '') }],
      messages: [{ id: messageId }],
    });
    
    // Simulate status updates asynchronously
    if (phoneNumberId) {
      this.simulateStatusUpdates(messageId, to, phoneNumberId);
    }
  }
  
  /**
   * Simulate message status progression (sent -> delivered -> read)
   */
  private async simulateStatusUpdates(messageId: string, to: string, phoneNumberId: string): Promise<void> {
    try {
      // Delivered after 1-3 seconds
      await this.sleep(1000 + Math.random() * 2000);
      await this.sendStatusWebhook(messageId, 'delivered', to, phoneNumberId);
      
      // Read after 5-15 seconds (70% chance)
      if (Math.random() < 0.7) {
        await this.sleep(5000 + Math.random() * 10000);
        await this.sendStatusWebhook(messageId, 'read', to, phoneNumberId);
      }
    } catch (error) {
      logger.error('[Mock WhatsApp API] Error simulating status updates:', error);
    }
  }
  
  /**
   * Send status update webhook to backend
   */
  private async sendStatusWebhook(messageId: string, status: string, recipientId: string, phoneNumberId: string): Promise<void> {
    const message = this.messages.get(messageId);
    if (message) {
      message.status = status as any;
    }
    
    const webhookPayload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: phoneNumberId,
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: phoneNumberId,
              phone_number_id: phoneNumberId,
            },
            statuses: [{
              id: messageId,
              status,
              timestamp: Math.floor(Date.now() / 1000).toString(),
              recipient_id: recipientId,
            }],
          },
          field: 'messages',
        }],
      }],
    };
    
    try {
      await axios.post(this.webhookUrl, webhookPayload, {
        headers: { 'Content-Type': 'application/json' },
      });
      logger.info(`[Mock WhatsApp API] Status webhook sent: ${messageId} -> ${status}`);
    } catch (error) {
      logger.error('[Mock WhatsApp API] Failed to send status webhook:', error);
    }
  }
  
  /**
   * Get media (placeholder for future)
   */
  private handleGetMedia(_req: Request, res: Response): void {
    res.status(404).json({ error: { message: 'Media endpoint not implemented in mock', code: 100 } });
  }
  
  /**
   * Admin: Get all messages
   */
  private handleGetMessages(_req: Request, res: Response): void {
    const messages = Array.from(this.messages.values());
    res.json({ total: messages.length, messages });
  }
  
  /**
   * Admin: Get statistics
   */
  private handleGetStats(_req: Request, res: Response): void {
    const messages = Array.from(this.messages.values());
    const stats = {
      totalMessages: messages.length,
      byStatus: {
        sent: messages.filter(m => m.status === 'sent').length,
        delivered: messages.filter(m => m.status === 'delivered').length,
        read: messages.filter(m => m.status === 'read').length,
        failed: messages.filter(m => m.status === 'failed').length,
      },
      rateLimits: Array.from(this.rateLimits.entries()).map(([key, info]) => ({
        phoneNumberId: key,
        count: info.count,
        resetTime: new Date(info.resetTime).toISOString(),
      })),
    };
    res.json(stats);
  }
  
  /**
   * Admin: Set webhook URL
   */
  private handleSetWebhookUrl(req: Request, res: Response): void {
    const { url } = req.body;
    if (!url) {
      res.status(400).json({ error: 'Webhook URL required' });
      return;
    }
    this.webhookUrl = url;
    logger.info(`[Mock WhatsApp API] Webhook URL updated: ${url}`);
    res.json({ success: true, webhookUrl: this.webhookUrl });
  }
  
  /**
   * Admin: Simulate incoming message from patient
   */
  private async handleSimulateIncoming(req: Request, res: Response): Promise<void> {
    const { from, to, message, phoneNumberId } = req.body;
    
    if (!from || !to || !message || !phoneNumberId) {
      res.status(400).json({ error: 'Missing required fields: from, to, message, phoneNumberId' });
      return;
    }
    
    const messageId = `wamid.${uuidv4().replace(/-/g, '')}`;
    
    const webhookPayload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: phoneNumberId,
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: to,
              phone_number_id: phoneNumberId,
            },
            contacts: [{
              profile: { name: 'Test Patient' },
              wa_id: from.replace('+', ''),
            }],
            messages: [{
              from,
              id: messageId,
              timestamp: Math.floor(Date.now() / 1000).toString(),
              type: 'text',
              text: { body: message },
            }],
          },
          field: 'messages',
        }],
      }],
    };
    
    try {
      await axios.post(this.webhookUrl, webhookPayload, {
        headers: { 'Content-Type': 'application/json' },
      });
      logger.info(`[Mock WhatsApp API] Incoming message simulated: ${from} -> ${to}: "${message}"`);
      res.json({ success: true, messageId, webhookSent: true });
    } catch (error: any) {
      logger.error('[Mock WhatsApp API] Failed to send incoming webhook:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
  
  /**
   * Admin: Simulate status update
   */
  private async handleSimulateStatus(req: Request, res: Response): Promise<void> {
    const { messageId, status, recipientId, phoneNumberId } = req.body;
    
    if (!messageId || !status || !recipientId || !phoneNumberId) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    
    await this.sendStatusWebhook(messageId, status, recipientId, phoneNumberId);
    res.json({ success: true, status: 'Webhook sent' });
  }
  
  /**
   * Check if phone number is rate limited
   */
  private isRateLimited(key: string): boolean {
    const info = this.rateLimits.get(key);
    if (!info) return false;
    
    const now = Date.now();
    if (now > info.resetTime) {
      this.rateLimits.delete(key);
      return false;
    }
    
    return info.count >= this.RATE_LIMIT;
  }
  
  /**
   * Update rate limit counter
   */
  private updateRateLimit(key: string): void {
    const now = Date.now();
    const info = this.rateLimits.get(key);
    
    if (!info || now > info.resetTime) {
      this.rateLimits.set(key, {
        count: 1,
        resetTime: now + 1000, // 1 second window
      });
    } else {
      info.count++;
    }
  }
  
  /**
   * Simulate network latency
   */
  private async simulateLatency(): Promise<void> {
    const latency = this.MIN_LATENCY + Math.random() * (this.MAX_LATENCY - this.MIN_LATENCY);
    await this.sleep(latency);
  }
  
  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Start the mock server
   */
  public start(): void {
    this.app.listen(this.port, () => {
      logger.info(`
╔════════════════════════════════════════════════════════════════╗
║   WhatsApp Mock API Server Started                            ║
║                                                                ║
║   Base URL: http://localhost:${this.port}                           ║
║   Health:   http://localhost:${this.port}/health                    ║
║                                                                ║
║   Admin Endpoints:                                             ║
║   - GET  /admin/messages        (View all messages)           ║
║   - GET  /admin/stats           (View statistics)             ║
║   - POST /admin/webhook-url     (Set webhook URL)             ║
║   - POST /admin/simulate-incoming (Simulate patient message)  ║
║   - POST /admin/simulate-status  (Simulate status update)     ║
║                                                                ║
║   Use this URL in your WhatsApp service:                       ║
║   WHATSAPP_API_URL=http://localhost:${this.port}                    ║
╚════════════════════════════════════════════════════════════════╝
      `);
    });
  }
}

// Export for testing
export { WhatsAppMockServer };

// Start server if run directly
if (require.main === module) {
  const server = new WhatsAppMockServer(3099);
  server.start();
}
