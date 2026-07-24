const { requireApiKey } = require('../../lib/auth');
const { lookupAccountsByRegisteredNumberAndDob } = require('../../lib/lookupCustomer');
const { withFormattedDobList } = require('../../lib/formatDob');

/**
 * POST /api/customer/lookup-by-dob
 * Body: { "mobile": "919167371528", "dob": "15031990" | "1990-03-15" }
 *
 * Retrieves account(s) by matching BOTH the registered number AND the DOB
 * together. The number is checked against ENT_MOBILE_NO, ENT_MOBILE_NO_2,
 * C1 Number, and C2 Number ONLY — AR_MOBILE_NUMBER is deliberately excluded,
 * since this endpoint identifies the account HOLDER via their own number,
 * not an Authorized Representative's.
 *
 * Response:
 *   { success: true, found: true,  count: 1, accounts: [ {...} ] }
 *   { success: true, found: false, count: 0, accounts: [] }
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed, use POST' });
  }
  if (!requireApiKey(req, res)) return;

  const { mobile, dob } = req.body || {};
  if (!mobile || !dob) {
    return res.status(400).json({ success: false, error: 'mobile and dob are required' });
  }

  try {
    const rawAccounts = await lookupAccountsByRegisteredNumberAndDob(mobile, dob);
    const accounts = withFormattedDobList(rawAccounts);
    return res.status(200).json({
      success: true,
      found: accounts.length > 0,
      count: accounts.length,
      accounts
    });
  } catch (err) {
    console.error('lookup-by-dob error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
