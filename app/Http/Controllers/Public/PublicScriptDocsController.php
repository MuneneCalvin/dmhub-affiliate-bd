<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\PublisherCampaigns;
use Illuminate\Http\Request;

class PublicScriptDocsController extends Controller
{
    public function show(string $token)
    {
        $publisherCampaign = PublisherCampaigns::where('script_token', $token)
            ->where('status', 'A')
            ->with(['campaign', 'offer', 'publisher.user'])
            ->first();

        if (!$publisherCampaign) {
            abort(404, 'Script not found or inactive');
        }

        $scriptUrl = $publisherCampaign->getScriptUrl();
        $embedTag = $publisherCampaign->getEmbedScriptTag();

        $html = $this->generateHtmlDocumentation($publisherCampaign, $scriptUrl, $embedTag);

        return response($html)->header('Content-Type', 'text/html');
    }

    public function downloadMarkdown(string $token)
    {
        $publisherCampaign = PublisherCampaigns::where('script_token', $token)
            ->where('status', 'A')
            ->with(['campaign', 'offer'])
            ->first();

        if (!$publisherCampaign) {
            abort(404, 'Script not found or inactive');
        }

        $markdown = $this->generateMarkdown($publisherCampaign);
        $filename = 'integration-guide-' . date('Y-m-d') . '.md';

        return response($markdown)
            ->header('Content-Type', 'text/markdown')
            ->header('Content-Disposition', "attachment; filename=\"{$filename}\"");
    }

    protected function generateHtmlDocumentation(PublisherCampaigns $pc, string $scriptUrl, string $embedTag): string
    {
        $campaignName = htmlspecialchars($pc->campaign?->name ?? 'Campaign');
        $escapedScriptUrl = htmlspecialchars($scriptUrl);
        $escapedEmbedTag = htmlspecialchars($embedTag);
        $token = $pc->script_token;
        $apiUrl = url('/');

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lead Capture Script - Integration Guide</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; color: #1a1a1a; background: #f8fafc;
        }
        .container { max-width: 900px; margin: 0 auto; padding: 40px 20px; }
        header {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: white; padding: 60px 20px; text-align: center; margin-bottom: 40px;
        }
        header h1 { font-size: 2.5rem; margin-bottom: 10px; }
        header p { opacity: 0.9; font-size: 1.1rem; }
        .card {
            background: white; border-radius: 12px; padding: 30px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 24px;
        }
        h2 { color: #1e40af; margin-bottom: 16px; font-size: 1.5rem; }
        h3 { color: #374151; margin: 20px 0 12px; font-size: 1.1rem; }
        pre {
            background: #1e293b; color: #e2e8f0; padding: 20px; border-radius: 8px;
            overflow-x: auto; font-size: 0.9rem; margin: 12px 0;
        }
        code { font-family: 'Monaco', 'Menlo', monospace; }
        .inline-code {
            background: #f1f5f9; color: #dc2626; padding: 2px 6px;
            border-radius: 4px; font-size: 0.85rem;
        }
        .copy-btn {
            background: #2563eb; color: white; border: none; padding: 8px 16px;
            border-radius: 6px; cursor: pointer; font-size: 0.85rem; margin-top: 8px;
        }
        .copy-btn:hover { background: #1d4ed8; }
        .copy-btn.copied { background: #059669; }
        .tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
        .tab {
            padding: 10px 20px; border: 2px solid #e5e7eb; border-radius: 8px;
            cursor: pointer; background: white; font-weight: 500;
        }
        .tab:hover { border-color: #2563eb; }
        .tab.active { background: #2563eb; color: white; border-color: #2563eb; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .warning {
            background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px;
            border-radius: 0 8px 8px 0; margin: 16px 0;
        }
        .success {
            background: #d1fae5; border-left: 4px solid #059669; padding: 16px;
            border-radius: 0 8px 8px 0; margin: 16px 0;
        }
        ul { padding-left: 24px; margin: 12px 0; }
        li { margin: 8px 0; }
        .download-btn {
            display: inline-block; background: #059669; color: white;
            padding: 12px 24px; border-radius: 8px; text-decoration: none;
            font-weight: 600; margin-top: 20px;
        }
        .download-btn:hover { background: #047857; }
        footer { text-align: center; color: #6b7280; padding: 40px 20px; }
        @media (max-width: 640px) {
            header h1 { font-size: 1.75rem; }
            .container { padding: 20px 16px; }
        }
    </style>
</head>
<body>

<header>
    <h1>Lead Capture Script</h1>
    <p>Integration Guide for Website Owners</p>
</header>

<div class="container">
    <div class="card">
        <h2>Quick Start</h2>
        <p>Add this single line of code to your website to enable lead capture:</p>
        <pre id="quickstart-code"><code>{$escapedEmbedTag}</code></pre>
        <button class="copy-btn" onclick="copyCode('quickstart-code', this)">Copy to Clipboard</button>

        <div class="success">
            <strong>That's it!</strong> The script automatically captures form submissions and sends lead data to our system without interfering with your forms.
        </div>
    </div>

    <div class="card">
        <h2>Platform-Specific Instructions</h2>
        <div class="tabs">
            <div class="tab active" onclick="showTab('html')">HTML</div>
            <div class="tab" onclick="showTab('react')">React</div>
            <div class="tab" onclick="showTab('nextjs')">Next.js</div>
            <div class="tab" onclick="showTab('vue')">Vue.js</div>
            <div class="tab" onclick="showTab('wordpress')">WordPress</div>
            <div class="tab" onclick="showTab('shopify')">Shopify</div>
            <div class="tab" onclick="showTab('gtm')">GTM</div>
        </div>

        <div id="tab-html" class="tab-content active">
            <h3>HTML / Static Website</h3>
            <p>Add the script before the closing <code class="inline-code">&lt;/body&gt;</code> tag:</p>
            <pre><code>&lt;!DOCTYPE html&gt;
&lt;html&gt;
&lt;head&gt;
    &lt;title&gt;Your Website&lt;/title&gt;
&lt;/head&gt;
&lt;body&gt;
    &lt;!-- Your content --&gt;

    &lt;!-- Lead Capture Script --&gt;
    {$escapedEmbedTag}
&lt;/body&gt;
&lt;/html&gt;</code></pre>
        </div>

        <div id="tab-react" class="tab-content">
            <h3>React</h3>
            <p>Add to <code class="inline-code">public/index.html</code> or load dynamically:</p>
            <pre><code>// Option 1: In public/index.html before &lt;/body&gt;
{$escapedEmbedTag}

// Option 2: In App.js
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '{$escapedScriptUrl}';
    script.async = true;
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  return &lt;div&gt;Your App&lt;/div&gt;;
}</code></pre>
        </div>

        <div id="tab-nextjs" class="tab-content">
            <h3>Next.js</h3>
            <p>Use the Script component:</p>
            <pre><code>import Script from 'next/script';

export default function Layout({ children }) {
  return (
    &lt;&gt;
      {children}
      &lt;Script
        src="{$escapedScriptUrl}"
        strategy="lazyOnload"
      /&gt;
    &lt;/&gt;
  );
}</code></pre>
        </div>

        <div id="tab-vue" class="tab-content">
            <h3>Vue.js</h3>
            <p>Add to <code class="inline-code">public/index.html</code> or mount dynamically:</p>
            <pre><code>&lt;!-- In public/index.html --&gt;
{$escapedEmbedTag}

&lt;!-- Or in a component --&gt;
&lt;script&gt;
export default {
  mounted() {
    const script = document.createElement('script');
    script.src = '{$escapedScriptUrl}';
    script.async = true;
    document.body.appendChild(script);
  }
}
&lt;/script&gt;</code></pre>
        </div>

        <div id="tab-wordpress" class="tab-content">
            <h3>WordPress</h3>
            <p>Add to your theme's <code class="inline-code">functions.php</code>:</p>
            <pre><code>function add_lead_capture_script() {
    wp_enqueue_script(
        'dmhub-lead-capture',
        '{$escapedScriptUrl}',
        array(),
        null,
        true
    );
}
add_action('wp_enqueue_scripts', 'add_lead_capture_script');

// Or use a plugin like "Insert Headers and Footers"</code></pre>
        </div>

        <div id="tab-shopify" class="tab-content">
            <h3>Shopify</h3>
            <p>Add to your theme's <code class="inline-code">theme.liquid</code>:</p>
            <pre><code>&lt;!-- Steps:
1. Go to Online Store &gt; Themes
2. Actions &gt; Edit code
3. Find theme.liquid
4. Add before &lt;/body&gt;: --&gt;

{$escapedEmbedTag}</code></pre>
        </div>

        <div id="tab-gtm" class="tab-content">
            <h3>Google Tag Manager</h3>
            <p>Add as a Custom HTML tag:</p>
            <pre><code>&lt;!-- In GTM:
1. Create new Tag
2. Tag Type: Custom HTML
3. HTML Content: --&gt;

{$escapedEmbedTag}

&lt;!-- 4. Trigger: All Pages
5. Save and Publish --&gt;</code></pre>
        </div>
    </div>

    <div class="card">
        <h2>Excluding Forms</h2>
        <p>To prevent specific forms from being tracked, add one of these:</p>
        <pre><code>&lt;!-- Method 1: CSS class --&gt;
&lt;form class="no-dmhub"&gt;
    &lt;!-- This form will NOT be tracked --&gt;
&lt;/form&gt;

&lt;!-- Method 2: Data attribute --&gt;
&lt;form data-dmhub-ignore="true"&gt;
    &lt;!-- This form will NOT be tracked --&gt;
&lt;/form&gt;</code></pre>
    </div>

    <div class="card">
        <h2>Manual Popup Trigger</h2>
        <p>Show the lead capture popup programmatically:</p>
        <pre><code>// Show popup
window.DMHub.show();

// Hide popup
window.DMHub.hide();

// Example: On button click
document.getElementById('cta-btn').addEventListener('click', function() {
    window.DMHub.show();
});</code></pre>
    </div>

    <div class="card">
        <h2>Testing</h2>
        <ol>
            <li>Open your browser's Developer Tools (F12)</li>
            <li>Go to the Console tab</li>
            <li>Look for: <code class="inline-code">[DMHub] Form interception active</code></li>
            <li>Submit a test form with an email field</li>
            <li>Check for: <code class="inline-code">[DMHub] Lead captured: success</code></li>
        </ol>

        <div class="warning">
            <strong>Note:</strong> Only forms with an email field will be captured. Forms without email fields are automatically skipped.
        </div>
    </div>

    <div class="card">
        <h2>Troubleshooting</h2>
        <ul>
            <li><strong>Script not loading:</strong> Check for Content Security Policy (CSP) restrictions</li>
            <li><strong>Forms not captured:</strong> Ensure forms have an email input field</li>
            <li><strong>Console errors:</strong> Check if ad blockers are interfering</li>
        </ul>
    </div>

    <div class="card">
        <h2>Technical Details</h2>
        <ul>
            <li><strong>Script URL:</strong> <code class="inline-code">{$escapedScriptUrl}</code></li>
            <li><strong>Script Token:</strong> <code class="inline-code">{$token}</code></li>
            <li><strong>API Endpoint:</strong> <code class="inline-code">{$apiUrl}/api/v1/leads/submit</code></li>
        </ul>

        <a href="/docs/script/{$token}/download" class="download-btn">Download as Markdown</a>
    </div>
</div>

<footer>
    <p>Lead Capture Integration Guide • Generated on {$this->now()}</p>
</footer>

<script>
function copyCode(elementId, btn) {
    const code = document.getElementById(elementId).textContent;
    navigator.clipboard.writeText(code).then(() => {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.textContent = 'Copy to Clipboard';
            btn.classList.remove('copied');
        }, 2000);
    });
}

function showTab(tabId) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelector('.tab[onclick="showTab(\\''+tabId+'\\')"]').classList.add('active');
    document.getElementById('tab-' + tabId).classList.add('active');
}
</script>

</body>
</html>
HTML;
    }

    protected function generateMarkdown(PublisherCampaigns $pc): string
    {
        $scriptUrl = $pc->getScriptUrl();
        $embedTag = $pc->getEmbedScriptTag();
        $token = $pc->script_token;
        $apiUrl = url('/');

        return <<<MARKDOWN
# Lead Capture Script - Integration Guide

Generated: {$this->now()}

---

## Quick Start

Add this script to your website:

```html
{$embedTag}
```

Place before `</body>` on pages where you want to capture leads.

---

## How It Works

1. Script detects all forms on your page
2. When a form with email field is submitted, data is captured
3. Original form submission continues normally
4. Leads are sent to the affiliate network

---

## Platform Instructions

### HTML
```html
<body>
    <!-- Your content -->
    {$embedTag}
</body>
```

### React
```jsx
useEffect(() => {
  const script = document.createElement('script');
  script.src = '{$scriptUrl}';
  script.async = true;
  document.body.appendChild(script);
}, []);
```

### Next.js
```jsx
import Script from 'next/script';
<Script src="{$scriptUrl}" strategy="lazyOnload" />
```

### Vue.js
```js
mounted() {
  const script = document.createElement('script');
  script.src = '{$scriptUrl}';
  document.body.appendChild(script);
}
```

### WordPress
```php
function add_lead_script() {
    wp_enqueue_script('dmhub', '{$scriptUrl}', [], null, true);
}
add_action('wp_enqueue_scripts', 'add_lead_script');
```

### Shopify
Add to theme.liquid before `</body>`:
```html
{$embedTag}
```

### Google Tag Manager
1. New Tag > Custom HTML
2. Paste: `{$embedTag}`
3. Trigger: All Pages
4. Publish

---

## Exclude Forms

```html
<form class="no-dmhub">Not tracked</form>
<form data-dmhub-ignore="true">Not tracked</form>
```

---

## Manual Trigger

```js
window.DMHub.show(); // Show popup
window.DMHub.hide(); // Hide popup
```

---

## Testing

1. Open DevTools (F12)
2. Console: Look for `[DMHub] Form interception active`
3. Submit test form
4. Check for `[DMHub] Lead captured: success`

---

## Technical Info

- Script URL: `{$scriptUrl}`
- Token: `{$token}`
- API: `{$apiUrl}/api/v1/leads/submit`
MARKDOWN;
    }

    protected function now(): string
    {
        return now()->format('Y-m-d H:i:s');
    }
}
