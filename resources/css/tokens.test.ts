import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const read = (path: string) =>
    readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

const css = read('./app.css');
const tokensDoc = read('../../docs/redesign/tokens.md');

/** Body of the first top-level rule whose selector is exactly `selector`. */
function block(selector: string): string {
    const match = new RegExp(`^${selector.replace('.', '\\.')} \\{$`, 'm').exec(
        css,
    );
    if (!match) throw new Error(`No ${selector} block in app.css`);
    const start = match.index + match[0].length;
    return css.slice(start, css.indexOf('\n}', start));
}

/** Rows of the markdown table that follows `heading` in tokens.md. */
function tableRows(heading: string): string[][] {
    const section = tokensDoc.split(`## ${heading}`)[1].split('\n## ')[0];
    return section
        .split('\n')
        .filter((line) => line.startsWith('|'))
        .slice(2)
        .map((line) =>
            line
                .split('|')
                .slice(1, -1)
                .map((cell) => cell.trim()),
        );
}

const neutralTokens = tableRows('Neutrals').map(
    ([cell]) => /`(--[\w-]+)`/.exec(cell)![1],
);
const domainTokens = tableRows('Domain colours').flatMap(([domain]) => {
    const name = domain.split(' ')[0];
    return ['base', 'soft', 'ink', 'nav'].map((part) => `--${name}-${part}`);
});
const statusTokens = tableRows('Status tones')
    .map(([tone]) => tone)
    .filter((tone) => tone !== 'brand')
    .flatMap((tone) =>
        ['soft', 'ink', 'dot'].map((part) => `--${tone}-${part}`),
    );
const shadcnTokens = [
    '--background',
    '--foreground',
    '--card',
    '--popover',
    '--primary',
    '--primary-foreground',
    '--secondary',
    '--muted',
    '--muted-foreground',
    '--accent',
    '--accent-foreground',
    '--destructive',
    '--input',
    '--ring',
    '--chart-1',
    '--chart-5',
    '--sidebar-foreground',
    '--sidebar-accent',
];

const allTokens = [
    ...neutralTokens,
    ...domainTokens,
    ...statusTokens,
    ...shadcnTokens,
    '--focus-halo',
    '--elevation-card',
    '--elevation-primary',
    '--elevation-overlay',
];

describe('design tokens', () => {
    it('reads the full token list from tokens.md', () => {
        expect(neutralTokens).toContain('--canvas');
        expect(neutralTokens).toContain('--sidebar-label');
        expect(domainTokens).toHaveLength(20);
        expect(statusTokens).toHaveLength(15);
    });

    it.each([':root', '.dark'])('%s defines every token', (selector) => {
        const body = block(selector);
        const missing = allTokens.filter(
            (token) => !new RegExp(`^\\s*${token}:`, 'm').test(body),
        );
        expect(missing).toEqual([]);
    });

    it('uses the light canvas and brand values from tokens.md', () => {
        const root = block(':root');
        expect(root).toMatch(/--canvas: #f6f5ff;/);
        expect(root).toMatch(/--brand-base: #5b3df5;/);
    });

    it('exposes domain and status utilities in the Tailwind theme', () => {
        const theme = block('@theme');
        for (const name of [
            '--color-finance-soft',
            '--color-finance-ink',
            '--color-surface-muted',
            '--color-success-dot',
            '--shadow-card',
            '--radius-card',
        ]) {
            expect(theme).toContain(`${name}:`);
        }
    });
});
