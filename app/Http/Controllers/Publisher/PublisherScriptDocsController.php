<?php

namespace App\Http\Controllers\Publisher;

use App\Http\Controllers\Controller;
use App\Models\Publisher;
use App\Models\PublisherCampaigns;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PublisherScriptDocsController extends Controller
{
  public function index(Request $request)
  {
    $user = $request->user();
    $publisher = Publisher::where('user_id', $user->id)->first();

    if (!$publisher) {
      return redirect()->route('dashboard')->with('error', 'Publisher account not found');
    }

    // Get all active publisher campaigns with script tokens
    $campaigns = PublisherCampaigns::where('publisher_id', $publisher->id)
      ->where('status', 'A')
      ->with(['campaign', 'offer'])
      ->get()
      ->map(function ($pc) {
        return [
          'id' => $pc->id,
          'campaign_name' => $pc->campaign?->name ?? 'N/A',
          'offer_name' => $pc->offer?->name ?? 'N/A',
          'script_token' => $pc->script_token,
          'script_url' => $pc->getScriptUrl(),
          'embed_tag' => $pc->getEmbedScriptTag(),
          'tracking_link' => $pc->tracking_link,
        ];
      });

    return Inertia::render('publisher/scripts/index', [
      'campaigns' => $campaigns,
      'baseUrl' => url('/'),
    ]);
  }

  public function show(Request $request, int $id)
  {
    $user = $request->user();
    $publisher = Publisher::where('user_id', $user->id)->first();

    if (!$publisher) {
      return redirect()->route('dashboard')->with('error', 'Publisher account not found');
    }

    $publisherCampaign = PublisherCampaigns::where('publisher_id', $publisher->id)
      ->where('id', $id)
      ->with(['campaign', 'offer'])
      ->first();

    if (!$publisherCampaign) {
      return redirect()->route('publisher.scripts')->with('error', 'Campaign not found');
    }

    $scriptData = [
      'id' => $publisherCampaign->id,
      'campaign_name' => $publisherCampaign->campaign?->name ?? 'N/A',
      'offer_name' => $publisherCampaign->offer?->name ?? 'N/A',
      'script_token' => $publisherCampaign->script_token,
      'script_url' => $publisherCampaign->getScriptUrl(),
      'embed_tag' => $publisherCampaign->getEmbedScriptTag(),
      'tracking_link' => $publisherCampaign->tracking_link,
      'form_config' => $publisherCampaign->getFormConfig(),
    ];

    return Inertia::render('publisher/scripts/show', [
      'script' => $scriptData,
      'baseUrl' => url('/'),
    ]);
  }

  public function documentation(Request $request, int $id)
  {
    $user = $request->user();
    $publisher = Publisher::where('user_id', $user->id)->first();

    if (!$publisher) {
      return redirect()->route('dashboard')->with('error', 'Publisher account not found');
    }

    $publisherCampaign = PublisherCampaigns::where('publisher_id', $publisher->id)
      ->where('id', $id)
      ->with(['campaign', 'offer'])
      ->first();

    if (!$publisherCampaign) {
      return redirect()->route('publisher.scripts')->with('error', 'Campaign not found');
    }

    $documentation = $this->generateDocumentation($publisherCampaign);

    return Inertia::render('publisher/scripts/documentation', [
      'campaign' => [
        'id' => $publisherCampaign->id,
        'name' => $publisherCampaign->campaign?->name ?? 'N/A',
        'offer' => $publisherCampaign->offer?->name ?? 'N/A',
      ],
      'documentation' => $documentation,
      'scriptToken' => $publisherCampaign->script_token,
      'baseUrl' => url('/'),
    ]);
  }

  public function downloadDocumentation(Request $request, int $id)
  {
    $user = $request->user();
    $publisher = Publisher::where('user_id', $user->id)->first();

    if (!$publisher) {
      abort(404);
    }

    $publisherCampaign = PublisherCampaigns::where('publisher_id', $publisher->id)
      ->where('id', $id)
      ->with(['campaign', 'offer'])
      ->first();

    if (!$publisherCampaign) {
      abort(404);
    }

    $markdown = $this->generateMarkdownDocumentation($publisherCampaign);

    $filename = sprintf(
      'integration-guide-%s-%s.md',
      \Illuminate\Support\Str::slug($publisherCampaign->campaign?->name ?? 'campaign'),
      date('Y-m-d')
    );

    return response($markdown)
      ->header('Content-Type', 'text/markdown')
      ->header('Content-Disposition', "attachment; filename=\"{$filename}\"");
  }

  protected function generateDocumentation(PublisherCampaigns $pc): array
  {
    $scriptUrl = $pc->getScriptUrl();
    $embedTag = $pc->getEmbedScriptTag();
    $token = $pc->script_token;

    return [
      'quick_start' => [
        'title' => 'Quick Start',
        'description' => 'Add this single line of code to your website to start capturing leads.',
        'code' => $embedTag,
      ],
      'platforms' => [
        [
          'name' => 'HTML / Static Website',
          'icon' => 'html',
          'instructions' => "Add the script tag just before the closing </body> tag:",
          'code' => <<<HTML
<!DOCTYPE html>
<html>
<head>
    <title>Your Website</title>
</head>
<body>
    <!-- Your website content -->

    <!-- Lead Capture Script - Add before </body> -->
    {$embedTag}
</body>
</html>
HTML,
        ],
        [
          'name' => 'React',
          'icon' => 'react',
          'instructions' => "Add the script in your index.html or use useEffect in your App component:",
          'code' => <<<REACT
// Option 1: Add to public/index.html before </body>
{$embedTag}

// Option 2: Load dynamically in App.js or a component
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '{$scriptUrl}';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="App">
      {/* Your app content */}
    </div>
  );
}

export default App;
REACT,
        ],
        [
          'name' => 'Next.js',
          'icon' => 'nextjs',
          'instructions' => "Use the Script component from next/script:",
          'code' => <<<NEXTJS
// In your _app.js or layout.js
import Script from 'next/script';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Script
          src="{$scriptUrl}"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}

// Or in a specific page
import Script from 'next/script';

export default function Page() {
  return (
    <>
      <h1>My Page</h1>
      <Script src="{$scriptUrl}" />
    </>
  );
}
NEXTJS,
        ],
        [
          'name' => 'Vue.js',
          'icon' => 'vue',
          'instructions' => "Add to your index.html or load in App.vue:",
          'code' => <<<VUE
<!-- Option 1: Add to public/index.html before </body> -->
{$embedTag}

<!-- Option 2: Load in App.vue or a component -->
<script>
export default {
  name: 'App',
  mounted() {
    const script = document.createElement('script');
    script.src = '{$scriptUrl}';
    script.async = true;
    document.body.appendChild(script);
  },
  beforeUnmount() {
    const script = document.querySelector('script[src="{$scriptUrl}"]');
    if (script) {
      document.body.removeChild(script);
    }
  }
}
</script>
VUE,
        ],
        [
          'name' => 'Nuxt.js',
          'icon' => 'nuxt',
          'instructions' => "Add to nuxt.config.js or use useHead:",
          'code' => <<<NUXT
// In nuxt.config.js (Nuxt 2)
export default {
  head: {
    script: [
      { src: '{$scriptUrl}', async: true, body: true }
    ]
  }
}

// In nuxt.config.ts (Nuxt 3)
export default defineNuxtConfig({
  app: {
    head: {
      script: [
        { src: '{$scriptUrl}', async: true }
      ]
    }
  }
})

// Or in a component (Nuxt 3)
<script setup>
useHead({
  script: [
    { src: '{$scriptUrl}', async: true }
  ]
})
</script>
NUXT,
        ],
        [
          'name' => 'Angular',
          'icon' => 'angular',
          'instructions' => "Add to index.html or load dynamically:",
          'code' => <<<ANGULAR
<!-- Option 1: Add to src/index.html before </body> -->
{$embedTag}

<!-- Option 2: Load dynamically in a component -->
import { Component, OnInit, OnDestroy, Renderer2, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-root',
  template: '<router-outlet></router-outlet>'
})
export class AppComponent implements OnInit, OnDestroy {
  private scriptElement: HTMLScriptElement;

  constructor(
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit() {
    this.scriptElement = this.renderer.createElement('script');
    this.scriptElement.src = '{$scriptUrl}';
    this.scriptElement.async = true;
    this.renderer.appendChild(this.document.body, this.scriptElement);
  }

  ngOnDestroy() {
    this.renderer.removeChild(this.document.body, this.scriptElement);
  }
}
ANGULAR,
        ],
        [
          'name' => 'Svelte / SvelteKit',
          'icon' => 'svelte',
          'instructions' => "Use svelte:head or onMount:",
          'code' => <<<SVELTE
<!-- Option 1: Using svelte:head in +layout.svelte -->
<svelte:head>
  <script src="{$scriptUrl}" async></script>
</svelte:head>

<!-- Option 2: Dynamic loading -->
<script>
  import { onMount, onDestroy } from 'svelte';

  let script;

  onMount(() => {
    script = document.createElement('script');
    script.src = '{$scriptUrl}';
    script.async = true;
    document.body.appendChild(script);
  });

  onDestroy(() => {
    if (script) {
      document.body.removeChild(script);
    }
  });
</script>
SVELTE,
        ],
        [
          'name' => 'WordPress',
          'icon' => 'wordpress',
          'instructions' => "Add via theme functions.php or a plugin:",
          'code' => <<<WORDPRESS
// Add to your theme's functions.php
function add_lead_capture_script() {
    wp_enqueue_script(
        'dmhub-lead-capture',
        '{$scriptUrl}',
        array(),
        null,
        true // Load in footer
    );
}
add_action('wp_enqueue_scripts', 'add_lead_capture_script');

// Or add directly to footer.php before </body>
{$embedTag}

// Or use a plugin like "Insert Headers and Footers"
// and paste the script tag in the footer section
WORDPRESS,
        ],
        [
          'name' => 'Shopify',
          'icon' => 'shopify',
          'instructions' => "Add to your theme's theme.liquid file:",
          'code' => <<<SHOPIFY
<!-- In theme.liquid, add before </body> -->
{$embedTag}

<!-- Or go to:
1. Online Store > Themes
2. Actions > Edit code
3. Find theme.liquid
4. Add the script before </body>
-->
SHOPIFY,
        ],
        [
          'name' => 'Webflow',
          'icon' => 'webflow',
          'instructions' => "Add via Project Settings > Custom Code:",
          'code' => <<<WEBFLOW
<!-- Go to Project Settings > Custom Code > Footer Code -->
<!-- Paste this script: -->
{$embedTag}

<!-- This will add the script to all pages -->
<!-- For specific pages, use Page Settings > Custom Code -->
WEBFLOW,
        ],
        [
          'name' => 'Google Tag Manager',
          'icon' => 'gtm',
          'instructions' => "Add as a Custom HTML tag:",
          'code' => <<<GTM
<!-- In GTM, create a new Tag: -->
<!-- 1. Tag Type: Custom HTML -->
<!-- 2. HTML Content: -->
{$embedTag}

<!-- 3. Triggering: All Pages (or specific trigger) -->
<!-- 4. Save and Publish -->
GTM,
        ],
      ],
      'exclude_forms' => [
        'title' => 'Excluding Specific Forms',
        'description' => 'To prevent certain forms from being tracked, add one of these attributes:',
        'methods' => [
          [
            'name' => 'CSS Class',
            'code' => '<form class="no-dmhub">\n  <!-- This form will NOT be tracked -->\n</form>',
          ],
          [
            'name' => 'Data Attribute',
            'code' => '<form data-dmhub-ignore="true">\n  <!-- This form will NOT be tracked -->\n</form>',
          ],
          [
            'name' => 'Alternative Class',
            'code' => '<form class="no-track">\n  <!-- This form will NOT be tracked -->\n</form>',
          ],
        ],
      ],
      'manual_trigger' => [
        'title' => 'Manual Popup Trigger',
        'description' => 'You can manually show the lead capture popup using JavaScript:',
        'code' => <<<JS
// Show the popup form
window.DMHub.show();

// Hide the popup form
window.DMHub.hide();

// Example: Show on button click
document.getElementById('cta-button').addEventListener('click', function() {
  window.DMHub.show();
});
JS,
      ],
      'api_direct' => [
        'title' => 'Direct API Integration',
        'description' => 'For custom implementations, you can submit leads directly to our API:',
        'code' => <<<API
// POST to: /api/v1/leads/submit
// Content-Type: application/json

fetch('{$this->getApiUrl()}/api/v1/leads/submit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  body: JSON.stringify({
    script_token: '{$token}',
    email: 'user@example.com',
    first_name: 'John',
    last_name: 'Doe',
    phone: '+1234567890',
    // Add any custom fields
    custom_fields: {
      company: 'Acme Inc',
      message: 'Interested in your product'
    }
  })
})
.then(response => response.json())
.then(data => {
  if (data.success) {
    console.log('Lead captured:', data.lead_id);
    // Redirect if needed
    if (data.redirect_url) {
      window.location.href = data.redirect_url;
    }
  }
});
API,
      ],
      'testing' => [
        'title' => 'Testing Your Integration',
        'description' => 'To verify the script is working:',
        'steps' => [
          'Open your browser\'s Developer Tools (F12)',
          'Go to the Console tab',
          'Look for "[DMHub] Form interception active" message',
          'Submit a test form with an email field',
          'Check Console for "[DMHub] Lead captured: success"',
          'Verify the lead appears in your DMHub dashboard',
        ],
      ],
      'troubleshooting' => [
        'title' => 'Troubleshooting',
        'issues' => [
          [
            'problem' => 'Script not loading',
            'solutions' => [
              'Check if the script URL is correct',
              'Verify no Content Security Policy (CSP) is blocking the script',
              'Ensure the script is placed before </body>',
            ],
          ],
          [
            'problem' => 'Forms not being captured',
            'solutions' => [
              'Ensure forms have an email field (name="email" or type="email")',
              'Check if the form has "no-dmhub" or "no-track" class',
              'Verify the campaign is still active',
            ],
          ],
          [
            'problem' => 'Console errors',
            'solutions' => [
              'Check for CORS errors - contact support if this occurs',
              'Verify your network connection',
              'Check if ad blockers are interfering',
            ],
          ],
        ],
      ],
    ];
  }

  protected function generateMarkdownDocumentation(PublisherCampaigns $pc): string
  {
    $scriptUrl = $pc->getScriptUrl();
    $embedTag = $pc->getEmbedScriptTag();
    $token = $pc->script_token;
    $campaignName = $pc->campaign?->name ?? 'Campaign';
    $offerName = $pc->offer?->name ?? 'Offer';

    return <<<MARKDOWN
# Lead Capture Script Integration Guide

**Campaign:** {$campaignName}
**Offer:** {$offerName}
**Generated:** {$this->now()}

---

## Quick Start

Add this script to your website to start capturing leads:

```html
{$embedTag}
```

Place this code just before the closing `</body>` tag on any page where you want to capture leads.

---

## How It Works

1. The script automatically detects all forms on your page
2. When a form with an email field is submitted, the lead data is captured
3. The original form submission continues normally (non-blocking)
4. Leads are attributed to your publisher account

---

## Platform-Specific Instructions

### HTML / Static Website

```html
<!DOCTYPE html>
<html>
<head>
    <title>Your Website</title>
</head>
<body>
    <!-- Your website content -->

    <!-- Lead Capture Script -->
    {$embedTag}
</body>
</html>
```

### React

```jsx
// In public/index.html before </body>
{$embedTag}

// Or dynamically in App.js
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '{$scriptUrl}';
    script.async = true;
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  return <div>Your App</div>;
}
```

### Next.js

```jsx
import Script from 'next/script';

export default function Layout({ children }) {
  return (
    <>
      {children}
      <Script src="{$scriptUrl}" strategy="lazyOnload" />
    </>
  );
}
```

### Vue.js

```html
<!-- In public/index.html before </body> -->
{$embedTag}
```

Or in a component:
```vue
<script>
export default {
  mounted() {
    const script = document.createElement('script');
    script.src = '{$scriptUrl}';
    script.async = true;
    document.body.appendChild(script);
  }
}
</script>
```

### WordPress

Add to `functions.php`:
```php
function add_lead_capture_script() {
    wp_enqueue_script('dmhub', '{$scriptUrl}', [], null, true);
}
add_action('wp_enqueue_scripts', 'add_lead_capture_script');
```

### Shopify

1. Go to Online Store > Themes
2. Actions > Edit code
3. Find `theme.liquid`
4. Add before `</body>`:
```html
{$embedTag}
```

### Google Tag Manager

1. Create new Tag > Custom HTML
2. Paste: `{$embedTag}`
3. Trigger: All Pages
4. Save and Publish

---

## Excluding Forms

To prevent specific forms from being tracked:

```html
<!-- Method 1: CSS class -->
<form class="no-dmhub">...</form>

<!-- Method 2: Data attribute -->
<form data-dmhub-ignore="true">...</form>
```

---

## Manual Popup Trigger

```javascript
// Show popup
window.DMHub.show();

// Hide popup
window.DMHub.hide();
```

---

## Direct API Integration

For custom implementations:

```javascript
fetch('{$this->getApiUrl()}/api/v1/leads/submit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  body: JSON.stringify({
    script_token: '{$token}',
    email: 'user@example.com',
    first_name: 'John',
    last_name: 'Doe',
    phone: '+1234567890'
  })
})
.then(r => r.json())
.then(data => console.log(data));
```

---

## Testing

1. Open Developer Tools (F12)
2. Check Console for: `[DMHub] Form interception active`
3. Submit a test form
4. Look for: `[DMHub] Lead captured: success`

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Script not loading | Check CSP headers, verify URL |
| Forms not captured | Ensure form has email field |
| Console errors | Check for CORS/ad blockers |

---

## Support

For technical support, contact your network administrator.

**Script Token:** `{$token}`
**Script URL:** `{$scriptUrl}`
MARKDOWN;
  }

  protected function getApiUrl(): string
  {
    return url('/');
  }

  protected function now(): string
  {
    return now()->format('Y-m-d H:i:s');
  }
}
