import {
    profileCardFields,
    type CardEditorConfig,
    type CardField,
} from '@/components/partner-card-editor';
import type { AdvertiserWorkspaceProps } from '@/types/advertiser-workspace';
import type { PublisherWorkspaceProps } from '@/types/publisher-workspace';

function statusField(
    status: string,
    activate: boolean,
    deactivate: boolean,
): CardField {
    return {
        name: 'status',
        label: 'Account status',
        value: status,
        type: 'select',
        options: [
            {
                value: 'A',
                label: 'Active',
                disabled: status !== 'A' && !activate,
            },
            {
                value: 'P',
                label: 'Inactive',
                disabled: status !== 'P' && !deactivate,
            },
            ...(!['A', 'P'].includes(status)
                ? [
                      {
                          value: status,
                          label: status === 'C' ? 'Closed' : 'Inactive',
                      },
                  ]
                : []),
        ],
    };
}
export function advertiserCardEditors({
    advertiser: a,
    workspace: { permissions: can },
}: AdvertiserWorkspaceProps): Record<string, CardEditorConfig | null> {
    const url = (card: string) => `/advertisers/show/${a.id}/cards/${card}`;
    return {
        business: can.edit
            ? {
                  title: 'Business details',
                  url: url('business'),
                  fields: [
                      {
                          name: 'business_name',
                          label: 'Business Name',
                          value: a.business_name,
                          required: true,
                          maxLength: 200,
                      },
                      {
                          name: 'website_name',
                          label: 'Website URL',
                          value: a.website_name ?? '',
                          type: 'url',
                          maxLength: 100,
                      },
                      {
                          name: 'industry',
                          label: 'Industry',
                          value: a.industry,
                          required: true,
                          maxLength: 200,
                      },
                      {
                          name: 'coc_number',
                          label: 'Chamber of Commerce number',
                          value: a.coc_number ?? '',
                          maxLength: 10,
                      },
                  ],
              }
            : null,
        profile: can.editProfile
            ? {
                  title: 'User Information',
                  url: url('profile'),
                  fields: profileCardFields(a),
              }
            : null,
        readiness:
            can.edit || can.activate || can.deactivate
                ? {
                      title: 'Account readiness',
                      url: url('readiness'),
                      description:
                          'Status changes also apply to the advertiser’s login account.',
                      fields: [
                          statusField(
                              a.advertiser_status,
                              can.activate,
                              can.deactivate,
                          ),
                          ...(can.edit
                              ? [
                                    {
                                        name: 'auto_approve_publishers',
                                        label: 'Auto-approve publishers',
                                        value: a.auto_approve_publishers,
                                        type: 'checkbox' as const,
                                    },
                                    {
                                        name: 'require_publisher_approval',
                                        label: 'Publisher approval required',
                                        value: a.require_publisher_approval,
                                        type: 'checkbox' as const,
                                    },
                                ]
                              : []),
                      ],
                  }
                : null,
    };
}
export function publisherCardEditors({
    publisher: p,
    workspace: { permissions: can },
}: PublisherWorkspaceProps): Record<string, CardEditorConfig | null> {
    const url = (card: string) =>
        `/publishers/show/${p.publisher_id}/cards/${card}`;
    const site: CardField[] = [
        {
            name: 'website_url',
            label: 'Website URL',
            value: p.website_url ?? '',
            type: 'url',
            maxLength: 255,
        },
        ...(can.edit
            ? [
                  {
                      name: 'business_name',
                      label: 'Business Name',
                      value: p.business_name ?? '',
                      maxLength: 255,
                  },
                  {
                      name: 'industry',
                      label: 'Industry',
                      value: p.industry ?? '',
                      maxLength: 255,
                  },
                  {
                      name: 'coc_number',
                      label: 'Chamber of Commerce number',
                      value: p.coc_number ?? '',
                      maxLength: 10,
                  },
              ]
            : []),
    ];
    return {
        details: can.editProfile
            ? {
                  title: 'Publisher details',
                  url: url('details'),
                  fields: [
                      {
                          name: 'first_name',
                          label: 'First name',
                          value: p.first_name,
                          required: true,
                          maxLength: 255,
                      },
                      {
                          name: 'last_name',
                          label: 'Last name',
                          value: p.last_name,
                          required: true,
                          maxLength: 255,
                      },
                      {
                          name: 'business_name',
                          label: 'Business Name',
                          value: p.business_name ?? '',
                          maxLength: 255,
                      },
                      {
                          name: 'industry',
                          label: 'Industry',
                          value: p.industry ?? '',
                          maxLength: 255,
                      },
                      {
                          name: 'coc_number',
                          label: 'Chamber of Commerce number',
                          value: p.coc_number ?? '',
                          maxLength: 10,
                      },
                      ...(can.editSites
                          ? site.filter((field) => field.name === 'website_url')
                          : []),
                  ],
              }
            : null,
        site: can.editSites
            ? { title: 'Website & business', url: url('site'), fields: site }
            : null,
        traffic: can.editSites
            ? {
                  title: 'Traffic profile',
                  url: url('traffic'),
                  fields: [
                      {
                          name: 'traffic_sources',
                          label: 'Traffic Sources',
                          value: p.traffic_sources?.join('\n') ?? '',
                          type: 'textarea',
                          maxLength: 2000,
                          description: 'Enter one traffic source per line.',
                      },
                      {
                          name: 'monthly_visitors',
                          label: 'Monthly Visitors',
                          value:
                              p.monthly_visitors == null
                                  ? ''
                                  : String(p.monthly_visitors),
                          type: 'number',
                          min: 0,
                          max: 2147483647,
                          step: '1',
                      },
                      {
                          name: 'primary_verticals',
                          label: 'Primary verticals',
                          value: Array.isArray(p.primary_verticals)
                              ? p.primary_verticals.join(', ')
                              : (p.primary_verticals ?? ''),
                          maxLength: 255,
                      },
                      {
                          name: 'secondary_verticals',
                          label: 'Secondary verticals',
                          value: Array.isArray(p.secondary_verticals)
                              ? p.secondary_verticals.join(', ')
                              : (p.secondary_verticals ?? ''),
                          maxLength: 255,
                      },
                  ],
              }
            : null,
        payout: can.editPayout
            ? {
                  title: 'Payout preferences',
                  url: url('payout'),
                  description:
                      'The threshold applies separately to each network and currency.',
                  fields: [
                      {
                          name: 'payout_method',
                          label: 'Payout method',
                          value: p.payout_method ?? '',
                          maxLength: 100,
                      },
                      {
                          name: 'payout_threshold',
                          label: 'Payout threshold',
                          value: p.payout_threshold ?? '0.00',
                          type: 'number',
                          min: 0,
                          max: 999999999,
                          step: '0.01',
                          required: true,
                      },
                  ],
              }
            : null,
        profile: can.editProfile
            ? {
                  title: 'User Information',
                  url: url('profile'),
                  fields: profileCardFields(p),
              }
            : null,
        readiness:
            can.activate || can.deactivate
                ? {
                      title: 'Account readiness',
                      url: url('readiness'),
                      description:
                          'Status changes also apply to the publisher’s login account.',
                      fields: [
                          statusField(p.status, can.activate, can.deactivate),
                      ],
                  }
                : null,
    };
}
