(() => {
    const root = document.getElementById('dmhub-offer-config');
    if (!root || !window.Shopify) return;
    const storageKey = 'dmhub-promotion';
    const cartRoot = window.Shopify.routes.root;
    let current = null;
    let busy = false;
    const read = () => {
        try {
            return JSON.parse(localStorage.getItem(storageKey) || 'null');
        } catch {
            return null;
        }
    };
    const save = (value) => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(value));
        } catch {
            /* Continue for this visit. */
        }
    };
    const format = (value, currency) =>
        new Intl.NumberFormat(document.documentElement.lang || 'en', {
            style: 'currency',
            currency,
        }).format(value);
    function render(grant, cart) {
        document.getElementById('dmhub-offer-notice')?.remove();
        const c = grant.configuration;
        if (
            c.display === 'none' ||
            sessionStorage.getItem('dmhub-dismissed') === grant.id ||
            Date.parse(grant.expires_at) <= Date.now()
        )
            return;
        const applicable = (cart.discount_codes || []).some(
            (d) =>
                d.code.toLowerCase() === grant.code.toLowerCase() &&
                d.applicable,
        );
        if (cart.item_count > 0 && !applicable) return;
        const applications = [
            ...(cart.cart_level_discount_applications || []),
            ...(cart.items || []).flatMap((i) =>
                (i.line_level_discount_allocations || []).map((a) => ({
                    ...a.discount_application,
                    total_allocated_amount: a.amount,
                })),
            ),
        ];
        // Native titles can be the merchant's configured title or the applied code. Never claim another discount's saving.
        const saving = applications
            .filter(
                (a) =>
                    a.title?.toLowerCase() === grant.code.toLowerCase() ||
                    (applicable && a.title === c.name),
            )
            .reduce((sum, a) => sum + Number(a.total_allocated_amount || 0), 0);
        const benefit =
            c.type === 'percentage'
                ? `${c.value}%`
                : format(Number(c.value), c.currency);
        const box = document.createElement('aside');
        box.id = 'dmhub-offer-notice';
        box.className = `dmhub-notice dmhub-${c.display}`;
        box.setAttribute('role', 'status');
        box.style.backgroundColor = c.background_color || '#ffffff';
        box.style.color = c.text_color || '#17202a';
        const nl = document.documentElement.lang?.startsWith('nl');
        const message = document.createElement('span');
        message.textContent = (
            saving > 0
                ? (nl && c.applied_message_nl) || c.applied_message
                : (nl && c.message_nl) || c.message
        )
            .replaceAll('{benefit}', benefit)
            .replaceAll('{offer_name}', c.name)
            .replaceAll(
                '{saving}',
                format(saving / 100, cart.currency || c.currency),
            );
        const close = document.createElement('button');
        close.type = 'button';
        close.textContent = '×';
        close.setAttribute(
            'aria-label',
            document.documentElement.lang?.startsWith('nl')
                ? 'Sluiten'
                : 'Dismiss',
        );
        close.addEventListener('click', () => {
            sessionStorage.setItem('dmhub-dismissed', grant.id);
            box.remove();
        });
        box.append(message, close);
        document.body.append(box);
    }
    async function cart() {
        const r = await fetch(`${cartRoot}cart.js`);
        if (!r.ok) throw new Error('Cart unavailable');
        return r.json();
    }
    async function refresh() {
        if (!current || busy) return;
        try {
            if (Date.parse(current.expires_at) <= Date.now()) {
                document.getElementById('dmhub-offer-notice')?.remove();
                current = null;
                save(null);
                return;
            }
            render(current, await cart());
        } catch {
            document.getElementById('dmhub-offer-notice')?.remove();
        }
    }
    async function start() {
        busy = true;
        try {
            const previous = read();
            const referral =
                new URL(location.href).searchParams.get('referral_id') ||
                previous?.referral_id;
            if (!referral) return;
            const session = previous?.session || crypto.randomUUID();
            const proxy = new URL(root.dataset.proxy, location.origin);
            if (proxy.origin !== location.origin) return;
            proxy.searchParams.set('referral_id', referral);
            proxy.searchParams.set('session', session);
            const response = await fetch(proxy.pathname + proxy.search, {
                credentials: 'same-origin',
            });
            if (!response.ok) {
                save(null);
                return;
            }
            let grant = await response.json();
            if (
                previous &&
                previous.referral_id !== grant.referral_id &&
                Date.parse(previous.clicked_at) >
                    Date.parse(grant.clicked_at) &&
                Date.parse(previous.expires_at) > Date.now()
            )
                grant = previous;
            const oldCart = await cart();
            const existing = (oldCart.discount_codes || [])
                .map((d) => d.code)
                .filter((code) => code !== previous?.code);
            const discounts = grant.configuration.combines_with_other_discounts
                ? [...existing, grant.code]
                : [grant.code];
            const applied = await fetch(`${cartRoot}cart/update.js`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    discount: discounts.join(','),
                    attributes: {
                        dmhub_referral_id: grant.referral_id,
                        dmhub_promotion_grant: grant.id,
                    },
                }),
            });
            if (!applied.ok) throw new Error('Discount application failed');
            current = grant;
            save({ ...grant, session });
            render(grant, await applied.json());
        } catch {
            document.getElementById('dmhub-offer-notice')?.remove();
        } finally {
            busy = false;
        }
    }
    document.addEventListener('cart:updated', refresh);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) refresh();
    });
    // Themes expose different cart events; polling updates the notice without modifying theme code.
    setInterval(() => {
        if (!document.hidden) refresh();
    }, 15000);
    start();
})();
