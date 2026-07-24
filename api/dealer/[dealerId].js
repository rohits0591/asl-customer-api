const { requireApiKey } = require('../../lib/auth');
const { db } = require('../../lib/firebase');
const { withFormattedDob } = require('../../lib/formatDob');

/**
 * GET /api/dealer/475101
 * Returns the first client record found for a given DEALER_ID, which carries
 * the dealer name/email + branch/region/RM context useful for routing.
 */
module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed, use GET' });
  }
  if (!requireApiKey(req, res)) return;

  const { dealerId } = req.query;

  try {
    const snap = await db.collection('clients').where('DEALER_ID', '==', String(dealerId)).limit(1).get();
    if (snap.empty) {
      return res.status(200).json({ success: true, found: false });
    }
    return res.status(200).json({ success: true, found: true, dealer: withFormattedDob(snap.docs[0].data()) });
  } catch (err) {
    console.error('dealer lookup error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
