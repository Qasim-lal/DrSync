-- Update the WhatsApp Business phone number to the test number
UPDATE organizations 
SET "whatsappPhoneNumber" = '+1 ************'
WHERE id = 'test-org-dr-demo';

-- Verify the update
SELECT 
  id,
  name,
  "whatsappPhoneNumber" as business_number,
  "whatsappCredentials"->>'phoneNumberId' as phone_number_id
FROM organizations 
WHERE id = 'test-org-dr-demo';
