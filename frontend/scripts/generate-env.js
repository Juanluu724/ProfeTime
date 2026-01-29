/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.warn(`[generate-env] Missing env var: ${name}`);
  }
  return value || '';
}

const config = {
  apiBaseUrl: required('APP_API_BASE_URL'),
  googleApiKey: required('APP_GOOGLE_API_KEY'),
  googleClientId: required('APP_GOOGLE_CLIENT_ID'),
  firebase: {
    apiKey: required('APP_FIREBASE_API_KEY'),
    authDomain: required('APP_FIREBASE_AUTH_DOMAIN'),
    projectId: required('APP_FIREBASE_PROJECT_ID'),
    appId: required('APP_FIREBASE_APP_ID')
  }
};

const out = `// Generated at build time. Do not commit.\nwindow.__env = ${JSON.stringify(
  config,
  null,
  2
)};\n`;

const targetPath = path.join(__dirname, '..', 'src', 'assets', 'env.js');
fs.writeFileSync(targetPath, out, 'utf8');
console.log(`[generate-env] Wrote ${targetPath}`);

