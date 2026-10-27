const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

// Support two ways to provide the Firebase service account:
//  1. FIREBASE_SERVICE_ACCOUNT_JSON env var (JSON string) — used on Render / cloud
//  2. Local serviceAccountKey.json file — used in local dev
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
} else {
  serviceAccount = require('./serviceAccountKey.json');
}

const app = initializeApp({
  credential: cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET
});

const db = getFirestore(app);
const bucket = getStorage(app).bucket();

module.exports = { db, bucket };
