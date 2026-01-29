const admin = require("firebase-admin");
const path = require("path");

function loadServiceAccount() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json && json.trim()) {
    return JSON.parse(json);
  }

  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (filePath) {
    return require(path.resolve(filePath));
  }

  return null;
}

if (!admin.apps.length) {
  const serviceAccount = loadServiceAccount();
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    admin.initializeApp();
  }
}

const db = admin.firestore();

module.exports = { admin, db };
