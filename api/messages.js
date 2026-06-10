const https = require('https');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' }); return; }

  const payload = JSON.stringify(req.body);

  return new Promise((resolve) => {
    const proxyReq = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-length': Buffer.byteLength(payload),
      }
    }, (proxyRes) => {
      let data = '';
      proxyRes.on('data', (chunk) => { data += chunk; });
      proxyRes.on('end', () => {
        res.status(proxyRes.statusCode);
        res.setHeader('content-type', 'application/json');
        res.send(data);
        resolve();
      });
    });
    proxyReq.on('error', (e) => { res.status(500).send(e.message); resolve(); });
    proxyReq.write(payload);
    proxyReq.end();
  });
};
