UPDATE organizations 
SET "whatsappPhoneNumber" = '+1 555 656 3819'
WHERE id = 'test-org-dr-demo';

SELECT 
  "whatsappPhoneNumber" as business_number
FROM organizations 
WHERE id = 'test-org-dr-demo';
