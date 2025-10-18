/**
 * Update WhatsApp Access Token
 * 
 * Usage: node scripts/update-whatsapp-token.js <NEW_ACCESS_TOKEN>
 */

const { PrismaClient } = require('../src/generated/prisma');
const { encryptData } = require('../src/utils/encryption');

const ORGANIZATION_ID = 'test-org-dr-demo';

async function updateAccessToken(newToken) {
  const prisma = new PrismaClient();
  
  try {
    // Get current credentials
    const org = await prisma.organization.findUnique({
      where: { id: ORGANIZATION_ID },
      select: { whatsappCredentials: true }
    });
    
    if (!org || !org.whatsappCredentials) {
      console.error('❌ Organization not found or no WhatsApp credentials configured');
      process.exit(1);
    }
    
    const credentials = org.whatsappCredentials;
    
    // Encrypt the new token
    const encryptedToken = encryptData(newToken);
    
    // Update with new access token
    const updatedCredentials = {
      ...credentials,
      accessToken: encryptedToken
    };
    
    await prisma.organization.update({
      where: { id: ORGANIZATION_ID },
      data: {
        whatsappCredentials: updatedCredentials
      }
    });
    
    console.log('✅ Access token updated successfully!');
    console.log(`   Organization: ${ORGANIZATION_ID}`);
    console.log(`   Token length: ${newToken.length} characters`);
    console.log('\n⚠️  Please restart the backend to apply changes:');
    console.log('   docker restart drsync_backend_dev');
    
  } catch (error) {
    console.error('❌ Error updating token:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get token from command line
const newToken = process.argv[2];

if (!newToken) {
  console.error('❌ Usage: node scripts/update-whatsapp-token.js <NEW_ACCESS_TOKEN>');
  console.error('\nExample:');
  console.error('  node scripts/update-whatsapp-token.js EAABsbCS1iHgBO7cZCwfxxx...');
  process.exit(1);
}

updateAccessToken(newToken);
