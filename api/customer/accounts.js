const { requireApiKey } = require('../../lib/auth');
const { lookupAllAccountsByMobile } = require('../../lib/lookupCustomer');

/**
 * GET /api/customer/accounts?mobile=919167371528
 *
 * Drives the flow's "Check SINGLE or MULTIPLE accounts for the same number" step.
 *
 * Response:
 *   { success: true, count: 1, type: "single",   accounts: [ {...} ] }
 *   { success: true, count: 3, type: "multiple", accounts: [ {...}, {...}, {...} ] }
 *   { success: true, count: 0, type: "none",     accounts: [] }
 */
module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed, use GET' });
  }
  if (!requireApiKey(req, res)) return;

  const { mobile } = req.query;
  if (!mobile) {
    return res.status(400).json({ success: false, error: 'Query param "mobile" is required' });
  }

  try {
    const accounts = await lookupAllAccountsByMobile(mobile);
    const type = accounts.length === 0 ? 'none' : accounts.length === 1 ? 'single' : 'multiple';
    return res.status(200).json({ success: true, count: accounts.length, type, accounts });
  } catch (err) {
    console.error('accounts lookup error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
