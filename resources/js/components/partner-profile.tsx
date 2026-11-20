import { ProfileCard, ProfileDetails } from '@/components/profile-ui';
import type { AdvertiserAccount } from '@/types/advertiser-workspace';
import type { PublisherAccount } from '@/types/publisher-workspace';
import { Building2, Globe2, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export function PartnerProfile({
    account,
    kind,
    website,
    onEditProfile,
    onEditBusiness,
    children,
}: {
    account: AdvertiserAccount | PublisherAccount;
    kind: 'Advertiser' | 'Publisher';
    website: ReactNode;
    onEditProfile?: () => void;
    onEditBusiness?: () => void;
    children: ReactNode;
}) {
    const { t } = useTranslation();
    return (
        <div className="grid gap-[18px] lg:grid-cols-2">
            <ProfileCard
                title={t('Personal information')}
                onEdit={onEditProfile}
                icon={<UserRound />}
                tone="partners"
            >
                <ProfileDetails
                    rows={[
                        [t('First name'), account.first_name],
                        [t('Last name'), account.last_name],
                        [t('Email address'), account.email],
                        [t('Username'), account.user_name],
                        [t('Title'), account.title],
                    ]}
                />
            </ProfileCard>
            <ProfileCard
                title={t('Company details')}
                onEdit={onEditBusiness}
                icon={<Building2 />}
                tone="partners"
            >
                <ProfileDetails
                    rows={[
                        [t('Business Name'), account.business_name],
                        [t('Industry'), account.industry],
                        [t('Website URL'), website],
                        [t('Chamber of Commerce number'), account.coc_number],
                    ]}
                />
            </ProfileCard>
            <ProfileCard
                title={t('Location & preferences')}
                onEdit={onEditProfile}
                icon={<Globe2 />}
                tone="analytics"
            >
                <ProfileDetails
                    rows={[
                        [t('Country'), account.country_iso],
                        [t('Timezone'), account.timezone],
                        [
                            t('Language'),
                            account.language === 'en'
                                ? t('English')
                                : account.language === 'nl'
                                  ? t('Dutch')
                                  : account.language,
                        ],
                        ...(kind === 'Publisher' && 'currency' in account
                            ? [
                                  [
                                      t('Preferred currency'),
                                      account.currency,
                                  ] as [string, ReactNode],
                              ]
                            : []),
                    ]}
                />
            </ProfileCard>
            {children}
        </div>
    );
}
