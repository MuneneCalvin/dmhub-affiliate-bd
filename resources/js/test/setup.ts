import i18n from '@/i18n';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, vi } from 'vitest';
import { resetPage } from './inertia';

vi.mock('@inertiajs/react', () => import('./inertia'));

beforeAll(async () => {
    // Tests read English copy; components still go through t().
    await i18n.changeLanguage('en');
});

afterEach(() => {
    cleanup();
    resetPage();
});

// jsdom gaps that Radix UI and charts rely on.
if (!window.matchMedia) {
    window.matchMedia = (query: string) =>
        ({
            matches: false,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
        }) as MediaQueryList;
}
if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as unknown as typeof ResizeObserver;
}
if (!Element.prototype.scrollIntoView)
    Element.prototype.scrollIntoView = () => {};
if (!Element.prototype.hasPointerCapture)
    Element.prototype.hasPointerCapture = () => false;
if (!Element.prototype.releasePointerCapture)
    Element.prototype.releasePointerCapture = () => {};
// input-otp probes for password-manager badges with elementFromPoint.
if (!document.elementFromPoint) {
    document.elementFromPoint = () => null;
}
