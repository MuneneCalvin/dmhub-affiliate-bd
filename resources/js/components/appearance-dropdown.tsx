import { Button } from '@/components/ui/button';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';
import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const isDarkNow = () =>
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('dark');

/**
 * Top bar theme switch: flips between light and dark. "System" stays
 * available on the Appearance settings page.
 */
export default function ThemeToggle({ className }: { className?: string }) {
    const { appearance, updateAppearance } = useAppearance();
    const { t } = useTranslation();
    // appearance is part of the render so the label updates after a switch.
    const dark =
        appearance === 'dark' || (appearance === 'system' && isDarkNow());
    const label = dark ? t('Switch to light mode') : t('Switch to dark mode');

    return (
        <Button
            variant="secondary"
            size="icon"
            className={cn('text-brand', className)}
            aria-label={label}
            title={label}
            onClick={() => updateAppearance(dark ? 'light' : 'dark')}
        >
            {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </Button>
    );
}

export { ThemeToggle };
