import { Building2, CalendarDays, Globe2, Target } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { LinkTabs, ProfileBanner, type LinkTab } from '@/components/app';
import type { ProfileChip } from '@/components/app/profile-banner';
import { StatusBadge } from '@/components/ui/status-badge';
import { useDate } from '@/lib/format';

import { campaignStatusKey } from './status';

export type CampaignHeaderProps = {
    name: string;
    /** Campaign status code (A, P, I). */
    status: string;
    advertiser: React.ReactNode;
    /** Headline commission, e.g. "8% · CPS". */
    commission?: string | null;
    /** Targeted country codes; empty means all countries. */
    countries?: string[];
    startDate?: string | null;
    endDate?: string | null;
    actions?: React.ReactNode;
    tabs: LinkTab[];
    currentTab: string;
};

/**
 * Campaign workspace header: banner, logo tile, name with status, meta chips
 * (advertiser, commission, geo, dates), actions and the section tabs.
 */
function CampaignHeader({
    name,
    status,
    advertiser,
    commission,
    countries = [],
    startDate,
    endDate,
    actions,
    tabs,
    currentTab,
}: CampaignHeaderProps) {
    const { t } = useTranslation();
    const formatDate = useDate();
    const geo = countries.length
        ? countries.length > 4
            ? t('{{count}} countries', { count: countries.length })
            : countries.join(' · ')
        : t('All countries');
    const chips: ProfileChip[] = [
        {
            label: advertiser,
            icon: <Building2 className="text-partners" aria-hidden="true" />,
        },
        ...(commission
            ? [
                  {
                      label: commission,
                      icon: (
                          <Target className="text-brand" aria-hidden="true" />
                      ),
                  },
              ]
            : []),
        {
            label: geo,
            icon: <Globe2 className="text-analytics" aria-hidden="true" />,
        },
        {
            label: `${formatDate(startDate)} – ${endDate ? formatDate(endDate) : t('No end date')}`,
            icon: <CalendarDays className="text-finance" aria-hidden="true" />,
        },
    ];

    return (
        <ProfileBanner
            name={name}
            tone="brand"
            status={<StatusBadge status={campaignStatusKey(status)} />}
            chips={chips}
            actions={actions}
            footer={
                <LinkTabs
                    label={t('Campaign sections')}
                    tabs={tabs}
                    current={currentTab}
                    className="border-b-0 [&_a]:h-[52px]"
                />
            }
        />
    );
}

export { CampaignHeader };
