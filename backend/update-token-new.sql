UPDATE organizations 
SET "whatsappCredentials" = jsonb_set(
  "whatsappCredentials", 
  '{accessToken}', 
  '"EAAZAL57abE0gBPrR2uWZCzcKZCgAaghCOY1YZCxZCONhInarV3jsiSNxwhV7lcE0qN8MGSescdseH0FaqOuaP9lmSV4cWr0FqkDA98wqdBwbqt6x9SfzzHbZCQb6LJd89EbLAMvrDtCW8nMe7uOavLLHtuhXrJWZCGbyQIzPpZCE0KHHnZC0PTjoEWGBZAGK10h7QySyZAppsreD2o8MvOVz52vwBujg4gX55nHiGWxIS7pxxAZD"'
) 
WHERE id = 'test-org-dr-demo';

SELECT LEFT("whatsappCredentials"->>'accessToken', 40) as token_preview FROM organizations WHERE id = 'test-org-dr-demo';
