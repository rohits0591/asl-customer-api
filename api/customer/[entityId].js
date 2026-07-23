const { requireApiKey } = require('../../lib/auth');
const { db } = require('../../lib/firebase');

/**
 * GET /api/customer/15329478
 * Direct lookup by ENTITY_ID (Firestore doc id in the 'clients' collection).
 */
module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed, use GET' });
  }
  if (!requireApiKey(req, res)) return;

  const { entityId } = req.query;

  try {
    const doc = await db.collection('clients').doc(String(entityId)).get();
    if (!doc.exists) {
      return res.status(200).json({ success: true, found: false });
    }
    return res.status(200).json({ success: true, found: true, customer: doc.data() });
  } catch (err) {
    console.error('entityId lookup error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
