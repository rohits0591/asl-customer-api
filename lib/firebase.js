/**
 * lib/firebase.js
 * Initializes Firebase Admin SDK once, using environment variables so no
 * service-account JSON file needs to be committed to the repo.
 *
 * Uses the modular API (firebase-admin/app, firebase-admin/firestore) rather
 * than the older namespaced admin.initializeApp()/admin.apps style - this
 * works consistently across firebase-admin v11 through v14+, whereas the
 * legacy namespaced export shape has changed across major versions.
 *
 * Required environment variables (set these in Vercel Project Settings -> Environment Variables,
 * and in a local .env file for testing):
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY   (paste the full key; \n line breaks are handled below)
 *
 * Get these three values from: Firebase Console -> Project Settings -> Service accounts
 * -> Generate new private key (downloads a JSON file containing project_id, client_email, private_key).
 */

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Vercel/`.env` files store the key with literal "\n" — convert back to real newlines.
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    })
  });
}

const db = getFirestore();

module.exports = { db };
