SELECT 
  id,
  name,
  "whatsappPhoneNumber" as business_number,
  "whatsappCredentials"->>'phoneNumberId' as phone_number_id,
  LEFT("whatsappCredentials"->>'accessToken', 40) as access_token_preview
FROM organizations 
WHERE id = 'test-org-dr-demo';
