// Local dev: copy to `env.js` (do not commit env.js) and fill with real values.
//
// Render (Static Site): set these environment variables and use build command:
//   `npm install && npm run build:render`
//
// Required env vars for Render:
//   APP_API_BASE_URL
//   APP_GOOGLE_API_KEY
//   APP_GOOGLE_CLIENT_ID
//   APP_FIREBASE_API_KEY
//   APP_FIREBASE_AUTH_DOMAIN
//   APP_FIREBASE_PROJECT_ID
//   APP_FIREBASE_APP_ID
//
// This file is loaded by `src/index.html` before Angular bootstraps.
window.__env = {
  apiBaseUrl: 'http://localhost:3000',
  googleApiKey: '',
  googleClientId: '',
  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    appId: ''
  }
};
