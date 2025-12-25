module.exports = async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) {
      return res.status(400).send("Missing ?code= in callback URL");
    }

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.OURA_REDIRECT_URI,
      client_id: process.env.OURA_CLIENT_ID,
      client_secret: process.env.OURA_CLIENT_SECRET
    });

    const r = await fetch("https://api.ouraring.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });

    const data = await r.json();

    // Show the full response so we can copy tokens into Vercel env vars next.
    res.status(r.status).json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
};
