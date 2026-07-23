/**
 * Very lightweight API-key check so this demo endpoint isn't wide open on the public internet.
 * Webex Connect / WxCC flow nodes should send header:  x-api-key: <API_KEY>
 * Set API_KEY as an environment variable in Vercel.
 */
function requireApiKey(req, res) {
  const configuredKey = process.env.API_KEY;
  if (!configuredKey) return true; // no key configured -> auth disabled (fine for local/dev testing)

  const providedKey = req.headers['x-api-key'];
  if (providedKey !== configuredKey) {
    res.status(401).json({ success: false, error: 'Invalid or missing x-api-key header' });
    return false;
  }
  return true;
}

module.exports = { requireApiKey };
