import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Pencil } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

export function EditableOverview({
    title,
    description,
    summary,
    children,
}: {
    title: string;
    description: string;
    summary: ReactNode;
    children: ReactNode;
}) {
    const { t } = useTranslation();
    const [editing, setEditing] = useState(false);
    return (
        <section className="overview-section">
            <div className="mb-6 flex items-start justify-between gap-5">
                <div>
                    <h2 className="text-base font-semibold">{title}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {description}
                    </p>
                </div>
                <Button
                    variant="outline"
                    className="shrink-0"
                    onClick={() => setEditing(true)}
                >
                    <Pencil className="size-4" />
                    {t('Edit')}
                </Button>
            </div>
            {summary}
            <Dialog open={editing} onOpenChange={setEditing}>
                <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {t('Edit')} · {title}
                        </DialogTitle>
                        <DialogDescription>{description}</DialogDescription>
                    </DialogHeader>
                    {children}
                </DialogContent>
            </Dialog>
        </section>
    );
}
