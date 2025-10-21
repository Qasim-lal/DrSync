const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production';

const payload = {
  userId: 'test-user-phase2',
  organizationId: 'test-org-phase2-settings',
  role: 'ORG_ADMIN',
  email: 'test@phase2clinic.com'
};

// Token expires in 30 days
const token = jwt.sign(payload, JWT_SECRET, { 
  expiresIn: '30d',
  issuer: 'drsync-api',
  audience: 'drsync-client'
});

console.log('\n🔑 JWT Token Generated:\n');
console.log(token);
console.log('\n📋 Copy this command and run in browser console:\n');
console.log(`localStorage.setItem('token', '${token}');\n`);
