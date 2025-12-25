module.exports = async (req, res) => {
  try {
    const token = process.env.OURA_ACCESS_TOKEN;
    if (!token) return res.status(500).send("Missing OURA_ACCESS_TOKEN env var");

    const r = await fetch("https://api.ouraring.com/v2/usercollection/daily_sleep?limit=7", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
};
