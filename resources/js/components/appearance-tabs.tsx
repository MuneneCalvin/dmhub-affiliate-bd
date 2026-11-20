import { RadioCard, RadioCardGroup } from '@/components/ui/radio-card';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useLanguage } from '@/context/language-context';
import { type Appearance, useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

/**
 * Miniature app frame: navy sidebar, a title bar and a card. It uses the raw
 * light/dark palette on purpose: it previews the other theme, so it must not
 * follow the current one.
 */
function ThemePreview({ mode }: { mode: Appearance }) {
    if (mode === 'system') {
        return (
            <span className="flex h-[86px] overflow-hidden rounded-[10px] border border-border">
                <span className="flex-1 bg-[#F6F5FF]" />
                <span className="flex-1 bg-[#0F0C24]" />
            </span>
        );
    }
    const dark = mode === 'dark';
    return (
        <span
            className={cn(
                'flex h-[86px] overflow-hidden rounded-[10px] border',
                dark
                    ? 'border-[#2F2963] bg-[#0F0C24]'
                    : 'border-[#E8E5F7] bg-[#F6F5FF]',
            )}
        >
            <span className="w-[26%] bg-[#17133B]" />
            <span className="flex flex-1 flex-col gap-1.5 p-2.5">
                <span
                    className={cn(
                        'h-2 w-3/5 rounded',
                        dark ? 'bg-[#A594FF]' : 'bg-[#5B3DF5]',
                    )}
                />
                <span
                    className={cn(
                        'h-[22px] rounded-md',
                        dark ? 'bg-[#1B1740]' : 'bg-white',
                    )}
                />
            </span>
        </span>
    );
}

const THEMES: { value: Appearance; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
];

/** Light / dark / system as preview cards (radio group named "Theme"). */
export function ThemePicker({ className }: { className?: string }) {
    const { t } = useTranslation();
    const { appearance, updateAppearance } = useAppearance();
    return (
        <RadioCardGroup
            name="appearance"
            label={t('Theme')}
            value={appearance}
            onValueChange={(value) => updateAppearance(value as Appearance)}
            className={cn('grid-cols-1 sm:grid-cols-3', className)}
        >
            {THEMES.map((theme) => (
                <RadioCard
                    key={theme.value}
                    value={theme.value}
                    title={t(theme.label)}
                    media={<ThemePreview mode={theme.value} />}
                />
            ))}
        </RadioCardGroup>
    );
}

const FALLBACK_LOCALES = [
    { code: 'en', native: 'English' },
    { code: 'nl', native: 'Nederlands' },
];

/** Interface language as a segmented control; each name in its own language. */
export function LanguagePicker() {
    const { t } = useTranslation();
    const { currentLocale, setLanguage, availableLocales } = useLanguage();
    const locales = availableLocales.some((locale) => locale.code.length === 2)
        ? availableLocales
        : FALLBACK_LOCALES;
    return (
        <SegmentedControl
            label={t('Language')}
            value={currentLocale}
            onValueChange={setLanguage}
            options={locales.map((locale) => ({
                value: locale.code,
                label: <span lang={locale.code}>{locale.native}</span>,
            }))}
        />
    );
}

export default ThemePicker;
