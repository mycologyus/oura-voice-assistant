const requireKey = require("./_auth");

function toArray(maybe) {
  if (!maybe) return [];
  if (Array.isArray(maybe)) return maybe;
  if (Array.isArray(maybe.data)) return maybe.data;
  return [];
}

function pick(obj, keys) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return null;
}

module.exports = async (req, res) => {
  try {
    if (!requireKey(req, res)) return;

    const token = process.env.OURA_ACCESS_TOKEN;
    if (!token) return res.status(500).send("Missing OURA_ACCESS_TOKEN");

    const days = parseInt((req.query.days || "30").toString(), 10);
    const iso = (d) => d.toISOString().slice(0, 10);

    let end = new Date();
    let start = new Date();
    start.setDate(end.getDate() - days);

    if (req.query.start_date && req.query.end_date) {
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
      return j;
    };

    // Core sources that cover most Trend charts
    const [sleep, readiness, activity, spo2] = await Promise.all([
      fetchOura("daily_sleep"),
      fetchOura("daily_readiness"),
      fetchOura("daily_activity"),
      fetchOura("spo2"),
    ]);

    const sleepArr = toArray(sleep);
    const readyArr = toArray(readiness);
    const actArr = toArray(activity);
    const spo2Arr = toArray(spo2);

    // Build time-series dictionary
    const series = {};
    const add = (name, date, value) => {
      if (value === null || value === undefined) return;
      if (typeof value === "number" && Number.isNaN(value)) return;
      if (!date) return;
      if (!series[name]) series[name] = [];
      series[name].push({ date, value });
    };

    // ---- SLEEP (most sleep charts live here) ----
    for (const d of sleepArr) {
      const date = pick(d, ["day", "date"]) || pick(d, ["summary_date"]);
      add("sleep_score", date, pick(d, ["score", "sleep_score"]));
      add("time_in_bed", date, pick(d, ["time_in_bed"]));
      add("total_sleep", date, pick(d, ["total_sleep_duration", "total_sleep"]));
      add("awake_time", date, pick(d, ["awake_time"]));
      add("deep_sleep_time", date, pick(d, ["deep_sleep_duration", "deep_sleep_time"]));
      add("light_sleep_time", date, pick(d, ["light_sleep_duration", "light_sleep_time"]));
      add("rem_sleep_time", date, pick(d, ["rem_sleep_duration", "rem_sleep_time"]));
      add("sleep_efficiency", date, pick(d, ["sleep_efficiency"]));
      add("sleep_latency", date, pick(d, ["sleep_latency"]));
      add("bedtime", date, pick(d, ["bedtime_start", "bedtime"]));
      add("wake_up_time", date, pick(d, ["bedtime_end", "wake_up_time", "wakeup_time"]));
      add("midpoint", date, pick(d, ["midpoint_time", "midpoint"]));

      // Heart-related sleep metrics
      add("average_hrv", date, pick(d, ["average_hrv", "hrv_rmssd", "rmssd", "average_rmssd"]));
      add("average_resting_hr", date, pick(d, ["average_heart_rate", "average_resting_hr"]));
      add("lowest_resting_hr", date, pick(d, ["lowest_heart_rate", "lowest_resting_hr"]));

      // Physiology
      add("respiratory_rate", date, pick(d, ["respiratory_rate"]));
      add("temperature_deviation", date, pick(d, ["temperature_deviation"]));
      add("temperature_trend_deviation", date, pick(d, ["temperature_trend_deviation"]));
    }

    // ---- READINESS ----
    for (const d of readyArr) {
      const date = pick(d, ["day", "date"]) || pick(d, ["summary_date"]);
      add("readiness_score", date, pick(d, ["score", "readiness_score"]));
      add("temperature_deviation_readiness", date, pick(d, ["temperature_deviation"]));
      add("resting_hr_readiness", date, pick(d, ["resting_heart_rate"]));
      add("hrv_balance", date, pick(d, ["hrv_balance"]));
      add("recovery_index", date, pick(d, ["recovery_index"]));
    }

    // ---- ACTIVITY ----
    for (const d of actArr) {
      const date = pick(d, ["day", "date"]) || pick(d, ["summary_date"]);
      add("activity_score", date, pick(d, ["score", "activity_score"]));
      add("steps", date, pick(d, ["steps"]));
      add("total_burn", date, pick(d, ["total_burn"]));
      add("activity_burn", date, pick(d, ["activity_burn"]));
      add("average_met", date, pick(d, ["average_met"]));
      add("inactive", date, pick(d, ["inactive_time", "inactive"]));
      add("resting_time", date, pick(d, ["resting_time"]));
      add("low_activity", date, pick(d, ["low_activity_time", "low_activity"]));
      add("medium_activity", date, pick(d, ["medium_activity_time", "medium_activity"]));
      add("high_activity", date, pick(d, ["high_activity_time", "high_activity"]));
      add("non_wear_time", date, pick(d, ["non_wear_time"]));
      add("walking_equivalency", date, pick(d, ["walking_equivalency"]));
    }

    // ---- SPO2 ----
    for (const d of spo2Arr) {
      const date = pick(d, ["day", "date"]) || pick(d, ["summary_date"]);
      add("average_oxygen_saturation", date, pick(d, ["average_spo2", "spo2_percentage", "average_oxygen_saturation"]));
    }

    // Sort each series by date (ascending)
    for (const k of Object.keys(series)) {
      series[k].sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));
    }

    res.status(200).json({
      window: { start_date: qs.get("start_date"), end_date: qs.get("end_date") },
      available_metrics: Object.keys(series).sort(),
      series,
      notes: {
        tip: "Ask GPT for any metric in available_metrics, or ask broad health questions; GPT can combine multiple series.",
        units_hint:
          "Some values are seconds (sleep durations), some are bpm, some are %, and some are timestamps (bedtime/wake).",
      },
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
};
