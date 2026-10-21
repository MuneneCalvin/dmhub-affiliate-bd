import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/context/language-context';
import { cn } from '@/lib/utils';
import { Globe } from 'lucide-react';

interface LanguageSwitcherProps {
    className?: string;
    showLabel?: boolean;
}

export function LanguageSwitcher({ className, showLabel = true }: LanguageSwitcherProps) {
    const { currentLocale, setLanguage, availableLocales } = useLanguage();

    const currentLanguage = availableLocales.find(
        (locale) => locale.code === currentLocale
    );

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className={cn('gap-2', className)}>
                    <Globe className="h-4 w-4" />
                    {showLabel && (
                        <span className="hidden sm:inline">
                            {currentLanguage?.native || currentLocale.toUpperCase()}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {availableLocales.map((locale) => (
                    <DropdownMenuItem
                        key={locale.code}
                        onClick={() => setLanguage(locale.code)}
                        className={cn(
                            'cursor-pointer',
                            locale.code === currentLocale && 'bg-accent'
                        )}
                    >
                        <span className="font-medium">{locale.native}</span>
                        {locale.name !== locale.native && (
                            <span className="ml-2 text-muted-foreground text-sm">
                                ({locale.name})
                            </span>
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
