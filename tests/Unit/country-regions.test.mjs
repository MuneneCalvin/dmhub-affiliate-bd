// Run with: node --test tests/Unit/country-regions.test.mjs (Node 22.18+).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
    getCountryRegions,
    toggleRegionCountries,
} from '../../resources/js/utils/country-regions.ts';

const seeder = readFileSync(
    new URL('../../database/seeders/CountrySeeder.php', import.meta.url),
    'utf8',
);
const codes = [...seeder.matchAll(/'country_iso' => '([A-Z]{3})'/g)].map(
    (match) => match[1],
);
const regions = getCountryRegions(codes);
const europe = regions.find((region) => region.name === 'Europe');
const westernEurope = regions.find(
    (region) => region.name === 'Western Europe',
);

test('every seeded country belongs to exactly one continent', () => {
    const continents = regions.filter((region) => region.depth === 0);
    assert.equal(continents.length, 5);
    for (const code of codes) {
        assert.equal(
            continents.filter((region) => region.countries.includes(code))
                .length,
            1,
            code,
        );
    }
});

test('region choices contain only available countries and omit empty regions', () => {
    const choices = getCountryRegions(['NLD', 'KEN']);
    assert.deepEqual(
        choices.find((region) => region.name === 'Europe').countries,
        ['NLD'],
    );
    assert.deepEqual(
        choices.find((region) => region.name === 'Eastern Africa').countries,
        ['KEN'],
    );
    assert.equal(
        choices.some((region) => region.name === 'Americas'),
        false,
    );
    assert.deepEqual(getCountryRegions([]), []);
});

test('selecting a region expands its complete country membership', () => {
    const selected = toggleRegionCountries([], europe.countries, true);
    assert.deepEqual(new Set(selected), new Set(europe.countries));
    assert.ok(selected.includes('NLD'));
    assert.ok(!selected.includes('KEN'));
});

test('overlapping continent and subregion selections do not duplicate countries', () => {
    const selected = toggleRegionCountries(
        ['KEN', ...westernEurope.countries],
        europe.countries,
        true,
    );
    assert.equal(selected.length, europe.countries.length + 1);
    assert.equal(new Set(selected).size, selected.length);
    assert.ok(selected.includes('KEN'));
});

test('removing a subregion preserves other regions and individual country choices', () => {
    const selected = toggleRegionCountries(
        ['KEN', ...europe.countries],
        westernEurope.countries,
        false,
    );
    assert.ok(selected.includes('KEN'));
    assert.ok(selected.includes('GBR'));
    assert.ok(!selected.includes('NLD'));
    assert.equal(
        selected.length,
        europe.countries.length - westernEurope.countries.length + 1,
    );
});

test('individual country changes can make a full region partial and restore it', () => {
    const partial = toggleRegionCountries(europe.countries, ['NLD'], false);
    assert.equal(
        europe.countries.every((code) => partial.includes(code)),
        false,
    );
    const restored = toggleRegionCountries(partial, ['NLD'], true);
    assert.equal(
        europe.countries.every((code) => restored.includes(code)),
        true,
    );
});
