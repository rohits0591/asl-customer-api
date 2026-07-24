/**
 * lib/formatAccount.js
 * Response-layer formatting applied to every client/account record before it
 * goes out over the API. Two transforms, neither of which touch what's
 * actually stored in Firestore:
 *
 * 1. Key sanitization: several source columns have spaces in their names
 *    (e.g. "C1 Number", "C2 Number", "Extension of Primary RM",
 *    "Extension of Secondary RM"). Webex Connect's Pebble expressions can't
 *    address a key containing a space (e.g. {{ record.C1 Number }} doesn't
 *    parse), so every key with spaces is rewritten to use underscores instead
 *    (e.g. "C1_Number", "Extension_of_Primary_RM") before the response is sent.
 *
 * 2. DOB reformatting: stored internally as "YYYY-MM-DD" (needed for the
 *    equality matching in lookupCustomer.js), reformatted to "DDMMYYYY" here
 *    to match what the flow prompts the caller for.
 */

function toDDMMYYYY(isoDate) {
  if (!isoDate || typeof isoDate !== 'string') return isoDate;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate; // not the expected stored format - return unchanged rather than guess
  const [, yyyy, mm, dd] = match;
  return `${dd}${mm}${yyyy}`;
}

/** Replaces any run of whitespace in a key with a single underscore. */
function sanitizeKey(key) {
  return key.replace(/\s+/g, '_');
}

/** Returns a shallow copy of a client/account record: sanitized keys + DOB reformatted to DDMMYYYY. */
function formatAccountForResponse(record) {
  if (!record || typeof record !== 'object') return record;

  const result = {};
  for (const [key, value] of Object.entries(record)) {
    const safeKey = sanitizeKey(key);
    result[safeKey] = key === 'DOB' ? toDDMMYYYY(value) : value;
  }
  return result;
}

/** Same as formatAccountForResponse, applied to an array of records. */
function formatAccountListForResponse(records) {
  return (records || []).map(formatAccountForResponse);
}

module.exports = { toDDMMYYYY, sanitizeKey, formatAccountForResponse, formatAccountListForResponse };
