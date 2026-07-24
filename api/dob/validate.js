const { requireApiKey } = require('../../lib/auth');
const { lookupAllAccountsByMobile, normalizeDob } = require('../../lib/lookupCustomer');
const { formatAccountForResponse } = require('../../lib/formatAccount');

/**
 * POST /api/dob/validate
 * Body: { "mobile": "919167371528", "dob": "15031990" | "1990-03-15", "entityId": "15329478" }
 *
 * Used for the "Please enter your date of birth in DDMMYYYY format" step,
 * which only runs on the MULTIPLE-accounts branch to disambiguate which
 * account's dealer to route to. `entityId` is optional — if the caller has
 * already been narrowed to one account (e.g. from a prior menu choice), pass
 * it to validate against that specific record; otherwise all accounts on the
 * number are checked and the first DOB match wins.
 *
 * Response:
 *   { success: true, valid: true, customer: { ...matched account... } }
 *   { success: true, valid: false, reason: "no_account_found" | "dob_mismatch" }
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed, use POST' });
  }
  if (!requireApiKey(req, res)) return;

  const { mobile, dob, entityId } = req.body || {};
  if (!mobile || !dob) {
    return res.status(400).json({ success: false, error: 'mobile and dob are required' });
  }

  const normalizedDob = normalizeDob(dob);

  try {
    const accounts = await lookupAllAccountsByMobile(mobile);
    if (accounts.length === 0) {
      return res.status(200).json({ success: true, valid: false, reason: 'no_account_found' });
    }

    const candidates = entityId ? accounts.filter((a) => String(a.ENTITY_ID) === String(entityId)) : accounts;
    const match = candidates.find((a) => a.DOB === normalizedDob);

    if (!match) {
      return res.status(200).json({ success: true, valid: false, reason: 'dob_mismatch' });
    }
    return res.status(200).json({ success: true, valid: true, customer: formatAccountForResponse(match) });
  } catch (err) {
    console.error('dob validate error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
