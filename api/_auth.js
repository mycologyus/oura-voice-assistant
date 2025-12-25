module.exports = function requireKey(req, res) {
  const expected = process.env.BACKEND_API_KEY;
  const got =
    req.headers["x-api-key"] ||
    (req.headers.authorization || "").replace(/^Bearer\s+/i, "");

  if (!expected) {
    res.status(500).send("Missing BACKEND_API_KEY on server");
    return false;
  }
  if (!got || got !== expected) {
    res.status(401).send("Unauthorized");
    return false;
  }
  return true;
};
