const { requireApiKey } = require('../lib/auth');
const { lookupCustomerByMobile, lookupTpinByAni } = require('../lib/lookupCustomer');

/**
 * POST /api/verify
 * Body: { "mobile": "919167371528", "dob": "1990-01-30", "tpin": "1234" }
 *
 * Implements the 3-factor authentication used in the ASL Inbound CC flow:
 *   1. RMN  - registered mobile number (caller's ANI must match a client record)
 *   2. DOB  - date of birth match
 *   3. TPIN - transaction PIN match
 *
 * Response:
 *   { success: true, verified: true,  customer: { ENTITY_NAME, ENTITY_ID, ... } }
 *   { success: true, verified: false, reason: "customer_not_found" | "dob_mismatch" | "tpin_mismatch" }
 *
 * A WxCC / Webex Connect voicebot flow calls this after collecting DOB + TPIN via
 * DTMF or speech, then branches on `verified` to grant/deny account access.
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed, use POST' });
  }
  if (!requireApiKey(req, res)) return;

  const { mobile, dob, tpin } = req.body || {};
  if (!mobile || !dob || !tpin) {
    return res.status(400).json({ success: false, error: 'mobile, dob, and tpin are all required' });
  }

  try {
    const customer = await lookupCustomerByMobile(mobile);
    if (!customer) {
      return res.status(200).json({ success: true, verified: false, reason: 'customer_not_found' });
    }

    // DOB stored as "YYYY-MM-DD"; compare on that basis regardless of how caller formats it.
    const suppliedDob = new Date(dob).toISOString().slice(0, 10);
    if (customer.DOB !== suppliedDob) {
      return res.status(200).json({ success: true, verified: false, reason: 'dob_mismatch' });
    }

    const tpinRecord = await lookupTpinByAni(mobile);
    if (!tpinRecord || tpinRecord.TPIN !== String(tpin)) {
      return res.status(200).json({ success: true, verified: false, reason: 'tpin_mismatch' });
    }

    return res.status(200).json({
      success: true,
      verified: true,
      customer: {
        ENTITY_ID: customer.ENTITY_ID,
        ENTITY_NAME: customer.ENTITY_NAME,
        BRANCH_NAME: customer.BRANCH_NAME,
        RM_ID: customer.RM_ID,
        critical_customer: customer.critical_customer,
        gc: customer.gc
      }
    });
  } catch (err) {
    console.error('verify error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
