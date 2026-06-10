const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const payload = JSON.stringify(req.body);
  return new Promise((resolve) => {
    const proxy = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-length': Buffer.byteLength(payload),
      }
    }, (pr) => {
      let data = '';
      pr.on('data', d => data += d);
      pr.on('end', () => { res.status(pr.statusCode).setHeader('content-type','application/json').send(data); resolve(); });
    });
    proxy.on('error', e => { res.status(500).send(e.message); resolve(); });
    proxy.write(payload);
    proxy.end();
  });
};
