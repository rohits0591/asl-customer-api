const { db } = require('./firebase');

/**
 * Normalizes a phone number to the "+91XXXXXXXXXX" format used in ENT_MOBILE_NO /
 * ENT_MOBILE_NO_2 / AR_MOBILE_NUMBER so a WxCC ANI (which may arrive as
 * "919167371528", "9167371528", or "+919167371528") always matches.
 */
function normalizeToPlus91(raw) {
  let digits = String(raw).replace(/[^0-9]/g, '');
  if (digits.length === 10) digits = '91' + digits;
  if (digits.startsWith('91') && digits.length === 12) return '+' + digits;
  if (digits.length === 13 && digits.startsWith('91')) return '+' + digits.slice(0, 12);
  return '+' + digits;
}

/** Bare digits, no '+', for the tpins collection (matches TPIN.xlsx Customer_ANI format). */
function normalizeToAni(raw) {
  return normalizeToPlus91(raw).replace('+', '');
}

/**
 * Looks up a client record by checking ENT_MOBILE_NO, ENT_MOBILE_NO_2, and
 * AR_MOBILE_NUMBER in parallel. Returns the first match, or null.
 */
async function lookupCustomerByMobile(rawMobile) {
  const mobile = normalizeToPlus91(rawMobile);
  const fields = ['ENT_MOBILE_NO', 'ENT_MOBILE_NO_2', 'AR_MOBILE_NUMBER'];

  const queries = fields.map((field) =>
    db.collection('clients').where(field, '==', mobile).limit(1).get()
  );

  const snapshots = await Promise.all(queries);
  for (const snap of snapshots) {
    if (!snap.empty) {
      return snap.docs[0].data();
    }
  }
  return null;
}

async function lookupTpinByAni(rawMobile) {
  const ani = normalizeToAni(rawMobile);
  const doc = await db.collection('tpins').doc(ani).get();
  return doc.exists ? doc.data() : null;
}

/**
 * Returns EVERY client record linked to a mobile number (checking all three
 * mobile fields), de-duplicated by ENTITY_ID. Used to drive the flow's
 * "Check SINGLE or MULTIPLE accounts for the same number" decision.
 */
async function lookupAllAccountsByMobile(rawMobile) {
  const mobile = normalizeToPlus91(rawMobile);
  const fields = ['ENT_MOBILE_NO', 'ENT_MOBILE_NO_2', 'AR_MOBILE_NUMBER'];

  const snapshots = await Promise.all(
    fields.map((field) => db.collection('clients').where(field, '==', mobile).get())
  );

  const byEntityId = new Map();
  for (const snap of snapshots) {
    snap.docs.forEach((doc) => byEntityId.set(doc.id, doc.data()));
  }
  return Array.from(byEntityId.values());
}

module.exports = {
  normalizeToPlus91,
  normalizeToAni,
  lookupCustomerByMobile,
  lookupTpinByAni,
  lookupAllAccountsByMobile
};
