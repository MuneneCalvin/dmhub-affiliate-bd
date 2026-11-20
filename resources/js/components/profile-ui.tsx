import { DetailList, SectionCard } from '@/components/app';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { initialsFrom, type Tone } from '@/lib/tones';
import { Pencil } from 'lucide-react';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import '../../css/profile.css';

export function ProfileEditButton({
    section,
    onClick,
}: {
    section: string;
    onClick: () => void;
}) {
    const { t } = useTranslation();
    return (
        <Button
            type="button"
            variant="secondary"
            size="sm"
            aria-label={t('Edit {{section}}', { section: t(section) })}
            onClick={onClick}
        >
            <Pencil aria-hidden="true" />
            {t('Edit')}
        </Button>
    );
}

export function ProfileCard({
    title,
    onEdit,
    icon,
    tone = 'brand',
    children,
}: {
    title: string;
    onEdit?: () => void;
    icon?: ReactNode;
    tone?: Tone;
    children: ReactNode;
}) {
    return (
        <SectionCard
            title={title}
            icon={icon}
            tone={tone}
            action={
                onEdit && <ProfileEditButton section={title} onClick={onEdit} />
            }
        >
            {children}
        </SectionCard>
    );
}

export function ProfileDetails({ rows }: { rows: [string, ReactNode][] }) {
    return (
        <DetailList
            labelWidth={180}
            rows={rows.map(([label, value]) => ({ label, value }))}
        />
    );
}

export function ProfileIdentity({
    name,
    role,
    location,
    avatar,
    onEdit,
}: {
    name: string;
    role: string;
    location?: string | null;
    avatar?: string;
    onEdit?: () => void;
}) {
    const { t } = useTranslation();
    return (
        <section
            className="flex flex-wrap items-center gap-4 rounded-card border border-border bg-surface p-[22px] shadow-card"
            aria-label={t('Profile information')}
        >
            <Avatar className="size-16 rounded-[20px] text-xl">
                {avatar && <AvatarImage src={avatar} alt={name} />}
                <AvatarFallback className="rounded-[20px] font-extrabold">
                    {initialsFrom(name)}
                </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <h2 className="text-lg font-extrabold [overflow-wrap:anywhere]">
                    {name}
                </h2>
                <p className="text-sm text-ink-muted">{role}</p>
                {location && (
                    <p className="text-[13px] text-ink-muted">{location}</p>
                )}
            </div>
            {onEdit && (
                <ProfileEditButton
                    section="Profile information"
                    onClick={onEdit}
                />
            )}
        </section>
    );
}
