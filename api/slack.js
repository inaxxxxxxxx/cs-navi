const https = require('https');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) { res.status(500).json({ error: 'SLACK_WEBHOOK_URL not set' }); return; }

  const payload = JSON.stringify({ text: req.body.text });
  const parsed = new URL(webhookUrl);

  return new Promise((resolve) => {
    const proxyReq = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(payload),
      }
    }, (proxyRes) => {
      res.status(proxyRes.statusCode).end();
      resolve();
    });
    proxyReq.on('error', (e) => { res.status(500).send(e.message); resolve(); });
    proxyReq.write(payload);
    proxyReq.end();
  });
};
