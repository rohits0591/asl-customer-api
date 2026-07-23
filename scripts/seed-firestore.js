/**
 * seed-firestore.js
 * Pushes data/clients.json and data/tpins.json into Firestore.
 *
 * Collections created:
 *   clients  -> doc id = ENTITY_ID   (customer / dealer / branch / RM mapping record)
 *   tpins    -> doc id = Customer_ANI (mobile number without '+', matches WxCC ANI format)
 *
 * Usage:
 *   1. Set env vars (see lib/firebase.js) or create a .env file (see .env.example)
 *   2. node scripts/seed-firestore.js
 */

require('dotenv').config();
const { db } = require('../lib/firebase');
const clients = require('../data/clients.json');
const tpins = require('../data/tpins.json');

async function seed() {
  console.log(`Seeding ${clients.length} client records into 'clients' collection...`);
  let batch = db.batch();
  let opCount = 0;

  for (const record of clients) {
    const ref = db.collection('clients').doc(String(record.ENTITY_ID));
    batch.set(ref, record);
    opCount++;
    if (opCount === 400) { // Firestore batch limit is 500 writes
      await batch.commit();
      batch = db.batch();
      opCount = 0;
    }
  }
  if (opCount > 0) await batch.commit();
  console.log('Client records seeded.');

  console.log(`Seeding ${tpins.length} TPIN records into 'tpins' collection...`);
  batch = db.batch();
  opCount = 0;
  for (const record of tpins) {
    const ref = db.collection('tpins').doc(record.Customer_ANI);
    batch.set(ref, record);
    opCount++;
    if (opCount === 400) {
      await batch.commit();
      batch = db.batch();
      opCount = 0;
    }
  }
  if (opCount > 0) await batch.commit();
  console.log('TPIN records seeded.');

  console.log('Done. Firestore now contains the 100 sample records.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
