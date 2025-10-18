UPDATE organizations 
SET "whatsappCredentials" = jsonb_set(
  "whatsappCredentials", 
  '{accessToken}', 
  '"EAAZAL57abE0gBPgh58LFncaZAeJLSRD774jASGc20Y17fTyrBl1ePWTKY5QSJ1W2oY7YfIVvE6kI46ZCG9b9lWbJHqsFvuFW9D8ZCCIAcnQ1V2KTij0drrO0dC57M3egEb6Snq2g89Eiee2FItNYnlRwlnjzo2RADCRFkFDaEnrgoUEDBNI1xCGaT02llzUnrn1DHh8eKBwqEYjDEATZAqLPHzeNFpY9ckMkWDZBlLCgZDZD"'
) 
WHERE id = 'test-org-dr-demo';
