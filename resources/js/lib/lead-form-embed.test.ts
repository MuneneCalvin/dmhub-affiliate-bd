import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import source from '../../lead-form/embed.js?raw';

const ENDPOINT = 'https://bnd.test/lf/key123';

function load() {
    const code = source.replace(
        '__CONFIG__',
        JSON.stringify({ key: 'key123', endpoint: ENDPOINT }),
    );
    (0, eval)(code);
}

const REFERRAL = '0b1f3a52-2f6f-4bd2-9d6f-3a5f5e7a9d11';

function page(html: string, search = `?referral_id=${REFERRAL}&click_id=42`) {
    window.history.pushState({}, '', `/form${search}`);
    document.body.innerHTML = html;
}

function submit(form: HTMLFormElement) {
    const event = new Event('submit', { cancelable: true, bubbles: true });
    form.dispatchEvent(event);
    return event;
}

const sent = () => {
    const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
    return calls.map(([url, init]) => ({
        url,
        init,
        body: JSON.parse(init.body),
    }));
};

const FORM = `
<form id="f">
  <input name="first_name" value="Anna"><input name="last_name" value="de Vries">
  <input type="email" name="mail" value="anna@example.nl"><input type="tel" name="telefoon" value="+31201234567">
  <input name="bedrijf" value="Voorbeeld BV"><input name="favoriete_kleur" value="blauw">
  <input type="password" name="wachtwoord" value="geheim"><input type="hidden" name="_token" value="csrf">
  <input type="checkbox" name="akkoord_privacy" checked>
  <button type="submit">Verstuur</button>
</form>`;

beforeEach(() => {
    sessionStorage.clear();
    delete (window as unknown as Record<string, unknown>).BNDLeadForm;
    vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.resolve({ ok: true })),
    );
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('lead form embed script', () => {
    it('injects one hidden honeypot field into the form', () => {
        page(FORM);
        load();

        const honeypot = document.querySelector<HTMLInputElement>(
            '#f input[name="hp"]',
        );
        expect(honeypot).not.toBeNull();
        expect(honeypot?.tabIndex).toBe(-1);
        expect(honeypot?.getAttribute('aria-hidden')).toBe('true');
    });

    it('reports the mapped contact, consent and click reference without blocking the form', () => {
        page(FORM);
        load();

        const event = submit(document.querySelector('#f') as HTMLFormElement);

        expect(event.defaultPrevented).toBe(false);
        expect(sent()).toHaveLength(1);
        const { url, init, body } = sent()[0];
        expect(url).toBe(ENDPOINT);
        expect(init.method).toBe('POST');
        expect(init.keepalive).toBe(true);
        expect(init.headers['Content-Type']).toBe('text/plain');
        expect(init.credentials).toBe('omit');
        expect(body).toMatchObject({
            referral_id: REFERRAL,
            email: 'anna@example.nl',
            first_name: 'Anna',
            last_name: 'de Vries',
            phone: '+31201234567',
            company: 'Voorbeeld BV',
            consent: true,
            hp: '',
        });
        expect(body.duration_ms).toBeGreaterThanOrEqual(0);
        expect(body.custom_fields).toEqual({ favoriete_kleur: 'blauw' });
    });

    it('never reads password or hidden fields', () => {
        page(FORM);
        load();

        submit(document.querySelector('#f') as HTMLFormElement);

        const text = JSON.stringify(sent()[0].body);
        expect(text).not.toContain('geheim');
        expect(text).not.toContain('csrf');
    });

    it('reports consent false when the checkbox is unchecked or missing', () => {
        page(FORM);
        load();
        (
            document.querySelector(
                '[name="akkoord_privacy"]',
            ) as HTMLInputElement
        ).checked = false;
        submit(document.querySelector('#f') as HTMLFormElement);
        expect(sent()[0].body.consent).toBe(false);

        vi.mocked(fetch).mockClear();
        delete (window as unknown as Record<string, unknown>).BNDLeadForm;
        page(
            '<form id="f"><input type="email" name="email" value="a@b.nl"></form>',
        );
        load();
        submit(document.querySelector('#f') as HTMLFormElement);
        expect(sent()[0].body.consent).toBe(false);
    });

    it('honours the data-bnd-consent marker whatever the checkbox is called', () => {
        page(
            '<form id="f"><input type="email" name="email" value="a@b.nl"><input type="checkbox" name="ok" data-bnd-consent checked></form>',
        );
        load();

        submit(document.querySelector('#f') as HTMLFormElement);

        expect(sent()[0].body.consent).toBe(true);
    });

    it('keeps the click reference for later pages of a multi-step form', () => {
        page(FORM);
        load();
        delete (window as unknown as Record<string, unknown>).BNDLeadForm;

        page(FORM, '');
        load();
        submit(document.querySelector('#f') as HTMLFormElement);

        expect(sent()[0].body.referral_id).toBe(REFERRAL);
    });

    it('sends nothing for a link that only carries a click id', () => {
        page(FORM, '?click_id=42');
        load();

        submit(document.querySelector('#f') as HTMLFormElement);

        expect(sent()).toHaveLength(0);
    });

    it('sends nothing when the visitor did not arrive through a tracked link', () => {
        page(FORM, '');
        load();

        submit(document.querySelector('#f') as HTMLFormElement);

        expect(sent()).toHaveLength(0);
    });

    it('sends nothing without an email', () => {
        page('<form id="f"><input name="first_name" value="Anna"></form>');
        load();

        submit(document.querySelector('#f') as HTMLFormElement);

        expect(sent()).toHaveLength(0);
    });

    it('does nothing on a page with several forms unless one is marked', () => {
        page(
            `${FORM}<form id="g"><input type="email" name="email" value="x@y.nl"></form>`,
        );
        load();

        submit(document.querySelector('#f') as HTMLFormElement);
        expect(sent()).toHaveLength(0);

        document.querySelector('#g')?.setAttribute('data-bnd-form', '');
        delete (window as unknown as Record<string, unknown>).BNDLeadForm;
        load();
        submit(document.querySelector('#g') as HTMLFormElement);
        expect(sent()).toHaveLength(1);
    });

    it('sends once per submit even if the script was included twice', () => {
        page(FORM);
        load();
        load();

        submit(document.querySelector('#f') as HTMLFormElement);

        expect(sent()).toHaveLength(1);
    });

    it('swallows network failures', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(() => Promise.reject(new Error('offline'))),
        );
        page(FORM);
        load();

        expect(() =>
            submit(document.querySelector('#f') as HTMLFormElement),
        ).not.toThrow();
        await Promise.resolve();
    });

    it('reports the honeypot when something filled it', () => {
        page(FORM);
        load();
        (document.querySelector('input[name="hp"]') as HTMLInputElement).value =
            'http://spam.example';

        submit(document.querySelector('#f') as HTMLFormElement);

        expect(sent()[0].body.hp).toBe('http://spam.example');
    });
});
