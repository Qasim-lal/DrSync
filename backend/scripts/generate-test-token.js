/**
 * Generate Test JWT Token for Frontend Testing
 * 
 * This script generates a valid JWT token for testing the notification settings frontend.
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production';

// Test user payload
const payload = {
  userId: 'test-user-id',
  organizationId: 'test-org-phase2-settings',
  role: 'ORG_ADMIN',
  email: 'test@phase2clinic.com'
};

// Generate token (expires in 24 hours for testing)
const token = jwt.sign(payload, JWT_SECRET, {
  expiresIn: '24h',
  issuer: 'drsync-api',
  audience: 'drsync-client'
});

console.log('\n=== Test JWT Token ===\n');
console.log('Token:', token);
console.log('\n=== Token Details ===');
console.log('User ID:', payload.userId);
console.log('Organization ID:', payload.organizationId);
console.log('Role:', payload.role);
console.log('Email:', payload.email);
console.log('Expires In: 24 hours');
console.log('\n=== Usage ===');
console.log('1. Copy the token above');
console.log('2. In browser console, run:');
console.log(`   localStorage.setItem('authToken', '${token}')`);
console.log('3. Refresh the page');
console.log('\n');
