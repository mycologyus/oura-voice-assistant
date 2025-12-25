module.exports = async (req, res) => {
  try {
    const q = (req.query.q || "").toString().trim();
    if (!q) return res.status(400).send("Missing ?q= question");

    const ouraToken = process.env.OURA_ACCESS_TOKEN;
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!ouraToken) return res.status(500).send("Missing OURA_ACCESS_TOKEN");
    if (!openaiKey) return res.status(500).send("Missing OPENAI_API_KEY");

    // Pull last 30 days sleep + readiness + activity (enough for most questions; we can expand later)
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    const iso = (d) => d.toISOString().slice(0, 10);

    const qs = new URLSearchParams({ start_date: iso(start), end_date: iso(end) });

    const fetchOura = async (path) => {
      const url = `https://api.ouraring.com/v2/usercollection/${path}?${qs.toString()}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${ouraToken}` } });
      const j = await r.json();
      return { url, status: r.status, body: j };
    };

    const [sleep, readiness, activity] = await Promise.all([
      fetchOura("daily_sleep"),
      fetchOura("daily_readiness"),
      fetchOura("daily_activity")
    ]);

    const payload = {
      question: q,
      window: { start_date: iso(start), end_date: iso(end) },
      oura: {
        daily_sleep: sleep.body,
        daily_readiness: readiness.body,
        daily_activity: activity.body
      }
    };

    const system = `You are a personal Oura health insights assistant.
Reply in Persian (Farsi), natural and spoken-friendly.
Be concise but helpful. If the question asks for trends, use the data window.
Do not give medical advice; you can suggest general wellness steps.
If data is insufficient, say what extra timeframe/metric would help.`;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(payload) }
        ],
        temperature: 0.4
      })
    });

    const out = await r.json();
    const answer = out?.choices?.[0]?.message?.content || JSON.stringify(out);
    res.status(200).send(answer);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
};
