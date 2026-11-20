import { Button } from '@/components/ui/button';
import { usePermissions } from '@/context/permission-context';
import advertiser from '@/routes/advertiser';
import advertisers from '@/routes/advertisers';
import applications from '@/routes/applications';
import networks from '@/routes/networks';
import publishers from '@/routes/publishers';
import system from '@/routes/system';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    ArrowUpRight,
    FileCheck,
    Image,
    Megaphone,
    Network,
    Receipt,
    Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function WorkflowWelcome({
    role,
    actionsOnly = false,
}: {
    role: 'admin' | 'network' | 'advertiser';
    actionsOnly?: boolean;
}) {
    const { t } = useTranslation();
    const { auth } = usePage<SharedData>().props;
    const { hasAnyPermission } = usePermissions();
    const icons = {
        admin: [Network, Users, Receipt],
        network: [Megaphone, Users, FileCheck],
        advertiser: [Megaphone, Network, Image],
    };
    const tasks = {
        admin: [
            {
                title: 'Grow your network',
                description:
                    'Keep every network and its relationships in view.',
                label: 'Explore networks',
                href: networks.index.url(),
                permissions: [
                    'view_networks',
                    'manage_networks',
                    'create_network',
                ],
            },
            {
                title: 'Bring your team together',
                description:
                    'Review people, access, and responsibilities in one place.',
                label: 'Open team directory',
                href: system.settings.users.url(),
                permissions: ['manage_system_users'],
            },
            {
                title: 'Keep payments moving',
                description:
                    'Review network invoices and follow up on outstanding balances.',
                label: 'Review invoices',
                href: '/networks/invoices',
                permissions: ['approve_network_invoices'],
            },
        ],
        network: [
            {
                title: 'Build your partnerships',
                description: 'Find the right advertisers for your network.',
                label: 'Explore advertisers',
                href: advertisers.index.url(),
                permissions: ['view_advertisers', 'manage_advertisers'],
            },
            {
                title: 'Welcome your publishers',
                description:
                    'Review your publishing partners and their progress.',
                label: 'Explore publishers',
                href: publishers.index.url(),
                permissions: ['view_publishers', 'manage_publishers'],
            },
            {
                title: 'Make the next connection',
                description:
                    'Help publishers get started by reviewing their applications.',
                label: 'Review applications',
                href: applications.index.url(),
                permissions: [
                    'review_applications',
                    'approve_applications',
                    'reject_applications',
                ],
            },
        ],
        advertiser: [
            {
                title: 'Make your next move',
                description:
                    'Bring a new campaign to life and reach your audience.',
                label: 'Create a campaign',
                href: advertiser.campaign.create.url(),
                permissions: ['manage_campaigns'],
            },
            {
                title: 'See what is working',
                description:
                    'Explore your campaigns, offers, and publishing partnerships.',
                label: 'Explore campaigns',
                href: advertiser.campaign.index.url(),
                permissions: ['view_campaigns', 'manage_campaigns'],
            },
            {
                title: 'Give your ideas a home',
                description:
                    'Keep campaign assets ready for your publishing partners.',
                label: 'Offer promotional materials',
                href: advertiser.campaign.index.url(),
                permissions: ['upload_creatives', 'manage_creatives'],
            },
        ],
    }[role]
        .map((task, index) => ({ ...task, Icon: icons[role][index] }))
        .filter((task) => hasAnyPermission(task.permissions));
    const titles = {
        admin: 'Platform overview',
        network: 'Network overview',
        advertiser: 'Campaign overview',
    };
    const descriptions = {
        admin: 'Monitor your networks, partners, and platform performance.',
        network: 'Track performance and manage your network relationships.',
        advertiser:
            'Track your campaign performance, budgets, and partnerships.',
    };
    if (actionsOnly)
        return tasks.length > 0 ? (
            <section
                aria-label={t('Quick actions')}
                className="workflow-actions"
            >
                {tasks.map((task) => {
                    const Icon = task.Icon;
                    return (
                        <article key={task.href} className="workflow-task">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                                <Icon className="size-5" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <h2>
                                    <Link href={task.href}>
                                        {t(task.label)}
                                    </Link>
                                </h2>
                                <p>{t(task.description)}</p>
                            </div>
                            <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
                        </article>
                    );
                })}
            </section>
        ) : null;
    return (
        <section className="workflow-welcome">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                        {t('Welcome back')}
                        {auth.user.first_name
                            ? `, ${auth.user.first_name}`
                            : ''}
                    </p>
                    <h1>{t(titles[role])}</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {t(descriptions[role])}
                    </p>
                </div>
                {tasks[0] && (
                    <Button asChild>
                        <Link href={tasks[0].href}>
                            {t(tasks[0].label)}
                            <ArrowUpRight className="size-4" />
                        </Link>
                    </Button>
                )}
            </div>
        </section>
    );
}
