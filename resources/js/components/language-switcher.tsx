import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/context/language-context';
import { cn } from '@/lib/utils';
import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const fallbackLocales = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'nl', name: 'Dutch', native: 'Nederlands' },
];

/** Top bar language menu: globe + current locale code. Names are shown in their own language. */
export function LanguageSwitcher({ className }: { className?: string }) {
    const { currentLocale, setLanguage, availableLocales } = useLanguage();
    const { t } = useTranslation();
    const locales = availableLocales.some((locale) => locale.code.length === 2)
        ? availableLocales
        : fallbackLocales;
    const current =
        locales.find((locale) => locale.code === currentLocale) ?? locales[0];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="secondary"
                    className={cn('gap-1.5 px-3 font-bold', className)}
                >
                    <span className="sr-only">
                        {t('Change language ({{language}})', {
                            language: current.native,
                        })}
                    </span>
                    <Globe className="text-analytics" aria-hidden="true" />
                    <span>{current.code.toUpperCase()}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuRadioGroup
                    value={current.code}
                    onValueChange={setLanguage}
                >
                    {locales.map((locale) => (
                        <DropdownMenuRadioItem
                            key={locale.code}
                            value={locale.code}
                        >
                            <span lang={locale.code}>{locale.native}</span>
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
