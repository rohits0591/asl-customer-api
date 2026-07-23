const { requireApiKey } = require('../lib/auth');
const { db } = require('../lib/firebase');
const { lookupTpinByAni, normalizeToAni } = require('../lib/lookupCustomer');
const { isValidFourDigit } = require('../lib/tpin');

/**
 * GET  /api/tpin?mobile=919167371528
 *   Returns the currently stored TPIN so the Webex CC / Webex Connect flow can
 *   do its own comparison (input collect + Evaluate node), and can tell
 *   "first time caller" apart from "returning caller" via `exists`.
 *   Response: { success: true, exists: true,  tpin: "1234" }
 *             { success: true, exists: false, tpin: null }
 *
 * POST /api/tpin
 *   Body: { "mobile": "919167371528", "tpin": "4321" }
 *   Stores/overwrites the TPIN value. Use this both the first time a TPIN is
 *   generated (by the flow) and to finalize a reset — the flow owns
 *   generation, comparison, and all the business rules (same-as-old,
 *   repetitive digits, attempt counts); this endpoint just persists the result.
 *   Response: { success: true, stored: true }
 *             { success: false, error: "..." } if the value isn't a 4-digit string
 */
module.exports = async (req, res) => {
  if (!requireApiKey(req, res)) return;

  if (req.method === 'GET') {
    const { mobile } = req.query;
    if (!mobile) {
      return res.status(400).json({ success: false, error: 'Query param "mobile" is required' });
    }
    try {
      const record = await lookupTpinByAni(mobile);
      return res.status(200).json({ success: true, exists: !!record, tpin: record ? record.TPIN : null });
    } catch (err) {
      console.error('tpin GET error:', err);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    const { mobile, tpin } = req.body || {};
    if (!mobile || !tpin) {
      return res.status(400).json({ success: false, error: 'mobile and tpin are required' });
    }
    if (!isValidFourDigit(tpin)) {
      return res.status(400).json({ success: false, error: 'tpin must be exactly 4 digits' });
    }
    try {
      const ani = normalizeToAni(mobile);
      await db.collection('tpins').doc(ani).set({
        Customer_ANI: ani,
        TPIN: String(tpin),
        updatedAt: new Date().toISOString()
      });
      return res.status(200).json({ success: true, stored: true });
    } catch (err) {
      console.error('tpin POST error:', err);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed, use GET or POST' });
};
