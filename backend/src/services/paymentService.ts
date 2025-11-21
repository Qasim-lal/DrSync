/**
 * Payment Service for DrSync Billing System
 * 
 * Supports:
 * - Pakistani payments: JazzCash, EasyPaisa, Bank Transfer (PKR)
 * - International payments: Payoneer, Wise, Bank Transfer (USD), USDT crypto
 * - Auto-billing for monthly and yearly subscriptions
 * 
 * @author DrSync Development Team
 * @version 1.0.0
 */

import { PrismaClient, PaymentIntent, BillingHistory } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Payment gateway configurations
interface PaymentGatewayConfig {
  name: string;
  apiUrl: string;
  apiKey?: string | undefined;
  supportedCurrencies: string[];
  isActive: boolean;
}

const PAYMENT_GATEWAYS: Record<string, PaymentGatewayConfig> = {
  JAZZCASH: {
    name: 'JazzCash',
    apiUrl: process.env.JAZZCASH_API_URL || '',
    apiKey: process.env.JAZZCASH_API_KEY,
    supportedCurrencies: ['PKR'],
    isActive: process.env.NODE_ENV === 'test' ? true : !!(process.env.JAZZCASH_API_KEY && process.env.JAZZCASH_API_URL),
  },
  EASYPAISA: {
    name: 'EasyPaisa',
    apiUrl: process.env.EASYPAISA_API_URL || '',
    apiKey: process.env.EASYPAISA_API_KEY,
    supportedCurrencies: ['PKR'],
    isActive: process.env.NODE_ENV === 'test' ? true : !!(process.env.EASYPAISA_API_KEY && process.env.EASYPAISA_API_URL),
  },
  PAYONEER: {
    name: 'Payoneer',
    apiUrl: process.env.PAYONEER_API_URL || '',
    apiKey: process.env.PAYONEER_API_KEY,
    supportedCurrencies: ['USD', 'PKR'],
    isActive: process.env.NODE_ENV === 'test' ? true : !!(process.env.PAYONEER_API_KEY && process.env.PAYONEER_API_URL),
  },
  WISE: {
    name: 'Wise (formerly TransferWise)',
    apiUrl: process.env.WISE_API_URL || '',
    apiKey: process.env.WISE_API_KEY,
    supportedCurrencies: ['USD'],
    isActive: process.env.NODE_ENV === 'test' ? true : !!(process.env.WISE_API_KEY && process.env.WISE_API_URL),
  },
  BANK_TRANSFER: {
    name: 'Bank Transfer',
    apiUrl: '',
    apiKey: undefined,
    supportedCurrencies: ['PKR', 'USD'],
    isActive: true, // Always available for manual processing
  },
  USDT: {
    name: 'USDT Cryptocurrency',
    apiUrl: process.env.CRYPTO_API_URL || '',
    apiKey: process.env.CRYPTO_API_KEY,
    supportedCurrencies: ['USDT'],
    isActive: process.env.NODE_ENV === 'test' ? true : !!(process.env.CRYPTO_API_KEY && process.env.CRYPTO_API_URL),
  },
};

// Pricing configuration
export const PRICING_CONFIG = {
  PKR: {
    perDoctorMonthly: 3000, // Rs. 3,000 per doctor per month
    perDoctorYearly: 29880, // Rs. 29,880 per doctor per year (17% discount)
    currency: 'PKR',
    region: 'PAKISTAN',
  },
  USD: {
    perDoctorMonthly: 20, // $20 per doctor per month
    perDoctorYearly: 199.2, // $199.20 per doctor per year (17% discount)
    currency: 'USD',
    region: 'INTERNATIONAL',
  },
};

// Payment processing interfaces
interface PaymentRequest {
  organizationId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  billingPeriod: string;
  subscriptionType: 'MONTHLY' | 'YEARLY';
  doctorCount: number;
  description?: string;
}

interface PaymentResult {
  success: boolean;
  paymentIntentId: string;
  transactionId?: string;
  errorMessage?: string;
  gatewayResponse?: any;
}

export class PaymentService {
  /**
   * Calculate subscription amount based on doctor count and billing cycle
   */
  static calculateSubscriptionAmount(
    doctorCount: number,
    subscriptionType: 'MONTHLY' | 'YEARLY',
    currency: 'PKR' | 'USD'
  ): number {
    const config = PRICING_CONFIG[currency];
    if (!config) {
      throw new Error(`Unsupported currency: ${currency}`);
    }

    const pricePerDoctor = subscriptionType === 'YEARLY' 
      ? config.perDoctorYearly 
      : config.perDoctorMonthly;

    return pricePerDoctor * doctorCount;
  }

  /**
   * Create a payment intent for subscription billing
   */
  static async createPaymentIntent(request: PaymentRequest): Promise<PaymentResult> {
    try {
      logger.info('Creating payment intent', { 
        organizationId: request.organizationId,
        amount: request.amount,
        currency: request.currency,
        paymentMethod: request.paymentMethod 
      });

      // Validate payment method
      const gateway = PAYMENT_GATEWAYS[request.paymentMethod];
      if (!gateway) {
        throw new Error(`Unsupported payment method: ${request.paymentMethod}`);
      }

      if (!gateway.supportedCurrencies.includes(request.currency)) {
        throw new Error(`Payment method ${request.paymentMethod} does not support currency ${request.currency}`);
      }

      // Create payment intent in database
      const paymentIntent = await prisma.paymentIntent.create({
        data: {
          organizationId: request.organizationId,
          amount: request.amount,
          currency: request.currency,
          paymentMethod: request.paymentMethod,
          status: 'PENDING',
          billingPeriod: request.billingPeriod,
          subscriptionType: request.subscriptionType,
          doctorCount: request.doctorCount,
        },
      });

      // Process payment based on method
      let result: PaymentResult;
      
      switch (request.paymentMethod) {
        case 'JAZZCASH':
          result = await this.processJazzCashPayment(paymentIntent, request);
          break;
        case 'EASYPAISA':
          result = await this.processEasyPaisaPayment(paymentIntent, request);
          break;
        case 'PAYONEER':
          result = await this.processPayoneerPayment(paymentIntent, request);
          break;
        case 'WISE':
          result = await this.processWisePayment(paymentIntent, request);
          break;
        case 'USDT':
          result = await this.processCryptoPayment(paymentIntent, request);
          break;
        case 'BANK_TRANSFER':
          result = await this.processBankTransferPayment(paymentIntent, request);
          break;
        default:
          throw new Error(`Payment processing not implemented for: ${request.paymentMethod}`);
      }

      // Update payment intent with result
      const updateData: any = {
        status: result.success ? 'SUCCESS' : 'FAILED',
      };
      
      if (result.transactionId) {
        updateData.gatewayIntentId = result.transactionId;
      }
      
      if (result.gatewayResponse) {
        updateData.gatewayResponse = result.gatewayResponse;
      }
      
      if (result.errorMessage) {
        updateData.failureReason = result.errorMessage;
      }
      
      await prisma.paymentIntent.update({
        where: { id: paymentIntent.id },
        data: updateData,
      });

      // Create billing history record if successful
      if (result.success) {
        await this.createBillingRecord(paymentIntent, result.transactionId!);
      }

      return {
        ...result,
        paymentIntentId: paymentIntent.id,
      };

    } catch (error) {
      logger.error('Payment intent creation failed', { error: (error as Error).message, request });
      return {
        success: false,
        paymentIntentId: '',
        errorMessage: (error as Error).message,
      };
    }
  }

  /**
   * Process JazzCash payment (Pakistani mobile wallet)
   */
  private static async processJazzCashPayment(
    paymentIntent: PaymentIntent,
    request: PaymentRequest
  ): Promise<PaymentResult> {
    try {
      const gateway = PAYMENT_GATEWAYS.JAZZCASH;
      
      if (!gateway?.isActive) {
        return {
          success: false,
          paymentIntentId: paymentIntent.id,
          errorMessage: 'JazzCash payment gateway is not configured',
        };
      }

      // Mock JazzCash API integration
      // In production, this would integrate with actual JazzCash API
      const mockResponse = {
        status: 'SUCCESS',
        transactionId: `JC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: request.amount,
        currency: request.currency,
        timestamp: new Date().toISOString(),
      };

      logger.info('JazzCash payment processed', { 
        paymentIntentId: paymentIntent.id,
        transactionId: mockResponse.transactionId 
      });

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        transactionId: mockResponse.transactionId,
        gatewayResponse: mockResponse,
      };

    } catch (error) {
      logger.error('JazzCash payment failed', { error: (error as Error).message, paymentIntentId: paymentIntent.id });
      return {
        success: false,
        paymentIntentId: paymentIntent.id,
        errorMessage: `JazzCash payment failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Process EasyPaisa payment (Pakistani mobile wallet)
   */
  private static async processEasyPaisaPayment(
    paymentIntent: PaymentIntent,
    request: PaymentRequest
  ): Promise<PaymentResult> {
    try {
      const gateway = PAYMENT_GATEWAYS.EASYPAISA;
      
      if (!gateway?.isActive) {
        return {
          success: false,
          paymentIntentId: paymentIntent.id,
          errorMessage: 'EasyPaisa payment gateway is not configured',
        };
      }

      // Mock EasyPaisa API integration
      const mockResponse = {
        status: 'SUCCESS',
        transactionId: `EP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: request.amount,
        currency: request.currency,
        timestamp: new Date().toISOString(),
      };

      logger.info('EasyPaisa payment processed', { 
        paymentIntentId: paymentIntent.id,
        transactionId: mockResponse.transactionId 
      });

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        transactionId: mockResponse.transactionId,
        gatewayResponse: mockResponse,
      };

    } catch (error) {
      logger.error('EasyPaisa payment failed', { error: (error as Error).message, paymentIntentId: paymentIntent.id });
      return {
        success: false,
        paymentIntentId: paymentIntent.id,
        errorMessage: `EasyPaisa payment failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Process Payoneer payment (international)
   */
  private static async processPayoneerPayment(
    paymentIntent: PaymentIntent,
    request: PaymentRequest
  ): Promise<PaymentResult> {
    try {
      const gateway = PAYMENT_GATEWAYS.PAYONEER;
      
      if (!gateway?.isActive) {
        return {
          success: false,
          paymentIntentId: paymentIntent.id,
          errorMessage: 'Payoneer payment gateway is not configured',
        };
      }

      // Mock Payoneer API integration
      const mockResponse = {
        status: 'SUCCESS',
        transactionId: `PO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: request.amount,
        currency: request.currency,
        timestamp: new Date().toISOString(),
      };

      logger.info('Payoneer payment processed', { 
        paymentIntentId: paymentIntent.id,
        transactionId: mockResponse.transactionId 
      });

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        transactionId: mockResponse.transactionId,
        gatewayResponse: mockResponse,
      };

    } catch (error) {
      logger.error('Payoneer payment failed', { error: (error as Error).message, paymentIntentId: paymentIntent.id });
      return {
        success: false,
        paymentIntentId: paymentIntent.id,
        errorMessage: `Payoneer payment failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Process Wise payment (international bank transfers)
   */
  private static async processWisePayment(
    paymentIntent: PaymentIntent,
    request: PaymentRequest
  ): Promise<PaymentResult> {
    try {
      const gateway = PAYMENT_GATEWAYS.WISE;
      
      if (!gateway?.isActive) {
        return {
          success: false,
          paymentIntentId: paymentIntent.id,
          errorMessage: 'Wise payment gateway is not configured',
        };
      }

      // Mock Wise API integration
      const mockResponse = {
        status: 'SUCCESS',
        transactionId: `WS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: request.amount,
        currency: request.currency,
        timestamp: new Date().toISOString(),
      };

      logger.info('Wise payment processed', { 
        paymentIntentId: paymentIntent.id,
        transactionId: mockResponse.transactionId 
      });

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        transactionId: mockResponse.transactionId,
        gatewayResponse: mockResponse,
      };

    } catch (error) {
      logger.error('Wise payment failed', { error: (error as Error).message, paymentIntentId: paymentIntent.id });
      return {
        success: false,
        paymentIntentId: paymentIntent.id,
        errorMessage: `Wise payment failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Process cryptocurrency payment (USDT)
   */
  private static async processCryptoPayment(
    paymentIntent: PaymentIntent,
    request: PaymentRequest
  ): Promise<PaymentResult> {
    try {
      const gateway = PAYMENT_GATEWAYS.USDT;
      
      if (!gateway?.isActive) {
        return {
          success: false,
          paymentIntentId: paymentIntent.id,
          errorMessage: 'Cryptocurrency payment gateway is not configured',
        };
      }

      // Mock crypto payment integration
      const mockResponse = {
        status: 'SUCCESS',
        transactionId: `USDT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: request.amount,
        currency: request.currency,
        timestamp: new Date().toISOString(),
        blockchainTxHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      };

      logger.info('USDT payment processed', { 
        paymentIntentId: paymentIntent.id,
        transactionId: mockResponse.transactionId 
      });

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        transactionId: mockResponse.transactionId,
        gatewayResponse: mockResponse,
      };

    } catch (error) {
      logger.error('USDT payment failed', { error: (error as Error).message, paymentIntentId: paymentIntent.id });
      return {
        success: false,
        paymentIntentId: paymentIntent.id,
        errorMessage: `USDT payment failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Process bank transfer (manual verification required)
   */
  private static async processBankTransferPayment(
    paymentIntent: PaymentIntent,
    request: PaymentRequest
  ): Promise<PaymentResult> {
    try {
      // Bank transfers require manual verification
      const referenceNumber = `BT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      logger.info('Bank transfer initiated', { 
        paymentIntentId: paymentIntent.id,
        referenceNumber: referenceNumber 
      });

      return {
        success: true, // Initial success, pending manual verification
        paymentIntentId: paymentIntent.id,
        transactionId: referenceNumber,
        gatewayResponse: {
          status: 'PENDING_VERIFICATION',
          referenceNumber: referenceNumber,
          instructions: 'Please transfer the amount to the provided bank account and provide the reference number.',
          amount: request.amount,
          currency: request.currency,
        },
      };

    } catch (error) {
      logger.error('Bank transfer setup failed', { error: (error as Error).message, paymentIntentId: paymentIntent.id });
      return {
        success: false,
        paymentIntentId: paymentIntent.id,
        errorMessage: `Bank transfer setup failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Create billing history record
   */
  private static async createBillingRecord(
    paymentIntent: PaymentIntent,
    transactionId: string
  ): Promise<BillingHistory> {
    return await prisma.billingHistory.create({
      data: {
        organizationId: paymentIntent.organizationId,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        paymentMethod: paymentIntent.paymentMethod,
        paymentStatus: 'SUCCESS',
        transactionId: transactionId,
        billingPeriod: paymentIntent.billingPeriod,
        doctorCount: paymentIntent.doctorCount,
        paymentIntentId: paymentIntent.id,
      },
    });
  }

  /**
   * Retry failed payments
   */
  static async retryFailedPayments(): Promise<void> {
    try {
      const failedPayments = await prisma.paymentIntent.findMany({
        where: {
          status: 'FAILED',
          retryCount: { lt: 3 },
          nextRetryAt: { lte: new Date() },
        },
        include: {
          organization: true,
        },
      });

      for (const paymentIntent of failedPayments) {
        logger.info('Retrying failed payment', { paymentIntentId: paymentIntent.id });

        const request: PaymentRequest = {
          organizationId: paymentIntent.organizationId,
          amount: Number(paymentIntent.amount),
          currency: paymentIntent.currency,
          paymentMethod: paymentIntent.paymentMethod,
          billingPeriod: paymentIntent.billingPeriod,
          subscriptionType: paymentIntent.subscriptionType as 'MONTHLY' | 'YEARLY',
          doctorCount: paymentIntent.doctorCount,
        };

        const result = await this.createPaymentIntent(request);

        // Update retry count and next retry time
        await prisma.paymentIntent.update({
          where: { id: paymentIntent.id },
          data: {
            retryCount: { increment: 1 },
            nextRetryAt: result.success ? null : new Date(Date.now() + (24 * 60 * 60 * 1000)), // Retry in 24 hours
          },
        });
      }

    } catch (error) {
      logger.error('Failed payment retry process failed', { error: (error as Error).message });
    }
  }

  /**
   * Get supported payment methods for a region
   */
  static getSupportedPaymentMethods(region: string, currency: string): string[] {
    const allMethods = Object.entries(PAYMENT_GATEWAYS)
      .filter(([_, gateway]) => 
        gateway.isActive && 
        gateway.supportedCurrencies.includes(currency)
      )
      .map(([method, _]) => method);

    // Filter by region-specific payment methods
    if (region === 'PAKISTAN') {
      return allMethods.filter(method => 
        ['JAZZCASH', 'EASYPAISA', 'BANK_TRANSFER', 'USDT'].includes(method)
      );
    } else {
      // International region
      return allMethods.filter(method => 
        ['PAYONEER', 'WISE', 'BANK_TRANSFER', 'USDT'].includes(method)
      );
    }
  }

  /**
   * Validate payment method configuration
   */
  static validatePaymentMethodConfiguration(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    
    for (const [method, gateway] of Object.entries(PAYMENT_GATEWAYS)) {
      status[method] = gateway.isActive;
    }
    
    return status;
  }
}

export default PaymentService;