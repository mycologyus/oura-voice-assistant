const requireKey = require("./_auth");

module.exports = async (req, res) => {
  try {
    if (!requireKey(req, res)) return;

    const token = process.env.OURA_ACCESS_TOKEN;
    if (!token) return res.status(500).send("Missing OURA_ACCESS_TOKEN");

    // Query params: days=30 (default), or start_date/end_date as YYYY-MM-DD
    const days = parseInt((req.query.days || "30").toString(), 10);

    const iso = (d) => d.toISOString().slice(0, 10);
    let end = new Date();
    let start = new Date();
    start.setDate(end.getDate() - days);

    if (req.query.start_date && req.query.end_date) {
      // Use explicit dates if provided
      start = new Date(req.query.start_date.toString());
      end = new Date(req.query.end_date.toString());
    }

    const qs = new URLSearchParams({
      start_date: iso(start),
      end_date: iso(end),
    });

    const fetchOura = async (path) => {
      const url = `https://api.ouraring.com/v2/usercollection/${path}?${qs.toString()}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const j = await r.json();
      return { status: r.status, body: j };
    };

    const [sleep, readiness, activity, spo2, heartrate, session, workout, tag] =
      await Promise.all([
        fetchOura("daily_sleep"),
        fetchOura("daily_readiness"),
        fetchOura("daily_activity"),
        fetchOura("spo2"),
        fetchOura("heartrate"),
        fetchOura("session"),
        fetchOura("workout"),
        fetchOura("tag"),
      ]);

    res.status(200).json({
      window: { start_date: qs.get("start_date"), end_date: qs.get("end_date") },
      daily_sleep: sleep.body,
      daily_readiness: readiness.body,
      daily_activity: activity.body,
      spo2: spo2.body,
      heartrate: heartrate.body,
      session: session.body,
      workout: workout.body,
      tag: tag.body,
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
};
