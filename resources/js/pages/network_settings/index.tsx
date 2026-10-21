import { Transition } from '@headlessui/react';
import { Head, useForm, usePage } from '@inertiajs/react';
import { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import {
    ReusableEmailInput,
    ReusableFileInput,
    ReusablePageTitle,
    ReusableTextInput,
} from '@/dev/core';
import AppLayout from '@/layouts/app-layout';
import networks from '@/routes/networks';
import { BreadcrumbItem, NetworkSettingsPageProps } from '@/types';
import { useTranslation } from 'react-i18next';

export default function NetworkSettingsIndex() {
    const { t } = useTranslation();
    const { network } = usePage<NetworkSettingsPageProps>().props;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Network Settings'),
            href: networks.settings.index.url(),
        },
    ];

    const { data, setData, post, processing, errors, recentlySuccessful } =
        useForm<{
            network_name: string;
            support_email: string;
            support_phone: string;
            logo: File[];
            sidebar_logo: File[];
            favicon: File[];
        }>({
            network_name: network.network_name || '',
            support_email: network.support_email || '',
            support_phone: network.support_phone || '',
            logo: [],
            sidebar_logo: [],
            favicon: [],
        });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post(networks.settings.update.url(), {
            preserveScroll: true,
            forceFormData: true,
        });
    };

    return (
        <AppLayout>
            <Head title={t('Network Settings')} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <ReusablePageTitle
                    title={t('Network Branding')}
                    description={t(
                        "Customize your network's appearance. These settings will apply to all users in your network.",
                    )}
                    breadcrumbs={breadcrumbs}
                />
                <div className="px-4 py-6">
                    <div className="mx-auto space-y-6">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="max-w-md">
                                <ReusableTextInput
                                    id="network_name"
                                    label={t('Network Name')}
                                    value={data.network_name}
                                    onChange={(value) =>
                                        setData('network_name', value)
                                    }
                                    placeholder={t('Enter your network name')}
                                    required
                                    error={errors.network_name}
                                />
                            </div>

                            <div className="grid gap-8 md:grid-cols-2">
                                <div>
                                    <ReusableFileInput
                                        id="logo"
                                        label={t('Main Logo')}
                                        value={data.logo}
                                        onChange={(files) =>
                                            setData('logo', files)
                                        }
                                        error={errors.logo}
                                    />
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {t(
                                            'This logo appears on headers and email communications. PNG, JPG, GIF or WebP. Max 2MB.',
                                        )}
                                    </p>
                                    {network.logo_url &&
                                        data.logo.length === 0 && (
                                            <div className="mt-2 rounded-lg border bg-gray-50 p-2 dark:bg-gray-800">
                                                <p className="mb-1 text-xs text-muted-foreground">
                                                    {t('Current logo')}:
                                                </p>
                                                <img
                                                    src={network.logo_url}
                                                    alt={t('Current logo')}
                                                    className="h-16 object-contain"
                                                />
                                            </div>
                                        )}
                                </div>

                                <div>
                                    <ReusableFileInput
                                        id="sidebar_logo"
                                        label={t('Sidebar Logo')}
                                        value={data.sidebar_logo}
                                        onChange={(files) =>
                                            setData('sidebar_logo', files)
                                        }
                                        error={errors.sidebar_logo}
                                    />
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {t(
                                            'This logo appears in the navigation sidebar. Square format recommended. Max 2MB.',
                                        )}
                                    </p>
                                    {network.sidebar_logo_url &&
                                        data.sidebar_logo.length === 0 && (
                                            <div className="mt-2 rounded-lg border bg-gray-50 p-2 dark:bg-gray-800">
                                                <p className="mb-1 text-xs text-muted-foreground">
                                                    {t('Current sidebar logo')}:
                                                </p>
                                                <img
                                                    src={
                                                        network.sidebar_logo_url
                                                    }
                                                    alt={t(
                                                        'Current sidebar logo',
                                                    )}
                                                    className="h-12 object-contain"
                                                />
                                            </div>
                                        )}
                                </div>
                            </div>

                            <div className="max-w-md">
                                <ReusableFileInput
                                    id="favicon"
                                    label={t('Favicon')}
                                    value={data.favicon}
                                    onChange={(files) =>
                                        setData('favicon', files)
                                    }
                                    error={errors.favicon}
                                />
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {t(
                                        'The small icon that appears in browser tabs. PNG, JPG, ICO or WebP. Square format recommended. Max 1MB.',
                                    )}
                                </p>
                                {network.favicon_url &&
                                    data.favicon.length === 0 && (
                                        <div className="mt-2 rounded-lg border bg-gray-50 p-2 dark:bg-gray-800">
                                            <p className="mb-1 text-xs text-muted-foreground">
                                                {t('Current favicon')}:
                                            </p>
                                            <img
                                                src={network.favicon_url}
                                                alt={t('Current favicon')}
                                                className="h-8 w-8 object-contain"
                                            />
                                        </div>
                                    )}
                            </div>

                            <div className="border-t pt-6">
                                <h3 className="mb-4 text-lg font-medium">
                                    {t('Contact Information')}
                                </h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <ReusableEmailInput
                                        id="support_email"
                                        label={t('Support Email')}
                                        value={data.support_email}
                                        onChange={(value) =>
                                            setData('support_email', value)
                                        }
                                        placeholder="support@yournetwork.com"
                                        error={errors.support_email}
                                    />
                                    <ReusableTextInput
                                        id="support_phone"
                                        label={t('Support Phone')}
                                        value={data.support_phone}
                                        onChange={(value) =>
                                            setData('support_phone', value)
                                        }
                                        placeholder="+1234567890"
                                        error={errors.support_phone}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-4 border-t pt-6">
                                <Button type="submit" disabled={processing}>
                                    {processing
                                        ? t('Saving...')
                                        : t('Save Settings')}
                                </Button>

                                <Transition
                                    show={recentlySuccessful}
                                    enter="transition ease-in-out"
                                    enterFrom="opacity-0"
                                    leave="transition ease-in-out"
                                    leaveTo="opacity-0"
                                >
                                    <p className="text-sm text-green-600">
                                        {t('Saved successfully!')}
                                    </p>
                                </Transition>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
