import {
    FormField,
    ImageUploadField,
    PageHeader,
    SectionCard,
    useObjectUrl,
} from '@/components/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { initialsFrom } from '@/lib/tones';
import networks from '@/routes/networks';
import { type NetworkSettingsPageProps } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import {
    Building2,
    Eye,
    ImageIcon,
    LifeBuoy,
    Mail,
    Phone,
    Settings,
} from 'lucide-react';
import { type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

type NetworkForm = {
    network_name: string;
    support_email: string;
    support_phone: string;
    logo: File[];
    sidebar_logo: File[];
    favicon: File[];
};

/**
 * Live preview of the tenant branding: browser tab (favicon + name), the navy
 * sidebar header (sidebar logo) and an email header (main logo).
 */
function BrandingPreview({
    name,
    logo,
    sidebarLogo,
    favicon,
}: {
    name: string;
    logo: string | null;
    sidebarLogo: string | null;
    favicon: string | null;
}) {
    const { t } = useTranslation();
    const initials = initialsFrom(name || 'DM');
    return (
        <div className="flex flex-col gap-3" aria-hidden="true">
            <div className="flex items-center gap-2 rounded-t-xl border border-b-0 border-border bg-surface-tint px-3 py-2">
                <span className="flex size-4 items-center justify-center overflow-hidden rounded-[4px] bg-brand text-[8px] font-bold text-white">
                    {favicon ? (
                        <img
                            src={favicon}
                            alt=""
                            className="size-full object-cover"
                        />
                    ) : (
                        initials.slice(0, 1)
                    )}
                </span>
                <span className="truncate text-xs font-semibold text-ink">
                    {name || t('Network name')}
                </span>
            </div>
            <div className="-mt-3 overflow-hidden rounded-b-xl border border-border">
                <div className="flex items-center gap-2.5 bg-sidebar px-3.5 py-3">
                    <span className="flex size-9 items-center justify-center overflow-hidden rounded-[10px] bg-brand text-xs font-extrabold text-white">
                        {sidebarLogo ? (
                            <img
                                src={sidebarLogo}
                                alt=""
                                className="size-full object-contain"
                            />
                        ) : (
                            initials
                        )}
                    </span>
                    <span className="truncate text-sm font-bold text-white">
                        {name || t('Network name')}
                    </span>
                </div>
                <div className="flex flex-col gap-2 bg-canvas p-3.5">
                    <span className="h-2 w-2/5 rounded bg-brand/70" />
                    <span className="h-6 rounded-md bg-surface" />
                    <span className="h-6 w-4/5 rounded-md bg-surface" />
                </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-3">
                {logo ? (
                    <img
                        src={logo}
                        alt=""
                        className="h-8 max-w-32 object-contain"
                    />
                ) : (
                    <span className="flex h-8 items-center rounded-md bg-surface-tint px-2 text-xs font-bold text-ink-muted">
                        {t('Main logo')}
                    </span>
                )}
                <span className="text-xs text-ink-muted">
                    {t('Emails and page headers')}
                </span>
            </div>
        </div>
    );
}

export default function NetworkSettingsIndex() {
    const { t } = useTranslation();
    const { network } = usePage<NetworkSettingsPageProps>().props;
    const form = useForm<NetworkForm>({
        network_name: network.network_name || '',
        support_email: network.support_email || '',
        support_phone: network.support_phone || '',
        logo: [],
        sidebar_logo: [],
        favicon: [],
    });
    const { data, setData, errors } = form;
    const logoPreview = useObjectUrl(data.logo[0]);
    const sidebarPreview = useObjectUrl(data.sidebar_logo[0]);
    const faviconPreview = useObjectUrl(data.favicon[0]);
    const fileError = (key: 'logo' | 'sidebar_logo' | 'favicon') =>
        errors[key] ?? (errors as Record<string, string>)[`${key}.0`];
    const setFile =
        (key: 'logo' | 'sidebar_logo' | 'favicon') => (file: File | null) =>
            setData(key, file ? [file] : []);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(networks.settings.update.url(), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () =>
                form.setData((current) => ({
                    ...current,
                    logo: [],
                    sidebar_logo: [],
                    favicon: [],
                })),
        });
    };

    return (
        <AppLayout>
            <Head title={t('Network settings')} />
            <form
                onSubmit={submit}
                noValidate
                className="workspace-page flex flex-col gap-6"
            >
                <PageHeader
                    title={t('Network settings')}
                    description={t(
                        'Your network’s name, branding and support details. They apply to everyone in your network.',
                    )}
                    breadcrumbs={[
                        {
                            title: t('Administration'),
                            href: networks.settings.index.url(),
                        },
                        {
                            title: t('Network settings'),
                            href: networks.settings.index.url(),
                        },
                    ]}
                    icon={<Settings />}
                    tone="admin"
                />

                <div className="grid items-start gap-[18px] xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="flex min-w-0 flex-col gap-[18px]">
                        <SectionCard
                            title={t('Network identity')}
                            description={t(
                                'Shown in the sidebar, browser tab and emails',
                            )}
                            icon={<Building2 />}
                            tone="partners"
                        >
                            <FormField
                                id="network_name"
                                label={t('Network name')}
                                error={errors.network_name}
                                className="max-w-md"
                            >
                                <Input
                                    id="network_name"
                                    required
                                    maxLength={100}
                                    value={data.network_name}
                                    onChange={(e) =>
                                        setData('network_name', e.target.value)
                                    }
                                />
                            </FormField>
                        </SectionCard>

                        <SectionCard
                            title={t('Brand assets')}
                            description={t(
                                'PNG, JPG, GIF or WebP. Square images work best for the sidebar logo and favicon.',
                            )}
                            icon={<ImageIcon />}
                            tone="brand"
                            bodyClassName="grid gap-3 md:grid-cols-3"
                        >
                            <ImageUploadField
                                id="logo"
                                label={t('Main logo')}
                                hint={t('Headers and emails. Max 2 MB.')}
                                currentUrl={network.logo_url}
                                file={data.logo[0] ?? null}
                                onFileChange={setFile('logo')}
                                accept="image/png,image/jpeg,image/gif,image/webp"
                                error={fileError('logo')}
                            />
                            <ImageUploadField
                                id="sidebar_logo"
                                label={t('Sidebar logo')}
                                hint={t('Navigation sidebar. Max 2 MB.')}
                                currentUrl={network.sidebar_logo_url}
                                file={data.sidebar_logo[0] ?? null}
                                onFileChange={setFile('sidebar_logo')}
                                accept="image/png,image/jpeg,image/gif,image/webp"
                                shape="square"
                                error={fileError('sidebar_logo')}
                            />
                            <ImageUploadField
                                id="favicon"
                                label={t('Favicon')}
                                hint={t(
                                    'Browser tab icon, ICO allowed. Max 1 MB.',
                                )}
                                currentUrl={network.favicon_url}
                                file={data.favicon[0] ?? null}
                                onFileChange={setFile('favicon')}
                                accept="image/png,image/jpeg,image/gif,image/webp,image/x-icon,.ico"
                                shape="square"
                                error={fileError('favicon')}
                            />
                        </SectionCard>

                        <SectionCard
                            title={t('Support contact')}
                            description={t('Where your partners can reach you')}
                            icon={<LifeBuoy />}
                            tone="analytics"
                            bodyClassName="grid gap-4 md:grid-cols-2"
                        >
                            <FormField
                                id="support_email"
                                label={t('Support email')}
                                error={errors.support_email}
                            >
                                <Input
                                    id="support_email"
                                    type="email"
                                    maxLength={255}
                                    autoComplete="email"
                                    placeholder="support@example.com"
                                    value={data.support_email}
                                    onChange={(e) =>
                                        setData('support_email', e.target.value)
                                    }
                                />
                            </FormField>
                            <FormField
                                id="support_phone"
                                label={t('Support phone')}
                                hint={t(
                                    'Up to 15 characters, e.g. +31201234567.',
                                )}
                                error={errors.support_phone}
                            >
                                <Input
                                    id="support_phone"
                                    type="tel"
                                    maxLength={15}
                                    autoComplete="tel"
                                    value={data.support_phone}
                                    onChange={(e) =>
                                        setData('support_phone', e.target.value)
                                    }
                                />
                            </FormField>
                        </SectionCard>
                    </div>

                    <SectionCard
                        title={t('Branding preview')}
                        description={t('Updates as you edit. Not saved yet.')}
                        icon={<Eye />}
                        tone="brand"
                        className="xl:sticky xl:top-24"
                        footer={
                            <dl className="grid w-full gap-1.5 text-[13px]">
                                <div className="flex items-center gap-2">
                                    <dt className="flex items-center gap-1.5 text-ink-muted">
                                        <Mail
                                            className="size-3.5"
                                            aria-hidden="true"
                                        />
                                        <span>{t('Support email')}</span>
                                    </dt>
                                    <dd className="ml-auto truncate font-semibold">
                                        {data.support_email ||
                                            t('Not provided')}
                                    </dd>
                                </div>
                                <div className="flex items-center gap-2">
                                    <dt className="flex items-center gap-1.5 text-ink-muted">
                                        <Phone
                                            className="size-3.5"
                                            aria-hidden="true"
                                        />
                                        <span>{t('Support phone')}</span>
                                    </dt>
                                    <dd className="ml-auto truncate font-semibold">
                                        {data.support_phone ||
                                            t('Not provided')}
                                    </dd>
                                </div>
                            </dl>
                        }
                    >
                        <BrandingPreview
                            name={data.network_name}
                            logo={logoPreview ?? network.logo_url ?? null}
                            sidebarLogo={
                                sidebarPreview ??
                                network.sidebar_logo_url ??
                                null
                            }
                            favicon={
                                faviconPreview ?? network.favicon_url ?? null
                            }
                        />
                    </SectionCard>
                </div>

                <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-card border border-border bg-surface px-[22px] py-3.5 shadow-card">
                    <p
                        role="status"
                        className="mr-auto text-[13px] text-ink-muted"
                    >
                        {form.recentlySuccessful
                            ? t('Saved')
                            : form.isDirty
                              ? t('Unsaved changes')
                              : t('No changes yet')}
                    </p>
                    <Button
                        type="button"
                        variant="secondary"
                        disabled={!form.isDirty || form.processing}
                        onClick={() => form.reset()}
                    >
                        {t('Cancel')}
                    </Button>
                    <Button type="submit" disabled={form.processing}>
                        {form.processing ? t('Saving…') : t('Save settings')}
                    </Button>
                </div>
            </form>
        </AppLayout>
    );
}
