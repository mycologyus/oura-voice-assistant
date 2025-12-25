module.exports = async (req, res) => {
  try {
    const token = process.env.OURA_ACCESS_TOKEN;
    if (!token) return res.status(500).send("Missing OURA_ACCESS_TOKEN env var");

    // Last 30 days
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);

    const iso = (d) => d.toISOString().slice(0, 10); // YYYY-MM-DD
    const qs = new URLSearchParams({
      start_date: iso(start),
      end_date: iso(end),
    });

    const url = `https://api.ouraring.com/v2/usercollection/daily_sleep?${qs.toString()}`;

    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await r.json();
    res.status(r.status).json({ request_url: url, ...data });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
};
