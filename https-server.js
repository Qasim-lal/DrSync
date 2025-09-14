const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Simple HTTPS proxy server for PWA testing
const FRONTEND_PORT = 3000;
const HTTPS_PORT = 8443;

// Generate self-signed certificate (for development only)
const forge = require('node-forge');

function generateSelfSignedCert() {
  console.log('Generating self-signed certificate for PWA testing...');
  
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
  
  const attrs = [
    { name: 'commonName', value: 'localhost' },
    { name: 'countryName', value: 'US' },
    { shortName: 'ST', value: 'CA' },
    { name: 'localityName', value: 'San Francisco' },
    { name: 'organizationName', value: 'DrSync Development' }
  ];
  
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey);
  
  return {
    key: forge.pki.privateKeyToPem(keys.privateKey),
    cert: forge.pki.certificateToPem(cert)
  };
}

// Proxy server to add HTTPS to your existing HTTP frontend
function createHTTPSProxy() {
  console.log(`Starting HTTPS proxy server...`);
  console.log(`Frontend running on: http://localhost:${FRONTEND_PORT}`);
  console.log(`HTTPS proxy will run on: https://localhost:${HTTPS_PORT}`);
  
  const certs = generateSelfSignedCert();
  
  const httpsOptions = {
    key: certs.key,
    cert: certs.cert
  };
  
  const server = https.createServer(httpsOptions, (req, res) => {
    // Forward all requests to the HTTP frontend
    const options = {
      hostname: 'localhost',
      port: FRONTEND_PORT,
      path: req.url,
      method: req.method,
      headers: req.headers
    };
    
    const proxy = http.request(options, (response) => {
      res.writeHead(response.statusCode, response.headers);
      response.pipe(res, { end: true });
    });
    
    req.pipe(proxy, { end: true });
    
    proxy.on('error', (err) => {
      console.error('Proxy error:', err.message);
      res.writeHead(502);
      res.end('Bad Gateway - Frontend not available');
    });
  });
  
  server.listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log('✅ HTTPS Proxy Server running!');
    console.log('📱 For mobile PWA testing:');
    console.log(`   1. Find your WiFi IP address`);
    console.log(`   2. Access: https://[YOUR_IP]:${HTTPS_PORT}`);
    console.log(`   3. Accept the self-signed certificate warning`);
    console.log(`   4. Install PWA on mobile device`);
    console.log('');
    console.log('⚠️  You will see a certificate warning - this is normal for development');
    console.log('   Click "Advanced" → "Proceed to localhost (unsafe)" to continue');
  });
  
  server.on('error', (err) => {
    console.error('HTTPS server error:', err.message);
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${HTTPS_PORT} is already in use. Try a different port.`);
    }
  });
}

// Check if frontend is running
function checkFrontend() {
  const request = http.request({
    hostname: 'localhost',
    port: FRONTEND_PORT,
    path: '/manifest.json',
    method: 'GET'
  }, (res) => {
    if (res.statusCode === 200) {
      console.log('✅ Frontend detected - creating HTTPS proxy...');
      createHTTPSProxy();
    } else {
      console.log('❌ Frontend not responding correctly');
      process.exit(1);
    }
  });
  
  request.on('error', (err) => {
    console.error('❌ Cannot connect to frontend:', err.message);
    console.log('Please make sure DrSync frontend is running on http://localhost:3000');
    console.log('Run: docker-compose -f docker-compose.dev.yml up frontend');
    process.exit(1);
  });
  
  request.end();
}

// Start the HTTPS proxy
console.log('🚀 DrSync HTTPS Proxy for Mobile PWA Testing');
console.log('===========================================');
checkFrontend();