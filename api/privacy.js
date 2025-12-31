module.exports = async (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(`
<!doctype html>
<html>
<head><meta charset="utf-8"><title>Privacy Policy</title></head>
<body>
  <h1>Privacy Policy</h1>
  <p>This GPT connects to the Oura API to analyze health and wellness data for the user who authorizes access.</p>

  <h2>Data Usage</h2>
  <ul>
    <li>Only the requesting user’s Oura data is accessed.</li>
    <li>Data is used only to generate on-demand insights.</li>
    <li>No data is sold.</li>
  </ul>

  <h2>Data Storage</h2>
  <ul>
    <li>Data is processed temporarily to answer requests.</li>
    <li>No personal health data is stored permanently by this service.</li>
  </ul>

  <h2>Third Parties</h2>
  <ul>
    <li>Oura API is used to retrieve user-authorized data.</li>
    <li>OpenAI may be used to generate analysis responses.</li>
  </ul>

  <h2>Contact</h2>
  <p>Email: YOUR_EMAIL_HERE</p>
</body>
</html>
  `);
};
