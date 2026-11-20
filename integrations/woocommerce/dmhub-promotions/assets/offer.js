(() => {
    const dmhubOffer = window.dmhubOffer;
    if (!dmhubOffer) return;
    let busy = false;
    async function refresh() {
        if (busy) return;
        busy = true;
        try {
            const response = await fetch(dmhubOffer.url, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    referral_id:
                        new URL(location.href).searchParams.get(
                            'referral_id',
                        ) || '',
                }),
            });
            if (!response.ok) throw new Error('Offer unavailable');
            const { data } = await response.json();
            document.getElementById('dmhub-offer-notice')?.remove();
            const g = data?.grant;
            if (
                !g ||
                g.configuration.display === 'none' ||
                sessionStorage.getItem('dmhub-dismissed') === g.id
            )
                return;
            const c = g.configuration;
            if (
                !data.empty &&
                (!data.eligible || !data.applied) &&
                Number(data.saving) <= 0
            )
                return; // Do not promise a discount when the cart fails its rules.
            const money = (value) =>
                new Intl.NumberFormat(document.documentElement.lang || 'en', {
                    style: 'currency',
                    currency: data.currency,
                }).format(value);
            const benefit =
                c.type === 'percentage' ? `${c.value}%` : money(c.value);
            const notice = document.createElement('aside');
            notice.id = 'dmhub-offer-notice';
            notice.className = `dmhub-notice dmhub-${c.display}`;
            notice.setAttribute('role', 'status');
            notice.style.backgroundColor = c.background_color || '#ffffff';
            notice.style.color = c.text_color || '#17202a';
            const nl = document.documentElement.lang?.startsWith('nl');
            const message = document.createElement('span');
            message.textContent = (
                Number(data.saving) > 0
                    ? (nl && c.applied_message_nl) || c.applied_message
                    : (nl && c.message_nl) || c.message
            )
                .replaceAll('{benefit}', benefit)
                .replaceAll('{offer_name}', c.name)
                .replaceAll('{saving}', money(data.saving));
            const close = document.createElement('button');
            close.type = 'button';
            close.textContent = '×';
            close.setAttribute('aria-label', dmhubOffer.dismiss);
            close.onclick = () => {
                sessionStorage.setItem('dmhub-dismissed', g.id);
                notice.remove();
            };
            notice.append(message, close);
            document.body.append(notice);
        } catch {
            document.getElementById('dmhub-offer-notice')?.remove();
        } finally {
            busy = false;
        }
    }
    if (window.jQuery)
        window
            .jQuery(document.body)
            .on(
                'added_to_cart removed_from_cart updated_cart_totals updated_checkout',
                refresh,
            );
    document.addEventListener('wc-blocks_added_to_cart', refresh);
    document.addEventListener('wc-blocks_removed_from_cart', refresh);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) refresh();
    });
    setInterval(() => {
        if (!document.hidden) refresh();
    }, 15000);
    refresh();
})();
