const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) { res.status(400).send('SLACK_WEBHOOK_URL not set'); return; }

  const payload = JSON.stringify({ text: req.body.text });
  const parsed = new URL(webhookUrl);
  return new Promise((resolve) => {
    const proxy = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(payload),
      }
    }, (pr) => {
      res.status(pr.statusCode).end();
      resolve();
    });
    proxy.on('error', e => { res.status(500).send(e.message); resolve(); });
    proxy.write(payload);
    proxy.end();
  });
};
