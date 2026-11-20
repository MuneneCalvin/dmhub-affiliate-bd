import { SectionCard } from '@/components/app';
import { LanguagePicker, ThemePicker } from '@/components/appearance-tabs';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { Head } from '@inertiajs/react';
import { Palette } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Appearance() {
    const { t } = useTranslation();
    return (
        <AppLayout>
            <Head title={t('Appearance')} />
            <SettingsLayout>
                <SectionCard
                    title={t('Appearance')}
                    description={t('Theme and language')}
                    icon={<Palette />}
                    tone="admin"
                    bodyClassName="flex flex-col gap-5"
                >
                    <ThemePicker />
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="flex-1 font-bold" aria-hidden="true">
                            {t('Language')}
                        </span>
                        <LanguagePicker />
                    </div>
                    <p className="text-[13px] text-ink-muted">
                        {t(
                            'Your theme is remembered on this device. Your language is saved to your account.',
                        )}
                    </p>
                </SectionCard>
            </SettingsLayout>
        </AppLayout>
    );
}
