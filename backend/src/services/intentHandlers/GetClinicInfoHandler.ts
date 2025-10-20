/**
 * Get Clinic Info Handler - TASK-040 (Section 4.3)
 * 
 * Provides clinic contact information (address, phone, hours).
 * 
 * @version 1.0
 * @date October 19, 2025
 */

import { BaseIntentHandler, IntentHandlerContext, IntentHandlerResult } from './BaseIntentHandler';
import { Intent } from '../intentRecognitionService';
import messageTemplates from '../messageTemplates';

export class GetClinicInfoHandler extends BaseIntentHandler {
  constructor() {
    super(Intent.GET_CLINIC_INFO);
  }

  public async handle(context: IntentHandlerContext): Promise<IntentHandlerResult> {
    this.validateContext(context);

    const org = context.organization;

    // Format clinic hours (default if not set)
    const hours = 'Mon-Fri: 9:00 AM - 6:00 PM, Sat: 9:00 AM - 2:00 PM';

    // Build contact information message
    const message = messageTemplates.format(
      messageTemplates.CONTACT_INFO,
      context.language,
      {
        clinicName: org.name,
        clinicPhone: org.phone || 'Not available',
        clinicAddress: org.address || 'Not available',
        clinicHours: hours,
      }
    );

    return this.success(message);
  }
}
