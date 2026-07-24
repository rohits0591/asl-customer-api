/**
 * lib/formatDob.js
 * Firestore stores DOB internally as "YYYY-MM-DD" (needed for the equality
 * matching in lookupCustomer.js / normalizeDob). These helpers reformat DOB
 * to "DDMMYYYY" ONLY at the response layer, so API consumers (the Webex CC /
 * Webex Connect flow) always see the same DDMMYYYY format the flow prompts in.
 */

function toDDMMYYYY(isoDate) {
  if (!isoDate || typeof isoDate !== 'string') return isoDate;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate; // not the expected stored format - return unchanged rather than guess
  const [, yyyy, mm, dd] = match;
  return `${dd}${mm}${yyyy}`;
}

/** Returns a shallow copy of a client/account record with DOB reformatted to DDMMYYYY. */
function withFormattedDob(record) {
  if (!record) return record;
  return { ...record, DOB: toDDMMYYYY(record.DOB) };
}

/** Same as withFormattedDob, applied to an array of records. */
function withFormattedDobList(records) {
  return (records || []).map(withFormattedDob);
}

module.exports = { toDDMMYYYY, withFormattedDob, withFormattedDobList };
