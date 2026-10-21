/* eslint-disable @typescript-eslint/no-explicit-any */
import { Badge } from '@/components/ui/badge';
import i18n from '@/i18n/index';
import React from 'react';

export const StatusBadge: React.FC<any> = ({ status }) => {
    const getStatusVariant = (
        status: any,
    ): 'default' | 'secondary' | 'destructive' | 'outline' => {
        switch (status) {
            case 'draft':
                return 'secondary';
            case 'pending_approval':
                return 'default';
            case 'P':
            case 'pending':
            case 'processing':
                return 'default';
            case 'I':
                return 'destructive';
            case 'A':
            case 'approved':
            case 'paid':
            case 'invoiced':
                return 'outline';
            case 'D':
            case 'N':
            case 'R':
            case 'rejected':
            case 'cancelled':
                return 'destructive';
            case 'partially_converted':
            case 'fully_converted':
                return 'outline';
            // Commission types
            case 'CPL':
            case 'CPA':
            case 'CPS':
            case 'RevShare':
            case 'Flat':
                return 'secondary';
            // Priority levels
            case 'high':
                return 'destructive';
            case 'medium':
                return 'default';
            case 'low':
                return 'secondary';
            // Lead statuses
            case 'new':
                return 'default';
            case 'contacted':
                return 'secondary';
            case 'qualified':
                return 'outline';
            case 'converted':
                return 'outline';
            case 'lost':
                return 'destructive';
            // Payment frequency
            case 'W':
            case 'M':
            case 'weekly':
            case 'biweekly':
            case 'monthly':
            case 'quarterly':
            case 'annually':
                return 'secondary';
            // Commission model
            case 'F':
                return 'outline';
            default:
                return 'default';
        }
    };

    const getStatusLabel = (status: any): string => {
        switch (status) {
            case 'draft':
                return i18n.t('Draft');
            case 'pending_approval':
                return i18n.t('Pending Approval');
            case 'A':
                return i18n.t('Active');
            case 'P':
            case 'pending':
                return i18n.t('Pending');
            case 'D':
            case 'N':
                return i18n.t('Deactivated');
            case 'I':
                return i18n.t('Inactive');
            case 'R':
            case 'rejected':
                return i18n.t('Rejected');
            case 'cancelled':
                return i18n.t('Cancelled');
            case 'partially_converted':
                return i18n.t('Partially Converted');
            case 'fully_converted':
                return i18n.t('Fully Converted');
            case 'pending_inspection':
                return i18n.t('Pending Inspection');
            // Invoice/Earning statuses
            case 'approved':
                return i18n.t('Approved');
            case 'paid':
                return i18n.t('Paid');
            case 'invoiced':
                return i18n.t('Invoiced');
            case 'processing':
                return i18n.t('Processing');
            // Commission types
            case 'CPL':
                return i18n.t('Cost Per Lead');
            case 'CPA':
                return i18n.t('Cost Per Action');
            case 'CPS':
                return i18n.t('Cost Per Sale');
            case 'RevShare':
                return i18n.t('Revenue Share');
            case 'Flat':
                return i18n.t('Flat Rate');
            // Priority levels
            case 'high':
                return i18n.t('High');
            case 'medium':
                return i18n.t('Medium');
            case 'low':
                return i18n.t('Low');
            // Lead statuses
            case 'new':
                return i18n.t('New');
            case 'contacted':
                return i18n.t('Contacted');
            case 'qualified':
                return i18n.t('Qualified');
            case 'converted':
                return i18n.t('Converted');
            case 'lost':
                return i18n.t('Lost');
            // Payment frequency
            case 'W':
            case 'weekly':
                return i18n.t('Weekly');
            case 'biweekly':
                return i18n.t('Bi-Weekly');
            case 'M':
            case 'monthly':
                return i18n.t('Monthly');
            case 'quarterly':
                return i18n.t('Quarterly');
            case 'annually':
                return i18n.t('Annually');
            // Commission model
            case 'F':
                return i18n.t('Fixed');
            default:
                return status;
        }
    };

    const getStatusColor = (status: any): string => {
        switch (status) {
            case 'draft':
                return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
            case 'pending_approval':
            case 'P':
            case 'pending':
            case 'pending_inspection':
            case 'processing':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
            case 'A':
            case 'approved':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            case 'paid':
                return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300';
            case 'invoiced':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
            case 'D':
            case 'N':
            case 'I':
            case 'R':
            case 'rejected':
            case 'cancelled':
                return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
            case 'partially_converted':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
            case 'fully_converted':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
            // Commission types
            case 'CPL':
                return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
            case 'CPA':
                return 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300';
            case 'CPS':
                return 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-300';
            case 'RevShare':
                return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300';
            case 'Flat':
                return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300';
            // Priority levels
            case 'high':
                return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
            case 'medium':
                return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
            case 'low':
                return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
            // Lead statuses
            case 'new':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
            case 'contacted':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
            case 'qualified':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
            case 'converted':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            case 'lost':
                return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
            // Payment frequency
            case 'W':
            case 'weekly':
                return 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300';
            case 'biweekly':
                return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
            case 'M':
            case 'monthly':
                return 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300';
            case 'quarterly':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
            case 'annually':
                return 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-300';
            // Commission model
            case 'F':
                return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
        }
    };
    return (
        <Badge
            variant={getStatusVariant(status)}
            className={getStatusColor(status)}
        >
            {getStatusLabel(status)}
        </Badge>
    );
};
