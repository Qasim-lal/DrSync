#!/usr/bin/env node
/**
 * WhatsApp Conversation Simulator CLI
 * 
 * Interactive command-line tool for simulating patient conversations
 * with the DrSync WhatsApp system without requiring real WhatsApp setup.
 * 
 * Usage:
 *   npm run whatsapp:simulate
 *   
 * Features:
 * - Simulate incoming patient messages
 * - Test appointment booking flow
 * - View conversation history
 * - Monitor message delivery status
 * - Test multiple organizations
 * 
 * @version 1.0
 * @date October 18, 2025
 */

import axios from 'axios';
import * as readline from 'readline';
import chalk from 'chalk';

const MOCK_API_URL = process.env.WHATSAPP_MOCK_API_URL || 'http://localhost:3099';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

interface ConversationState {
  patientPhone: string;
  organizationPhone: string;
  phoneNumberId: string;
  messageHistory: Array<{ from: string; message: string; timestamp: Date }>;
}

class WhatsAppSimulatorCLI {
  private rl: readline.Interface;
  private conversations: Map<string, ConversationState> = new Map();
  private currentConversation: string | null = null;
  
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }
  
  /**
   * Start the CLI
   */
  public async start(): Promise<void> {
    this.printBanner();
    await this.checkServices();
    this.showMainMenu();
  }
  
  /**
   * Print welcome banner
   */
  private printBanner(): void {
    console.log(chalk.cyan(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║         WhatsApp Conversation Simulator for DrSync               ║
║                                                                  ║
║  Test appointment booking flows without real WhatsApp setup     ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
    `));
  }
  
  /**
   * Check if required services are running
   */
  private async checkServices(): Promise<void> {
    console.log(chalk.yellow('\nChecking services...'));
    
    // Check mock API
    try {
      await axios.get(`${MOCK_API_URL}/health`);
      console.log(chalk.green('✓ Mock WhatsApp API is running'));
    } catch (error) {
      console.log(chalk.red('✗ Mock WhatsApp API is not running'));
      console.log(chalk.yellow(`  Start it with: npm run whatsapp:mock-server`));
    }
    
    // Check backend
    try {
      await axios.get(`${BACKEND_URL}/health`);
      console.log(chalk.green('✓ DrSync backend is running'));
    } catch (error) {
      console.log(chalk.red('✗ DrSync backend is not running'));
      console.log(chalk.yellow(`  Start it with: npm run dev`));
    }
    
    console.log('');
  }
  
  /**
   * Show main menu
   */
  private showMainMenu(): void {
    console.log(chalk.bold('\n📱 Main Menu:\n'));
    console.log('  1. Start new conversation (simulate patient)');
    console.log('  2. Continue existing conversation');
    console.log('  3. View all conversations');
    console.log('  4. View message statistics');
    console.log('  5. Test appointment booking flow');
    console.log('  6. Exit');
    
    this.rl.question(chalk.cyan('\nSelect option: '), (answer) => {
      this.handleMainMenu(answer.trim());
    });
  }
  
  /**
   * Handle main menu selection
   */
  private async handleMainMenu(option: string): Promise<void> {
    switch (option) {
      case '1':
        await this.startNewConversation();
        break;
      case '2':
        await this.continueConversation();
        break;
      case '3':
        await this.viewConversations();
        break;
      case '4':
        await this.viewStatistics();
        break;
      case '5':
        await this.testBookingFlow();
        break;
      case '6':
        console.log(chalk.green('\nGoodbye! 👋\n'));
        this.rl.close();
        process.exit(0);
      default:
        console.log(chalk.red('Invalid option'));
        this.showMainMenu();
    }
  }
  
  /**
   * Start a new conversation
   */
  private async startNewConversation(): Promise<void> {
    console.log(chalk.bold('\n📞 Start New Conversation\n'));
    
    this.rl.question('Patient phone number (e.g., +923001234567): ', (patientPhone) => {
      this.rl.question('Organization phone number (e.g., +923001111111): ', (orgPhone) => {
        this.rl.question('Phone Number ID (e.g., 123456789012345): ', (phoneNumberId) => {
          const conversationId = `${patientPhone}_${orgPhone}`;
          
          this.conversations.set(conversationId, {
            patientPhone: patientPhone.trim(),
            organizationPhone: orgPhone.trim(),
            phoneNumberId: phoneNumberId.trim(),
            messageHistory: [],
          });
          
          this.currentConversation = conversationId;
          console.log(chalk.green(`\n✓ Conversation started: ${patientPhone} → ${orgPhone}\n`));
          
          this.showConversationMenu();
        });
      });
    });
  }
  
  /**
   * Continue existing conversation
   */
  private async continueConversation(): Promise<void> {
    const conversations = Array.from(this.conversations.keys());
    
    if (conversations.length === 0) {
      console.log(chalk.yellow('\nNo active conversations. Start a new one first.'));
      this.showMainMenu();
      return;
    }
    
    console.log(chalk.bold('\n📞 Active Conversations:\n'));
    conversations.forEach((id, index) => {
      const conv = this.conversations.get(id)!;
      console.log(`  ${index + 1}. ${conv.patientPhone} ↔ ${conv.organizationPhone} (${conv.messageHistory.length} messages)`);
    });
    
    this.rl.question(chalk.cyan('\nSelect conversation (number): '), (answer) => {
      const index = parseInt(answer.trim()) - 1;
      if (index >= 0 && index < conversations.length) {
        this.currentConversation = conversations[index]!;
        this.showConversationMenu();
      } else {
        console.log(chalk.red('Invalid selection'));
        this.showMainMenu();
      }
    });
  }
  
  /**
   * Show conversation menu
   */
  private showConversationMenu(): void {
    const conv = this.conversations.get(this.currentConversation!);
    if (!conv) return;
    
    console.log(chalk.bold(`\n💬 Conversation: ${conv.patientPhone} ↔ ${conv.organizationPhone}\n`));
    console.log('  1. Send message as patient');
    console.log('  2. View conversation history');
    console.log('  3. Quick booking flow');
    console.log('  4. Back to main menu');
    
    this.rl.question(chalk.cyan('\nSelect option: '), (answer) => {
      this.handleConversationMenu(answer.trim());
    });
  }
  
  /**
   * Handle conversation menu
   */
  private async handleConversationMenu(option: string): Promise<void> {
    const conv = this.conversations.get(this.currentConversation!);
    if (!conv) return;
    
    switch (option) {
      case '1':
        this.rl.question(chalk.green('Patient message: '), async (message) => {
          await this.sendPatientMessage(conv, message.trim());
          conv.messageHistory.push({
            from: conv.patientPhone,
            message: message.trim(),
            timestamp: new Date(),
          });
          this.showConversationMenu();
        });
        break;
      case '2':
        this.viewConversationHistory(conv);
        this.showConversationMenu();
        break;
      case '3':
        await this.quickBookingFlow(conv);
        this.showConversationMenu();
        break;
      case '4':
        this.showMainMenu();
        break;
      default:
        console.log(chalk.red('Invalid option'));
        this.showConversationMenu();
    }
  }
  
  /**
   * Send message as patient
   */
  private async sendPatientMessage(conv: ConversationState, message: string): Promise<void> {
    try {
      const response = await axios.post(`${MOCK_API_URL}/admin/simulate-incoming`, {
        from: conv.patientPhone,
        to: conv.organizationPhone,
        message,
        phoneNumberId: conv.phoneNumberId,
      });
      
      if (response.data.success) {
        console.log(chalk.green(`\n✓ Message sent: "${message}"`));
        console.log(chalk.gray(`  Message ID: ${response.data.messageId}\n`));
      } else {
        console.log(chalk.red('\n✗ Failed to send message\n'));
      }
    } catch (error: any) {
      console.log(chalk.red(`\n✗ Error: ${error.message}\n`));
    }
  }
  
  /**
   * View conversation history
   */
  private viewConversationHistory(conv: ConversationState): void {
    console.log(chalk.bold('\n📜 Conversation History:\n'));
    
    if (conv.messageHistory.length === 0) {
      console.log(chalk.gray('  No messages yet'));
    } else {
      conv.messageHistory.forEach((msg) => {
        const time = msg.timestamp.toLocaleTimeString();
        const fromLabel = msg.from === conv.patientPhone ? 'Patient' : 'Organization';
        console.log(chalk.cyan(`  [${time}] ${fromLabel}: `) + msg.message);
      });
    }
    console.log('');
  }
  
  /**
   * Quick booking flow
   */
  private async quickBookingFlow(conv: ConversationState): Promise<void> {
    console.log(chalk.bold('\n🗓️  Quick Appointment Booking Flow\n'));
    
    const messages = [
      'Hi, I want to book an appointment',
      '1', // Select first patient option
      '1', // Select first provider
      'tomorrow', // Select date
      '10:00 AM', // Select time
      'CONFIRM', // Confirm booking
    ];
    
    console.log(chalk.yellow('Simulating patient booking flow...\n'));
    
    for (const message of messages) {
      console.log(chalk.cyan(`Patient: ${message}`));
      await this.sendPatientMessage(conv, message);
      conv.messageHistory.push({
        from: conv.patientPhone,
        message,
        timestamp: new Date(),
      });
      
      // Wait 2 seconds between messages
      await this.sleep(2000);
    }
    
    console.log(chalk.green('\n✓ Booking flow completed'));
  }
  
  /**
   * View all conversations
   */
  private async viewConversations(): Promise<void> {
    console.log(chalk.bold('\n📊 All Conversations:\n'));
    
    if (this.conversations.size === 0) {
      console.log(chalk.gray('  No conversations yet'));
    } else {
      Array.from(this.conversations.entries()).forEach(([_id, conv]) => {
        console.log(chalk.cyan(`\n${conv.patientPhone} ↔ ${conv.organizationPhone}`));
        console.log(`  Phone Number ID: ${conv.phoneNumberId}`);
        console.log(`  Messages: ${conv.messageHistory.length}`);
        console.log(`  Last activity: ${conv.messageHistory[conv.messageHistory.length - 1]?.timestamp.toLocaleString() || 'None'}`);
      });
    }
    
    console.log('');
    this.showMainMenu();
  }
  
  /**
   * View message statistics
   */
  private async viewStatistics(): Promise<void> {
    try {
      const response = await axios.get(`${MOCK_API_URL}/admin/stats`);
      const stats = response.data;
      
      console.log(chalk.bold('\n📈 Message Statistics:\n'));
      console.log(`  Total Messages: ${stats.totalMessages}`);
      console.log(chalk.green(`  ✓ Sent: ${stats.byStatus.sent}`));
      console.log(chalk.blue(`  ✓ Delivered: ${stats.byStatus.delivered}`));
      console.log(chalk.cyan(`  ✓ Read: ${stats.byStatus.read}`));
      console.log(chalk.red(`  ✗ Failed: ${stats.byStatus.failed}`));
      
      if (stats.rateLimits.length > 0) {
        console.log(chalk.bold('\n  Rate Limits:'));
        stats.rateLimits.forEach((limit: any) => {
          console.log(`    ${limit.phoneNumberId}: ${limit.count} messages`);
        });
      }
      
      console.log('');
    } catch (error: any) {
      console.log(chalk.red(`\n✗ Error fetching statistics: ${error.message}\n`));
    }
    
    this.showMainMenu();
  }
  
  /**
   * Test complete booking flow
   */
  private async testBookingFlow(): Promise<void> {
    console.log(chalk.bold('\n🧪 Testing Complete Booking Flow\n'));
    console.log(chalk.yellow('This will create a test conversation and simulate a full booking...\n'));
    
    const testPatient = '+923009999999';
    const testOrg = '+923001111111';
    const testPhoneNumberId = '123456789012345';
    
    const conversationId = `${testPatient}_${testOrg}`;
    this.conversations.set(conversationId, {
      patientPhone: testPatient,
      organizationPhone: testOrg,
      phoneNumberId: testPhoneNumberId,
      messageHistory: [],
    });
    
    this.currentConversation = conversationId;
    const conv = this.conversations.get(conversationId)!;
    
    await this.quickBookingFlow(conv);
    
    console.log(chalk.green('\n✓ Test completed. View conversation history in option 2.\n'));
    this.showMainMenu();
  }
  
  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Start CLI
const cli = new WhatsAppSimulatorCLI();
cli.start().catch((error) => {
  console.error(chalk.red('\nFatal error:'), error);
  process.exit(1);
});
