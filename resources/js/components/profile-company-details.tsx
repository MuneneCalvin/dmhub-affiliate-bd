import {
    PartnerCardEditor,
    type CardField,
} from '@/components/partner-card-editor';
import { ProfileCard, ProfileDetails } from '@/components/profile-ui';
import { Building2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export type ProfileCompany = {
    kind: 'advertiser' | 'publisher';
    business_name: string | null;
    industry: string | null;
    coc_number: string | null;
    website: string | null;
    canEditWebsite: boolean;
    updateUrl: string;
};

export function ProfileCompanyDetails({
    company,
}: {
    company: ProfileCompany;
}) {
    const { t } = useTranslation();
    const [editing, setEditing] = useState(false);
    const advertiser = company.kind === 'advertiser';
    const title = advertiser
        ? 'Advertiser company details'
        : 'Publisher company details';
    const fields: CardField[] = [
        {
            name: 'business_name',
            label: 'Business Name',
            value: company.business_name ?? '',
            required: advertiser,
            maxLength: advertiser ? 200 : 255,
        },
        {
            name: 'industry',
            label: 'Industry',
            value: company.industry ?? '',
            required: advertiser,
            maxLength: advertiser ? 200 : 255,
        },
        {
            name: 'coc_number',
            label: 'Chamber of Commerce number',
            value: company.coc_number ?? '',
            maxLength: 10,
        },
        ...(company.canEditWebsite
            ? [
                  {
                      name: advertiser ? 'website_name' : 'website_url',
                      label: 'Website URL',
                      value: company.website ?? '',
                      type: 'url' as const,
                      maxLength: advertiser ? 100 : 255,
                  },
              ]
            : []),
    ];

    return (
        <>
            <ProfileCard
                title={t(title)}
                icon={<Building2 />}
                tone="partners"
                onEdit={() => setEditing(true)}
            >
                <ProfileDetails
                    rows={[
                        [t('Business Name'), company.business_name],
                        [t('Industry'), company.industry],
                        [t('Chamber of Commerce number'), company.coc_number],
                        [t('Website URL'), company.website],
                    ]}
                />
            </ProfileCard>
            {editing && (
                <PartnerCardEditor
                    config={{ title, url: company.updateUrl, fields }}
                    onClose={() => setEditing(false)}
                />
            )}
        </>
    );
}
