module.exports = (req, res) => {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.OURA_CLIENT_ID,
    redirect_uri: process.env.OURA_REDIRECT_URI,
    scope: "daily personal workout tag session spo2 heartrate",
  });

  const url = `https://cloud.ouraring.com/oauth/authorize?${params.toString()}`;
  res.redirect(url);
};
