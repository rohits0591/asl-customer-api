const { db } = require('./firebase');

/** All five contact-number fields on a client record that an inbound ANI can match against. */
const MOBILE_LOOKUP_FIELDS = ['ENT_MOBILE_NO', 'ENT_MOBILE_NO_2', 'AR_MOBILE_NUMBER', 'C1 Number', 'C2 Number'];

/**
 * The account holder's OWN registered numbers only - excludes AR_MOBILE_NUMBER
 * (the Authorized Representative's number). Used for the DOB + registered-number
 * lookup, where the caller is expected to identify themselves with their own
 * number, not a representative's.
 */
const REGISTERED_NUMBER_FIELDS = ['ENT_MOBILE_NO', 'ENT_MOBILE_NO_2', 'C1 Number', 'C2 Number'];

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

/** Accepts DDMMYYYY (as prompted in the flow) or ISO YYYY-MM-DD; returns YYYY-MM-DD. */
function normalizeDob(raw) {
  const str = String(raw);
  if (/^\d{8}$/.test(str)) {
    return `${str.slice(4, 8)}-${str.slice(2, 4)}-${str.slice(0, 2)}`;
  }
  return str;
}

/**
 * Looks up a client record by checking ENT_MOBILE_NO, ENT_MOBILE_NO_2,
 * AR_MOBILE_NUMBER, C1 Number, and C2 Number in parallel. Returns the first match, or null.
 */
async function lookupCustomerByMobile(rawMobile) {
  const mobile = normalizeToPlus91(rawMobile);

  const queries = MOBILE_LOOKUP_FIELDS.map((field) =>
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
 * Returns EVERY client record linked to a number (checking all five contact
 * fields - both mobile numbers, the AR mobile, and both landline numbers),
 * de-duplicated by ENTITY_ID. Used to drive the flow's "Check SINGLE or
 * MULTIPLE accounts for the same number" decision.
 */
async function lookupAllAccountsByMobile(rawMobile) {
  const mobile = normalizeToPlus91(rawMobile);

  const snapshots = await Promise.all(
    MOBILE_LOOKUP_FIELDS.map((field) => db.collection('clients').where(field, '==', mobile).get())
  );

  const byEntityId = new Map();
  for (const snap of snapshots) {
    snap.docs.forEach((doc) => byEntityId.set(doc.id, doc.data()));
  }
  return Array.from(byEntityId.values());
}

/**
 * Returns every client record whose OWN registered number (ENT_MOBILE_NO,
 * ENT_MOBILE_NO_2, C1 Number, or C2 Number - NOT the AR number) matches, AND
 * whose DOB matches. Used by the DOB + registered-number lookup endpoint.
 */
async function lookupAccountsByRegisteredNumberAndDob(rawMobile, rawDob) {
  const mobile = normalizeToPlus91(rawMobile);
  const dob = normalizeDob(rawDob);

  const snapshots = await Promise.all(
    REGISTERED_NUMBER_FIELDS.map((field) => db.collection('clients').where(field, '==', mobile).get())
  );

  const byEntityId = new Map();
  for (const snap of snapshots) {
    snap.docs.forEach((doc) => byEntityId.set(doc.id, doc.data()));
  }

  return Array.from(byEntityId.values()).filter((account) => account.DOB === dob);
}

module.exports = {
  normalizeToPlus91,
  normalizeToAni,
  normalizeDob,
  lookupCustomerByMobile,
  lookupTpinByAni,
  lookupAllAccountsByMobile,
  lookupAccountsByRegisteredNumberAndDob
};
