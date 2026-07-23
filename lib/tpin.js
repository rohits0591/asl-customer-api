/** Basic format check used only when persisting a TPIN value (data integrity, not
 * business validation - the actual compare/generate/repetitive-digit rules now
 * live in the Webex CC / Webex Connect flow itself). */
function isValidFourDigit(tpin) {
  return /^\d{4}$/.test(String(tpin));
}

module.exports = { isValidFourDigit };
