const https = require('https');
const http = require('http');
const fs = require('fs');

// Simple HTTPS proxy server for PWA testing
const FRONTEND_PORT = 3000;
const HTTPS_PORT = 8443;

// Generate simple self-signed certificate using Node.js built-in crypto
const crypto = require('crypto');

// Create a basic self-signed certificate
function createSelfSignedCert() {
  const { generateKeyPairSync } = crypto;
  
  // Generate key pair
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  // For development, we'll use a pre-generated certificate
  // This is a simple self-signed cert for localhost
  const cert = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKL0UG8lM2k2MA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMjMwMTAxMTAwMDAwWhcNMjQwMTAxMTAwMDAwWjBF
MQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEA3VoPN9PKUjKFLMwOge6+G3NaUlysSOgPkRkw1OJKAM8JCGQEPmtHOGJZ
FHWJ0OTLgN5LJgY8MrjZHlU+gOB08NlBtmHKGVzKKiDjPFlj2JGKyFMIplGhkCjX
9w4DDNKLt8PFJDdkUeRZnz+RDWG7EgOqFQ6PQTSDfXNDfadjU7nEGm8Yfe7XVMGA
8X+TJHZ2tGVQD3N95OcW8Y3YfcQeWXVGN4jEczHWN1lgv2ASkm6+1K09JuqTt2+m
6pq2ZVpTtTf8rUCOqv2k9gkM6e3E2/YoxQ7TzfJ4iE9xGzWGKvN7oGKpwSUFDZZU
2iQ7YBq6VrfIg2mDnlnE+VjJKcxpzQIDAQABo1AwTjAdBgNVHQ4EFgQU4Jk6Z4Dm
2JVtR8/I9FMgZ18Jh9AwHwYDVR0jBBgwFoAU4Jk6Z4Dm2JVtR8/I9FMgZ18Jh9Aw
DAYDVR0TBAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAQEAyWj8vGz7YKLJZPmgGJQV
OWRqc4FnqOqzQJGIzQ+RGqhECRzP8Wfr6wvz8BoLt6k5QGBzNE/dKkCw7gMYJr8x
PgSJ1LMCqWG5q0FOmdOdGOBt8W1nj1gC8rQgLXY+SoH6Nkp+WxlNFTjPaUU/6fAC
Hx1+e2lK4kn8uQZq8vW4dOnbJH7Z8cM5AUZMKx8XAQIZf1m5WQH4q5k8oQ/BDHP8
q5Uw7K5uM5qNOgLMoXMLeFhWpFqY4jGZp2HiA4XF7XxE+3GzHRY+vJaQ8rZ2CUF4
JxOFPWkNyy7lLK8T9RZFjU8qHrWF2qpKhE6dHhIwYP8lGYa3zE6eFtK/Q1FnQaR9
w==
-----END CERTIFICATE-----`;

  const key = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDdWg8308pSMoUs
zA6B7r4bc1pSXKxI6A+RGTDUlkoAzwkIZAQ+a0c4YlkUdYnQ5MuA3ksmBjwyuNke
VT6A4HTw2UG2YcoZXMoqIOM8WWPYkYrIUwimUaGQKNf3DgMM0ou3w8UkN2RR5Fmf
P5ENYbsSA6oVDo9BNIN9c0N9p2NTucQabxh97tdUwYDxf5MkdnbEZVAPc33k5xbx
jdh9xB5ZdUY3iMRzMdY3WWC/YBKSbr7UrT0m6pO3b6bqmrZlWlO1N/ytQI6q/aT2
CQzp7cTb9ijFDtPN8niIT3EbNYYq83ugYqnBJQUNllTaJDtgGrpWt8iDaYOeWcT5
WMkpzGnNAgMBAAECggEBAMqG+DF/dIRHzM7IxPLJAKfpjjT4K3VCwuMELnLhAn9x
kY4x+LCYLJKCqD+/rGKFh7AiQGJCG4rCVSMOH8L4WlO5Q7CdZpGQUQ6/DCTV8RUL
8F4OPBGr8PxEY7rXkJ7Y6d9dKnhxJ7QQqP6F7mGVGh9J7JQkB3wjTyC8pR2qNZ2n
GvHF3mGWJvJ1N+YrKJgF7w8J4ZlMxJjNGjGgKfL1N7yjfXR1cD7rJ7xqKJjN5MnN
qNrF4JdK4FKRjZ8QGqM7fGqN4nGJKmJFyRjGRxT3pDqM7WNlqF4/dNKc9qGwfJ4j
F1+Q6m+pJrYf4H1hKmGVE8IbKf+MNqjZLEHzWJRWz0CgYEA+DtYhiKxHp6FgJ2g
xM7zFnH5CQTWnT8b5k7cPrWqnGf5iO5HhEKNy+PjpXzRpSu5P4HmY8cJqMq7nLLn
5zF7WZH4J6I6zqXxDUZFJhJ8kU1lQJqFhW3cNq3x4n1BcJk3CgYEA5p8KXhHjGOv
8Tz5wJ4O3o7UH6+9Lh3ZzD7fG/BuQGF2N+rVJhDnN4qYz1hKT3gL6Vj1h1xO5m7q
L1gJ6QrY7hJjF5wJHxM8CgYBGq4H8DjkUw5LcP4pPJ9gQdH+G6VHJKgF5Nj3b2P7
Km6Yf1Z3nz8GJWrEpXJGQqFhMmLTwAECgYEA0+F4cYYc5pKG9Hs8nJwqGpZ7n3J5
nJqGPgNJpGgGfJ4J8pRhGlgJ6fJ5pJJZNpGJ2nJN4JhJlKJqZXqR2JmJJJJZGqM7
pZnK5HJqGj5qNqpJGp+QFJmKqJrGJJJhNqL3gJF2nYqG4J9GJgJJhKnJJJJqJ5Z5
JmJ+QGJZHnJqKqJ4gKgJ6qQJJqGJJJqJmJJJJqJhGJJJJJJJJhGJZoJ5JqJJJmJ5Q
Jm6HgJJ5J+YJ5gJgQIBAwKBgBPqJHJJ5J6gJGJGJJJZNJJJJJJJJJJJJqJJJJJJ
JJJJJJJJJJJJJJJJJJJJJZqJJJJJJJJJJJqJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ
JJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ
JJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ
-----END PRIVATE KEY-----`;
  
  return { key, cert };
}

// Proxy server to add HTTPS to your existing HTTP frontend
function createHTTPSProxy() {
  console.log(`Starting HTTPS proxy server...`);
  console.log(`Frontend running on: http://localhost:${FRONTEND_PORT}`);
  console.log(`HTTPS proxy will run on: https://localhost:${HTTPS_PORT}`);
  
  try {
    const { key, cert } = createSelfSignedCert();
    
    const httpsOptions = { key, cert };
    
    const server = https.createServer(httpsOptions, (req, res) => {
      // Add CORS headers for PWA
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      };
      
      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.writeHead(200, corsHeaders);
        res.end();
        return;
      }
      
      // Forward all requests to the HTTP frontend
      const options = {
        hostname: 'localhost',
        port: FRONTEND_PORT,
        path: req.url,
        method: req.method,
        headers: { ...req.headers, host: `localhost:${FRONTEND_PORT}` }
      };
      
      const proxy = http.request(options, (response) => {
        // Add CORS headers to response
        const responseHeaders = { ...response.headers, ...corsHeaders };
        res.writeHead(response.statusCode, responseHeaders);
        response.pipe(res, { end: true });
      });
      
      req.pipe(proxy, { end: true });
      
      proxy.on('error', (err) => {
        console.error('Proxy error:', err.message);
        res.writeHead(502, corsHeaders);
        res.end('Bad Gateway - Frontend not available');
      });
    });
    
    server.listen(HTTPS_PORT, '0.0.0.0', () => {
      console.log('✅ HTTPS Proxy Server running!');
      console.log('📱 For mobile PWA testing:');
      console.log('   1. Find your WiFi IP address with: ipconfig');
      console.log(`   2. Access: https://[YOUR_IP]:${HTTPS_PORT}`);
      console.log('   3. Accept the self-signed certificate warning');
      console.log('   4. Now you should see PWA install option on mobile!');
      console.log('');
      console.log('⚠️  You will see a certificate warning - this is normal for development');
      console.log('   Click "Advanced" → "Proceed to [IP] (unsafe)" to continue');
      console.log('');
      console.log('🎯 This should enable true PWA installation on mobile devices!');
    });
    
    server.on('error', (err) => {
      console.error('HTTPS server error:', err.message);
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${HTTPS_PORT} is already in use. Try stopping other services.`);
      }
    });
    
  } catch (error) {
    console.error('Failed to create HTTPS server:', error.message);
    process.exit(1);
  }
}

// Check if frontend is running
function checkFrontend() {
  console.log('Checking if DrSync frontend is running...');
  
  const request = http.request({
    hostname: 'localhost',
    port: FRONTEND_PORT,
    path: '/manifest.json',
    method: 'GET',
    timeout: 5000
  }, (res) => {
    if (res.statusCode === 200) {
      console.log('✅ Frontend detected - creating HTTPS proxy...');
      createHTTPSProxy();
    } else {
      console.log(`❌ Frontend returned status ${res.statusCode}`);
      console.log('Please ensure DrSync is running properly');
      process.exit(1);
    }
  });
  
  request.on('error', (err) => {
    console.error('❌ Cannot connect to frontend:', err.message);
    console.log('');
    console.log('Please make sure DrSync frontend is running:');
    console.log('  docker-compose -f docker-compose.dev.yml up frontend');
    console.log('  or check: http://localhost:3000');
    process.exit(1);
  });
  
  request.on('timeout', () => {
    console.error('❌ Frontend connection timeout');
    request.destroy();
    process.exit(1);
  });
  
  request.end();
}

// Main execution
console.log('🚀 DrSync HTTPS Proxy for Mobile PWA Testing');
console.log('=============================================');
console.log('This will create an HTTPS proxy to enable PWA installation on mobile');
console.log('');

checkFrontend();