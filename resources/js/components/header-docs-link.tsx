import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function HeaderDocsLink() {
    const { t } = useTranslation();
    return (
        <Button variant="ghost" size="icon" asChild>
            <a
                href="/docs"
                aria-label={t('Documentation')}
                title={t('Documentation')}
            >
                <BookOpen className="size-5" />
            </a>
        </Button>
    );
}
