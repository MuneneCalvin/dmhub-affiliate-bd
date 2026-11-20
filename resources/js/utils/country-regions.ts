// Geographic regions and ISO alpha-3 memberships from UN M49, retrieved 2026-11-03.
// https://unstats.un.org/unsd/methodology/m49/
// Keep countries in the campaign payload; regions are selection shortcuts only.
import regionData from '../data/country-regions.json' with { type: 'json' };

type CountryRegion = {
    id: string;
    name: string;
    countries: string[];
    children: CountryRegion[];
};

export type RegionChoice = {
    id: string;
    name: string;
    countries: string[];
    depth: number;
    parentId?: string;
};

export function getCountryRegions(
    availableCodes: readonly string[],
): RegionChoice[] {
    const available = new Set(availableCodes);
    const choices: RegionChoice[] = [];
    function visit(
        region: CountryRegion,
        depth = 0,
        parentId?: string,
    ): string[] {
        const choice: RegionChoice = {
            id: region.id,
            name: region.name,
            countries: [],
            depth,
            parentId,
        };
        choices.push(choice);
        const codes = [
            ...region.countries,
            ...region.children.flatMap((child) =>
                visit(child, depth + 1, region.id),
            ),
        ];
        choice.countries = [...new Set(codes)].filter((code) =>
            available.has(code),
        );
        return choice.countries;
    }
    regionData.forEach((region) => visit(region));
    return choices.filter((region) => region.countries.length > 0);
}

export function toggleRegionCountries(
    selected: readonly string[],
    countries: readonly string[],
    checked: boolean,
): string[] {
    if (checked) return [...new Set([...selected, ...countries])];
    const removed = new Set(countries);
    return selected.filter((code) => !removed.has(code));
}
