const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const port = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type,x-api-key,anthropic-version,anthropic-dangerous-allow-browser');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // Slack proxy
  if (req.method === 'POST' && req.url === '/api/slack') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      const { text } = JSON.parse(body);
      // Read webhook URL from HTML at runtime to avoid duplication
      const html = require('fs').readFileSync(__dirname + '/customer-support-navi.html', 'utf8');
      const match = html.match(/SLACK_WEBHOOK_URL\s*=\s*'([^']+)'/);
      const webhookUrl = match ? match[1] : '';
      if (!webhookUrl || webhookUrl === 'YOUR_SLACK_WEBHOOK_URL') {
        res.writeHead(400); res.end('Webhook URL not configured'); return;
      }
      const parsed = new URL(webhookUrl);
      const payload = JSON.stringify({ text });
      const proxy = https.request({
        hostname: parsed.hostname, path: parsed.pathname + parsed.search,
        method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) }
      }, pr => { res.writeHead(pr.statusCode); pr.pipe(res); });
      proxy.on('error', e => { res.writeHead(500); res.end(e.message); });
      proxy.write(payload); proxy.end();
    });
    return;
  }

  // Anthropic proxy
  if (req.method === 'POST' && req.url === '/api/messages') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      const apiKey = req.headers['x-api-key'];
      const proxy = https.request({
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        }
      }, pr => {
        res.writeHead(pr.statusCode, { 'content-type': 'application/json' });
        pr.pipe(res);
      });
      proxy.on('error', e => { res.writeHead(500); res.end(e.message); });
      proxy.write(body);
      proxy.end();
    });
    return;
  }

  // Static files
  const file = path.join(__dirname, req.url === '/' ? '/customer-support-navi.html' : req.url);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(file);
    const mime = ext === '.js' ? 'application/javascript' : 'text/html; charset=utf-8';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}).listen(port, () => console.log(`Listening on ${port}`));
