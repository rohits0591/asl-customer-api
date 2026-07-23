module.exports = (req, res) => {
  res.status(200).json({ success: true, status: 'ok', time: new Date().toISOString() });
};
