import { Head, router, usePage } from '@inertiajs/react';
import { Download, Search, Trash2 } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import leadRoutes from '@/routes/leads';
import { type BreadcrumbItem } from '@/types';

interface LeadRow {
    id: number;
    first_name: string | null;
    last_name: string | null;
    email: string;
    phone: string | null;
    company: string | null;
    status: string;
    notes: string | null;
    created_at: string;
    campaign?: { id: number; name: string } | null;
    offer?: { id: number; name: string } | null;
}

interface LeadsPageProps {
    leads: {
        data: LeadRow[];
        links: { url: string | null; label: string; active: boolean }[];
        total: number;
    };
    filters: { status: string | null; search: string };
    statuses: string[];
    [key: string]: unknown;
}

export default function LeadsIndex() {
    const { t } = useTranslation();
    const { leads, filters, statuses } = usePage<LeadsPageProps>().props;
    const [search, setSearch] = useState(filters.search ?? '');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Leads'), href: leadRoutes.index.url() },
    ];

    const applyFilters = (next: { status?: string | null; search?: string }) =>
        router.get(
            leadRoutes.index.url(),
            {
                status: next.status ?? filters.status ?? undefined,
                search: (next.search ?? search) || undefined,
            },
            { preserveState: true, replace: true },
        );

    const onSearch = (event: FormEvent) => {
        event.preventDefault();
        applyFilters({ search });
    };

    const updateStatus = (lead: LeadRow, status: string) =>
        router.patch(
            leadRoutes.update.url(lead.id),
            { status },
            { preserveScroll: true },
        );

    const remove = (lead: LeadRow) => {
        if (
            window.confirm(
                t(
                    'Delete this contact? The submission and its commission stay on record.',
                ),
            )
        ) {
            router.delete(leadRoutes.destroy.url(lead.id), {
                preserveScroll: true,
            });
        }
    };

    const exportUrl = leadRoutes.export.url({
        query: filters.status ? { status: filters.status } : undefined,
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Leads')} />
            <div className="space-y-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-semibold">{t('Leads')}</h1>
                        <p className="text-sm text-muted-foreground">
                            {t(
                                'Contact details reported with confirmed submissions.',
                            )}
                        </p>
                    </div>
                    <Button asChild variant="outline">
                        <a href={exportUrl}>
                            <Download className="mr-2 h-4 w-4" />
                            {t('Export')}
                        </a>
                    </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <form onSubmit={onSearch} className="flex gap-2">
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder={t('Search name, email or company')}
                            className="w-72"
                            aria-label={t('Search leads')}
                        />
                        <Button type="submit" variant="secondary">
                            <Search className="mr-2 h-4 w-4" />
                            {t('Search')}
                        </Button>
                    </form>
                    <select
                        value={filters.status ?? ''}
                        onChange={(event) =>
                            router.get(
                                leadRoutes.index.url(),
                                {
                                    status: event.target.value || undefined,
                                    search: search || undefined,
                                },
                                { preserveState: true, replace: true },
                            )
                        }
                        className="h-9 rounded-md border bg-background px-2 text-sm"
                        aria-label={t('Filter by status')}
                    >
                        <option value="">{t('All statuses')}</option>
                        {statuses.map((status) => (
                            <option key={status} value={status}>
                                {t(status)}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('Contact')}</TableHead>
                                <TableHead>{t('Company')}</TableHead>
                                <TableHead>{t('Campaign')}</TableHead>
                                <TableHead>{t('Status')}</TableHead>
                                <TableHead>{t('Received')}</TableHead>
                                <TableHead className="w-12" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {leads.data.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="py-8 text-center text-muted-foreground"
                                    >
                                        {t('No leads yet.')}
                                    </TableCell>
                                </TableRow>
                            )}
                            {leads.data.map((lead) => (
                                <TableRow key={lead.id}>
                                    <TableCell>
                                        <div className="font-medium">
                                            {[lead.first_name, lead.last_name]
                                                .filter(Boolean)
                                                .join(' ') || lead.email}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {lead.email}
                                            {lead.phone
                                                ? ` · ${lead.phone}`
                                                : ''}
                                        </div>
                                    </TableCell>
                                    <TableCell>{lead.company ?? '—'}</TableCell>
                                    <TableCell>
                                        {lead.campaign?.name ?? '—'}
                                    </TableCell>
                                    <TableCell>
                                        <select
                                            value={lead.status}
                                            onChange={(event) =>
                                                updateStatus(
                                                    lead,
                                                    event.target.value,
                                                )
                                            }
                                            className="h-8 rounded-md border bg-background px-2 text-sm"
                                            aria-label={t('Lead status')}
                                        >
                                            {statuses.map((status) => (
                                                <option
                                                    key={status}
                                                    value={status}
                                                >
                                                    {t(status)}
                                                </option>
                                            ))}
                                        </select>
                                    </TableCell>
                                    <TableCell>
                                        {new Date(
                                            lead.created_at,
                                        ).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => remove(lead)}
                                            aria-label={t('Delete lead')}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {leads.links.length > 3 && (
                    <div className="flex flex-wrap gap-1">
                        {leads.links.map((link, index) => (
                            <Button
                                key={index}
                                variant={link.active ? 'default' : 'outline'}
                                size="sm"
                                disabled={!link.url}
                                onClick={() =>
                                    link.url &&
                                    router.get(
                                        link.url,
                                        {},
                                        { preserveScroll: true },
                                    )
                                }
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
