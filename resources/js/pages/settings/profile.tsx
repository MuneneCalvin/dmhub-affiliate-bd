import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import { FormField, SectionCard } from '@/components/app';
import DeleteUser from '@/components/delete-user';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { initialsFrom } from '@/lib/tones';
import { send } from '@/routes/verification';
import { type SharedData } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Globe2, UserRound } from 'lucide-react';
import { type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

type Account = {
    first_name: string;
    last_name: string;
    name: string;
    email: string;
    title: string;
    country_iso: string;
    timezone: string;
    language: string;
};

const text = (value: unknown) => (typeof value === 'string' ? value : '');

/** "Saved" note announced after a successful save. */
function SavedNote({ show }: { show: boolean }) {
    const { t } = useTranslation();
    return (
        <p
            role="status"
            className="mr-auto text-[13px] font-semibold text-success-ink"
        >
            {show ? t('Saved') : ''}
        </p>
    );
}

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { t } = useTranslation();
    const { auth } = usePage<SharedData>().props;
    const user = auth.user;
    const account: Account = {
        first_name: text(user.first_name),
        last_name: text(user.last_name),
        name: text(user.user_name),
        email: user.email,
        title: text(user.title),
        country_iso: text(user.country_iso),
        timezone: text(user.timezone),
        language: text(user.language),
    };
    // Both cards send the username and email: the update request requires them.
    const profile = useForm({
        first_name: account.first_name,
        last_name: account.last_name,
        name: account.name,
        email: account.email,
        title: account.title,
    });
    const preferences = useForm({
        name: account.name,
        email: account.email,
        country_iso: account.country_iso,
        timezone: account.timezone,
        language: account.language,
    });
    const submit =
        (form: typeof profile | typeof preferences) => (event: FormEvent) => {
            event.preventDefault();
            form.patch(ProfileController.update().url, {
                preserveScroll: true,
            });
        };
    const displayName =
        [account.first_name, account.last_name].filter(Boolean).join(' ') ||
        account.name;
    const unverified = mustVerifyEmail && user.email_verified_at === null;

    return (
        <AppLayout>
            <Head title={t('Profile')} />
            <SettingsLayout>
                <form onSubmit={submit(profile)} noValidate>
                    <SectionCard
                        title={t('Profile')}
                        description={t('How other partners see you')}
                        icon={<UserRound />}
                        tone="brand"
                        bodyClassName="flex flex-col gap-5"
                        footer={
                            <>
                                <SavedNote show={profile.recentlySuccessful} />
                                <Button
                                    type="submit"
                                    className="ml-auto"
                                    disabled={profile.processing}
                                >
                                    {t('Save changes')}
                                </Button>
                            </>
                        }
                    >
                        <div className="flex flex-wrap items-center gap-4">
                            <Avatar className="size-[72px] rounded-[22px] text-2xl">
                                {user.avatar && (
                                    <AvatarImage
                                        src={user.avatar}
                                        alt={displayName}
                                    />
                                )}
                                <AvatarFallback className="rounded-[22px] bg-finance-soft font-extrabold text-finance-ink">
                                    {initialsFrom(displayName)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <p className="text-lg font-extrabold [overflow-wrap:anywhere]">
                                    {displayName}
                                </p>
                                <p className="text-[13px] text-ink-muted">
                                    {account.title || account.email}
                                </p>
                            </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <FormField
                                id="first_name"
                                label={t('First name')}
                                error={profile.errors.first_name}
                            >
                                <Input
                                    id="first_name"
                                    required
                                    maxLength={30}
                                    autoComplete="given-name"
                                    value={profile.data.first_name}
                                    onChange={(e) =>
                                        profile.setData(
                                            'first_name',
                                            e.target.value,
                                        )
                                    }
                                />
                            </FormField>
                            <FormField
                                id="last_name"
                                label={t('Last name')}
                                error={profile.errors.last_name}
                            >
                                <Input
                                    id="last_name"
                                    required
                                    maxLength={30}
                                    autoComplete="family-name"
                                    value={profile.data.last_name}
                                    onChange={(e) =>
                                        profile.setData(
                                            'last_name',
                                            e.target.value,
                                        )
                                    }
                                />
                            </FormField>
                            <FormField
                                id="email"
                                label={t('Email address')}
                                hint={t(
                                    'Changing the email address requires verification again.',
                                )}
                                error={profile.errors.email}
                                after={
                                    <span>
                                        <StatusBadge
                                            status={
                                                unverified
                                                    ? 'pending'
                                                    : 'verified'
                                            }
                                            label={
                                                unverified
                                                    ? t('Not verified')
                                                    : t('Verified')
                                            }
                                        />
                                    </span>
                                }
                            >
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    maxLength={255}
                                    autoComplete="email"
                                    value={profile.data.email}
                                    onChange={(e) =>
                                        profile.setData('email', e.target.value)
                                    }
                                />
                            </FormField>
                            <FormField
                                id="user_name"
                                label={t('Username')}
                                error={profile.errors.name}
                            >
                                <Input
                                    id="user_name"
                                    required
                                    maxLength={50}
                                    autoComplete="username"
                                    value={profile.data.name}
                                    onChange={(e) =>
                                        profile.setData('name', e.target.value)
                                    }
                                />
                            </FormField>
                            <FormField
                                id="title"
                                label={t('Job title')}
                                error={profile.errors.title}
                            >
                                <Input
                                    id="title"
                                    maxLength={50}
                                    autoComplete="organization-title"
                                    value={profile.data.title}
                                    onChange={(e) =>
                                        profile.setData('title', e.target.value)
                                    }
                                />
                            </FormField>
                        </div>
                        {unverified && (
                            <div className="rounded-xl bg-warning-soft p-3.5 text-sm text-warning-ink">
                                <p>
                                    {t('Your email address is unverified.')}{' '}
                                    <Link
                                        href={send()}
                                        as="button"
                                        className="font-bold underline underline-offset-4"
                                    >
                                        {t('Resend verification email')}
                                    </Link>
                                </p>
                                {status === 'verification-link-sent' && (
                                    <p role="status" className="mt-2">
                                        {t(
                                            'A new verification link has been sent to your email address.',
                                        )}
                                    </p>
                                )}
                            </div>
                        )}
                    </SectionCard>
                </form>

                <form onSubmit={submit(preferences)} noValidate>
                    <SectionCard
                        title={t('Location & preferences')}
                        description={t(
                            'Used for dates, times and messages we send you',
                        )}
                        icon={<Globe2 />}
                        tone="analytics"
                        footer={
                            <>
                                <SavedNote
                                    show={preferences.recentlySuccessful}
                                />
                                <Button
                                    type="submit"
                                    className="ml-auto"
                                    disabled={preferences.processing}
                                >
                                    {t('Save preferences')}
                                </Button>
                            </>
                        }
                    >
                        <div className="grid gap-4 sm:grid-cols-3">
                            <FormField
                                id="country_iso"
                                label={t('Country code')}
                                hint={t(
                                    'Use a three-letter country code, for example NLD.',
                                )}
                                error={preferences.errors.country_iso}
                            >
                                <Input
                                    id="country_iso"
                                    maxLength={3}
                                    className="uppercase"
                                    value={preferences.data.country_iso}
                                    onChange={(e) =>
                                        preferences.setData(
                                            'country_iso',
                                            e.target.value.toUpperCase(),
                                        )
                                    }
                                />
                            </FormField>
                            <FormField
                                id="timezone"
                                label={t('Timezone')}
                                hint={t('For example Europe/Amsterdam.')}
                                error={preferences.errors.timezone}
                            >
                                <Input
                                    id="timezone"
                                    maxLength={50}
                                    value={preferences.data.timezone}
                                    onChange={(e) =>
                                        preferences.setData(
                                            'timezone',
                                            e.target.value,
                                        )
                                    }
                                />
                            </FormField>
                            <FormField
                                id="language"
                                label={t('Preferred language')}
                                error={preferences.errors.language}
                            >
                                <Select
                                    value={preferences.data.language || 'none'}
                                    onValueChange={(value) =>
                                        preferences.setData(
                                            'language',
                                            value === 'none' ? '' : value,
                                        )
                                    }
                                >
                                    <SelectTrigger id="language">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">
                                            {t('Not set')}
                                        </SelectItem>
                                        <SelectItem value="en">
                                            {t('English')}
                                        </SelectItem>
                                        <SelectItem value="nl">
                                            {t('Dutch')}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormField>
                        </div>
                    </SectionCard>
                </form>

                <DeleteUser />
            </SettingsLayout>
        </AppLayout>
    );
}
