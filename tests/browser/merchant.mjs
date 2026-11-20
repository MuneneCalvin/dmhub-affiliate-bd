// A separate merchant origin; its credential never reaches the browser.
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';

const fixture = JSON.parse(readFileSync('.release-fixture.json', 'utf8'));
createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/confirm') {
        try {
            let body = '';
            for await (const chunk of req) body += chunk;
            const { sale, ...payload } = JSON.parse(body);
            const response = await fetch(
                'http://127.0.0.1:8765/api/v1/events',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        Authorization: `Bearer ${sale ? fixture.sale_token : fixture.token}`,
                    },
                    body: JSON.stringify(payload),
                },
            );
            res.writeHead(response.status, {
                'Content-Type': 'application/json',
            });
            res.end(await response.text());
        } catch {
            res.writeHead(500);
            res.end('Merchant confirmation failed');
        }
        return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<!doctype html><html><head><title>Qualification merchant</title></head>
        <body><h1>Merchant checkout</h1>
        <form id="unrelated"><input name="email" value="private@example.test">
        <input name="password" type="password" value="never-send-this"><button>Sign in</button></form>
        <script>document.querySelector('form').addEventListener('submit', e => e.preventDefault())</script>
        <script src="${fixture.script}"></script></body></html>`);
}).listen(8766, '127.0.0.1');
