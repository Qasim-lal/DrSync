INSERT INTO organizations (id, name, slug, email, "createdAt", "updatedAt") 
VALUES ('cm0test1234567890123456', 'Test Clinic', 'test-clinic', 'admin@test-clinic.com', NOW(), NOW()) 
ON CONFLICT (id) DO NOTHING;
