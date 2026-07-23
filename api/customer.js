const { requireApiKey } = require('../lib/auth');
const { lookupAllAccountsByMobile } = require('../lib/lookupCustomer');

/**
 * GET /api/customer?mobile=919167371528
 *
 * Intended caller: a Webex Connect "Send API Request" / Evaluate node, or a WxCC
 * Flow "HTTP Request" activity, passing in the inbound ANI (System.Call.ANI).
 *
 * Returns EVERY client record linked to that number - checking ENT_MOBILE_NO,
 * ENT_MOBILE_NO_2, AND AR_MOBILE_NUMBER (so a number that's only registered as
 * an Authorized Representative on one or more accounts still surfaces all of
 * them, not just an entity where it's the primary contact).
 *
 * Response shape:
 *   { success: true, found: true,  count: 2, type: "multiple", accounts: [ {...}, {...} ], customer: {...first match, for backward compatibility...} }
 *   { success: true, found: false, count: 0, type: "none",     accounts: [] }
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
    if (accounts.length === 0) {
      return res.status(200).json({ success: true, found: false, count: 0, type: 'none', accounts: [] });
    }
    const type = accounts.length === 1 ? 'single' : 'multiple';
    return res.status(200).json({
      success: true,
      found: true,
      count: accounts.length,
      type,
      accounts,
      customer: accounts[0] // convenience field for flow steps that only need a single record
    });
  } catch (err) {
    console.error('customer lookup error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
