/* eslint-disable @typescript-eslint/no-explicit-any */
import { Badge } from '@/components/ui/badge';
import React from 'react';
import { useTranslation } from 'react-i18next';

export const StatusBadge: React.FC<any> = ({ status }) => {
    const { t } = useTranslation();
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
            case 'locked':
            case 'payable':
                return 'outline';
            case 'D':
            case 'N':
            case 'R':
            case 'reversed':
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
                return t('Draft');
            case 'pending_approval':
                return t('Pending Approval');
            case 'A':
                return t('Active');
            case 'P':
            case 'pending':
                return t('Pending');
            case 'D':
            case 'N':
                return t('Deactivated');
            case 'I':
                return t('Inactive');
            case 'R':
            case 'rejected':
                return t('Rejected');
            case 'cancelled':
                return t('Cancelled');
            case 'partially_converted':
                return t('Partially Converted');
            case 'fully_converted':
                return t('Fully Converted');
            case 'pending_inspection':
                return t('Pending Inspection');
            // Invoice/Earning statuses
            case 'approved':
                return t('Approved');
            case 'paid':
                return t('Paid');
            case 'invoiced':
                return t('Invoiced');
            case 'processing':
                return t('Processing');
            // Commission types
            case 'CPL':
                return t('Cost Per Submission');
            case 'CPA':
                return t('Cost Per Action');
            case 'CPS':
                return t('Cost Per Sale');
            case 'RevShare':
                return t('Revenue Share');
            case 'Flat':
                return t('Flat Rate');
            // Priority levels
            case 'high':
                return t('High');
            case 'medium':
                return t('Medium');
            case 'low':
                return t('Low');
            // Payment frequency
            case 'W':
            case 'weekly':
                return t('Weekly');
            case 'biweekly':
                return t('Bi-Weekly');
            case 'M':
            case 'monthly':
                return t('Monthly');
            case 'quarterly':
                return t('Quarterly');
            case 'annually':
                return t('Annually');
            // Commission model
            case 'F':
                return t('Fixed');
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
