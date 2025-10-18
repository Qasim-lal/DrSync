SELECT 
  id,
  "whatsappPhoneNumber",
  CASE 
    WHEN "whatsappCredentials" IS NULL THEN 'NULL'
    WHEN "whatsappCredentials"::text = '{}' THEN 'EMPTY'
    ELSE 'CONFIGURED'
  END as creds_status,
  "whatsappCredentials"->>'phoneNumberId' as phone_id_preview
FROM organizations 
WHERE id = 'test-org-dr-demo';
