/* global __CONFIG__ -- replaced with this offer's key and endpoint when the script is served */
(function () {
    'use strict';

    var CONFIG = __CONFIG__;
    var registry = (window.BNDLeadForm = window.BNDLeadForm || {});
    if (registry[CONFIG.key]) return;
    registry[CONFIG.key] = true;

    var CONTACT = {
        email: ['email', 'mail', 'emailadres'],
        first_name: ['firstname', 'givenname', 'voornaam'],
        last_name: ['lastname', 'familyname', 'surname', 'achternaam'],
        phone: [
            'phone',
            'tel',
            'telefoon',
            'telefoonnummer',
            'mobile',
            'mobiel',
        ],
        company: ['company', 'organization', 'bedrijf', 'bedrijfsnaam'],
        job_title: ['jobtitle', 'functie'],
        city: ['city', 'woonplaats', 'plaats'],
        country: ['country', 'land'],
    };
    var AUTOCOMPLETE = {
        email: 'email',
        'given-name': 'first_name',
        'family-name': 'last_name',
        tel: 'phone',
        organization: 'company',
        'organization-title': 'job_title',
        'address-level2': 'city',
        'country-name': 'country',
    };
    var SKIP_TYPES = /^(password|hidden|submit|button|reset|image|file)$/;
    var SECRET_NAME = /pass|pwd|card|cvv|cvc|iban|bsn|ssn|token/i;
    var CONSENT_NAME = /consent|privacy|akkoord|gdpr/i;
    var MAX_CUSTOM = 20;

    function reference() {
        var params = new URLSearchParams(window.location.search);
        var fresh = { referral_id: params.get('referral_id') };
        var key = 'bnd:ref:' + CONFIG.key;
        if (fresh.referral_id) {
            try {
                window.sessionStorage.setItem(key, JSON.stringify(fresh));
            } catch {
                /* Still works on this page. */
            }
            return fresh;
        }
        try {
            return JSON.parse(window.sessionStorage.getItem(key)) || {};
        } catch {
            return {};
        }
    }

    function pickForm() {
        var marked = document.querySelectorAll('form[data-bnd-form]');
        if (marked.length === 1) return marked[0];
        if (marked.length === 0 && document.forms.length === 1)
            return document.forms[0];
        return null;
    }

    function contactField(el) {
        var auto =
            AUTOCOMPLETE[(el.getAttribute('autocomplete') || '').toLowerCase()];
        if (auto) return auto;
        if (el.type === 'email') return 'email';
        if (el.type === 'tel') return 'phone';
        var name = (el.name || '').toLowerCase().replace(/[^a-z]/g, '');
        for (var field in CONTACT) {
            if (CONTACT[field].indexOf(name) !== -1) return field;
        }
        return null;
    }

    function collect(form, started) {
        var ref = reference();
        var payload = { consent: false, hp: '', custom_fields: {} };
        var custom = 0;
        // Only the referral identifies the visit; without it there is nobody to credit.
        if (!ref.referral_id) return null;
        payload.referral_id = ref.referral_id;

        Array.prototype.forEach.call(form.elements, function (el) {
            if (!el.name || el.disabled) return;
            if (el.name === 'hp') {
                payload.hp = String(el.value || '').slice(0, 255);
                return;
            }
            if (
                el.type === 'checkbox' &&
                (el.hasAttribute('data-bnd-consent') ||
                    CONSENT_NAME.test(el.name))
            ) {
                payload.consent = payload.consent || el.checked;
                return;
            }
            if (SKIP_TYPES.test(el.type) || SECRET_NAME.test(el.name)) return;
            if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked)
                return;
            var value = String(el.value || '').trim();
            if (value === '') return;
            var field = contactField(el);
            if (field) {
                if (!payload[field]) payload[field] = value;
            } else if (custom < MAX_CUSTOM) {
                payload.custom_fields[el.name] = value.slice(0, 1000);
                custom += 1;
            }
        });

        if (!payload.email) return null;
        payload.duration_ms = Math.max(0, Date.now() - started);
        if (Object.keys(payload.custom_fields).length === 0)
            delete payload.custom_fields;
        return payload;
    }

    function init() {
        var form = pickForm();
        if (!form) return;
        var started = Date.now();
        reference();
        var honeypot = document.createElement('input');
        honeypot.type = 'text';
        honeypot.name = 'hp';
        honeypot.tabIndex = -1;
        honeypot.autocomplete = 'off';
        honeypot.setAttribute('aria-hidden', 'true');
        honeypot.style.cssText =
            'position:absolute;left:-9999px;width:1px;height:1px;opacity:0';
        form.appendChild(honeypot);

        // Reports only; the form itself is never delayed, changed or cancelled.
        form.addEventListener('submit', function () {
            try {
                var payload = collect(form, started);
                if (!payload) return;
                var request = window.fetch(CONFIG.endpoint, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                    keepalive: true,
                    credentials: 'omit',
                    headers: { 'Content-Type': 'text/plain' },
                });
                if (request && request.catch)
                    request.catch(function () {
                        /* The visitor's submit must never fail because of us. */
                    });
            } catch {
                /* Same: reporting is best effort. */
            }
        });
    }

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', init);
    else init();
})();
