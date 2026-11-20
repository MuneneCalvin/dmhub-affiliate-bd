// Local-only merchant for the reproducible lifecycle suite. Payment is a deterministic
// simulator; the real DMHub SDK, referral API and authenticated events API run.
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';

if (!process.env.LIFECYCLE_RUN_DIR)
    throw new Error('Start through npm run test:lifecycle');
const config = () =>
    JSON.parse(
        readFileSync(`${process.env.LIFECYCLE_RUN_DIR}/merchant.json`, 'utf8'),
    );
const appUrl = process.env.APP_URL;
const events = new Map();
let sequence = 0;
const forms = new Map();
const submissions = new Map();
const confirm = async (payload) => {
    const response = await fetch(`${appUrl}/api/v1/events`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${config().credential}`,
        },
        body: JSON.stringify(payload),
    });
    return { http_status: response.status, ...(await response.json()) };
};

createServer(async (req, res) => {
    try {
        if (req.url === '/health') {
            res.writeHead(200);
            res.end('ready');
            return;
        }
        if (req.method === 'POST') {
            let raw = '';
            for await (const chunk of req) raw += chunk;
            const data = JSON.parse(raw);
            let result;
            if (req.url === '/submission') {
                // This test website owns its contacts; only conversion metadata goes to DM Hub.
                const started = forms.get(data.form_token);
                if (
                    !started ||
                    !data.first_name ||
                    !/^[^@]+@[^@]+\.[^@]+$/.test(data.email ?? '')
                ) {
                    result = { http_status: 422, error: 'Invalid form' };
                } else {
                    const key = data.email.trim().toLowerCase();
                    const payload = submissions.get(key) ?? {
                        event_type: 'submission',
                        external_id: `submission:${randomUUID()}`,
                        ...data.referral,
                        amount: '0.00',
                        currency: 'USD',
                        occurred_at: new Date().toISOString(),
                        successful: true,
                        spam_checks: {
                            honeypot_filled: Boolean(data.honeypot),
                            form_duration_ms: Date.now() - started,
                            is_spam: false,
                        },
                    };
                    submissions.set(key, payload);
                    events.set('submission', payload);
                    result = await confirm(payload);
                }
            } else if (req.url === '/purchase') {
                if (data.outcome !== 'paid') {
                    result = { status: 'payment_failed', confirmed: false };
                } else {
                    // A real merchant must verify a payment callback. This test
                    // simulator owns the order value and acceptance timestamp.
                    const payload = {
                        event_type: 'purchase',
                        external_id: `browser-order-${++sequence}`,
                        referral_id: data.referral_id,
                        amount: '100.00',
                        currency: 'USD',
                        occurred_at: new Date().toISOString(),
                    };
                    events.set('purchase', payload);
                    result = await confirm(payload);
                }
            } else if (req.url === '/replay' || req.url === '/conflict') {
                const payload = events.get(data.kind);
                result = await confirm(
                    req.url === '/conflict'
                        ? { ...payload, amount: '101.00' }
                        : payload,
                );
            } else {
                result = { error: 'Unknown test endpoint' };
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return;
        }
        const kind = req.url.startsWith('/submission')
            ? 'submission'
            : 'purchase';
        const script = config().scripts[kind] ?? config().scripts.submission;
        const formToken = randomUUID();
        forms.set(formToken, Date.now());
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Browser audit merchant</title>
        <style>body{font:18px system-ui;max-width:760px;margin:48px auto;padding:20px}label{display:block;margin:16px 0}input,button{font:inherit;padding:10px}button{margin:8px}pre{white-space:pre-wrap;background:#eef;padding:20px}</style></head><body>
        <h1>${kind === 'submission' ? 'Request a product demonstration' : 'Test checkout'}</h1>
        <p>Local QA merchant. Synthetic customers and simulated payment only.</p>
        <form id="unrelated"><label>Account email <input name="email" value="private@example.test"></label><label>Password <input name="password" type="password" value="never-send-this"></label><button>Sign in</button></form>
        ${kind === 'submission' ? '<form id="submission"><label>Your name <input name="first_name" required></label><label>Your email <input name="email" type="email" required></label><button>Submit enquiry</button></form>' : '<p>Test product: $100.00 USD</p><a href="/cart">Go to cart</a><button id="fail">Simulate failed payment</button><button id="pay">Pay test order</button>'}
        <button id="retry">Replay confirmation</button><button id="conflict">Replay changed amount</button><pre id="result" role="status">Ready</pre>
        <script src="${script}"></script><script>
        const result=document.querySelector('#result'); let captured;
        const post=async(url,data)=>{const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const payload=await response.json();result.textContent=JSON.stringify(payload,null,2);return payload};
        document.querySelector('#unrelated').onsubmit=e=>{e.preventDefault();result.textContent='Unrelated login submitted';};
        const form=document.querySelector('#submission');
        if(form) form.onsubmit=async e=>{e.preventDefault();try{await post('/submission',{
            form_token:'${formToken}',first_name:form.first_name.value,email:form.email.value,
            referral:await window.DMHub.getReferral()
        });}catch(error){result.textContent=error.message}};
        const referral=()=>{const fromUrl=new URLSearchParams(location.search).get('referral_id');if(fromUrl){sessionStorage.setItem('order_referral',fromUrl);return fromUrl}return sessionStorage.getItem('order_referral')}; referral();
        document.querySelector('#fail')?.addEventListener('click',()=>post('/purchase',{referral_id:referral(),outcome:'failed'}));
        document.querySelector('#pay')?.addEventListener('click',()=>post('/purchase',{referral_id:referral(),outcome:'paid'}));
        document.querySelector('#retry').onclick=()=>post('/replay',{kind:'${kind}'});
        document.querySelector('#conflict').onclick=()=>post('/conflict',{kind:'${kind}'});
        document.body.dataset.ready='1';
        </script></body></html>`);
    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
    }
}).listen(Number(process.env.LIFECYCLE_MERCHANT_PORT), '127.0.0.1');
