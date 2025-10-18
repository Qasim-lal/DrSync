UPDATE organizations 
SET "whatsappCredentials" = jsonb_set(
  "whatsappCredentials", 
  '{accessToken}', 
  '"EAAZAL57abE0gBPiKdBKl2WToix7u4wtYTuNxSPVTFbi3wZA6DkksYBZCuIeKuTjvwriFWvRBFa2Wu4VqA4RLqTmsJ2lBZC44L4LZAEJ3dVy0JqeRIxg7FALH3NGLL1lEZC6H9KR49pYmZAhBCVrXwCkUJQAeLraU3ZBxwMHeVbpsFL9RhCe6PsPOQxi2ZCrAWvdjl3YetmFIGfziii9Ubu2bAunTr7SrSc8ZAZBdJhWh7XGAZDZD"'
) 
WHERE id = 'test-org-dr-demo';

SELECT 'Token updated' as status;
