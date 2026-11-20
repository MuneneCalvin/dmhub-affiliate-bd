import {
    ProfileCompanyDetails,
    type ProfileCompany,
} from '@/components/profile-company-details';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { Head } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

/** Advertiser / publisher company profile, edited from account settings. */
export default function Company({
    companies,
}: {
    companies: ProfileCompany[];
}) {
    const { t } = useTranslation();
    return (
        <AppLayout>
            <Head title={t('Company details')} />
            <SettingsLayout>
                {companies.map((company) => (
                    <ProfileCompanyDetails
                        key={company.kind}
                        company={company}
                    />
                ))}
            </SettingsLayout>
        </AppLayout>
    );
}
