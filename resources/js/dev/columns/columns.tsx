/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { AdminInvoice, 
	InvoiceEarning, 
	Lead, 
	PublisherEarning, 
	PublisherInvoice, 
	TActionColumnGenProps, 
	TAdvertiser, 
	TNetwork, 
	TOffers, 
	TPermissions, 
	TPublisher, 
	TRoles, 
	User 
} from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { ChevronDownCircle, Pencil, Trash2 } from "lucide-react";
import React from "react";
import { ReusableDropDownComponent } from "../core";
import { StatusBadge } from "../statusBadge";
import { formatCurrency } from "@/utils/utils";
import i18n from "@/i18n/index";
import { t } from "i18next";

export const ActionColumn = <T,>({
	ActionsHandlerMapping,
}: TActionColumnGenProps<T>): ColumnDef<T> => {
	return {
		enableHiding: false,
		header: () => i18n.t('Action(s)'),
		accessorKey: 'id',
		cell: ({ row }) => {
			const data: T = row.original;
			return (
				<React.Fragment>
					<ReusableDropDownComponent<T>
						{...{
							triggerEl: (
								<ChevronDownCircle className='h-6 w-6 opacity-85 select-none' />
							),
							ActionsHandlerMapping: ActionsHandlerMapping.filter(
								({ conditional }) => (conditional ? conditional(data) : true)
							).map(({ label, onSelect, value }) => ({
								onSelect: (_: any) => onSelect(data),
								value: data,
								label,
							})),

							includeSearch: true,
							selectedOption: '',
						}}
					/>
				</React.Fragment>
			);
		},
	};
};

export const RolesColumns: ColumnDef<TRoles>[] = [
	{
		accessorKey: "name",
		header: () => <div>{i18n.t('Role Name')}</div>,
		cell: ({ row }) => {
			const name: string = row.getValue("name");
			return <div className="font-medium">{name}</div>;
		},
	},
	{
		accessorKey: "permissions_count",
		header: () => <div>{i18n.t('Permissions')}</div>,
		cell: ({ row }) => {
			const count: number = row.getValue("permissions_count") || 0;
			return (
				<div className="text-muted-foreground">
					{count} {count === 1 ? i18n.t('permission') : i18n.t('permissions')}
				</div>
			);
		},
	},
	{
		accessorKey: "created_at",
		header: () => <div>{i18n.t('Date Created')}</div>,
		cell: ({ row }) => {
			const created_at: string = row.getValue("created_at");
			return (
				<div className="text-gray-600 max-w-md truncate">
					{new Date(created_at).toLocaleDateString()}
				</div>
			);
		},
	},
];

export const PermissionsColumns: ColumnDef<TPermissions>[] = [
	{
		accessorKey: "name",
		header: () => <div>{i18n.t('Permission')}</div>,
		cell: ({ row }) => {
			const name: string = row.getValue("name");
			return <div>{name}</div>;
		},
	},
	{
		accessorKey: "created_at",
		header: () => <div>{i18n.t('Date Created')}</div>,
		cell: ({ row }) => {
			const created_at: string = row.getValue("created_at");
			return (
				<div className="text-gray-600 max-w-md truncate">
					{new Date(created_at).toLocaleDateString()}
				</div>
			);
		},
	},
];

export const NetworksColumns: ColumnDef<TNetwork>[] = [
	{
		accessorKey: "network_name",
		header: () => <div>{i18n.t('Network Name')}</div>,
		cell: ({ row }) => {
			const name: string = row.getValue("network_name");
			return <div>{name}</div>;
		},
	},
	{
		accessorKey: "owner_email",
		header: () => <div>{i18n.t('Owner Email')}</div>,
		cell: ({ row }) => {
			const name: string = row.getValue("owner_email");
			return <div>{name}</div>;
		},
	},
	{
		accessorKey: "support_phone",
		header: () => <div>{i18n.t('Support Contact')}</div>,
		cell: ({ row }) => {
			const name: string = row.getValue("support_phone");
			return <div>{name}</div>;
		},
	},
	{
		accessorKey: "support_email",
		header: () => <div>{i18n.t('Support Email')}</div>,
		cell: ({ row }) => {
			const name: string = row.getValue("support_email");
			return <div>{name}</div>;
		},
	},
	{
		accessorKey: "status",
		header: () => <div>{i18n.t('Status')}</div>,
		cell: ({ row }) => {
			const status: string = row.getValue("status");
			return <StatusBadge status={status} />;
		},
	},
	{
		accessorKey: "created_at",
		header: () => <div>{i18n.t('Date Created')}</div>,
		cell: ({ row }) => {
			const created_at: string = row.getValue("created_at");
			return (
				<div className="text-gray-600 max-w-md truncate">
					{new Date(created_at).toLocaleDateString()}
				</div>
			);
		},
	},
];

export const AdvertisersColumns: ColumnDef<TAdvertiser>[] = [
	{
		accessorKey: "business_name",
		header: () => <div>{i18n.t('Business Name')}</div>,
		cell: ({ row }) => {
			const name: string = row.getValue("business_name");
			return <div>{name}</div>;
		},
	},
	{
		accessorKey: "networkName",
		header: () => <div>{i18n.t('Network')}</div>,
		cell: ({ row }) => {
			const name: string = row.getValue("networkName");
			return <div>{name}</div>;
		},
	},
	{
		accessorKey: "industry",
		header: () => <div>{i18n.t('Industry')}</div>,
		cell: ({ row }) => {
			const name: string = row.getValue("industry");
			return <div>{name}</div>;
		},
	},
	{
		accessorKey: "currencyName",
		header: () => <div>{i18n.t('Currency')}</div>,
		cell: ({ row }) => {
			const currency: string = row.getValue("currencyName");
			return <div>{currency}</div>;
		},
	},
	{
		accessorKey: "total_budget",
		header: () => <div>{i18n.t('Total Budget')}</div>,
		cell: ({ row }) => {
			const budget_total: string = row.getValue("total_budget");
			return <div>{parseFloat(budget_total).toFixed(2)}</div>;
		},
	},
	{
		accessorKey: "available_budget",
		header: () => <div>{i18n.t('Available Budget')}</div>,
		cell: ({ row }) => {
			const available_budget: string = row.getValue("available_budget");
			return <div>{parseFloat(available_budget).toFixed(2)}</div>;
		},
	},
	{
		accessorKey: "status",
		header: () => <div>{i18n.t('Status')}</div>,
		cell: ({ row }) => {
			const status: string = row.getValue("status");
			return <StatusBadge status={status} />;
		},
	},
	{
		accessorKey: "created_at",
		header: () => <div>{i18n.t('Date Created')}</div>,
		cell: ({ row }) => {
			const created_at: string = row.getValue("created_at");
			return (
				<div className="text-gray-600 max-w-md truncate">
					{new Date(created_at).toLocaleDateString()}
				</div>
			);
		},
	},
];

export const PublishersColumns: ColumnDef<TPublisher>[] = [
	{
		accessorKey: "first_name",
		header: () => <div>{i18n.t('First Name')}</div>,
		cell: ({ row }) => {
			const first_name: string = row.getValue("first_name");
			return <div>{first_name}</div>;
		},
	},
	{
		accessorKey: "last_name",
		header: () => <div>{i18n.t('Last Name')}</div>,
		cell: ({ row }) => {
			const last_name: string = row.getValue("last_name");
			return <div>{last_name}</div>;
		},
	},
	{
		accessorKey: "email",
		header: () => <div>{i18n.t('Email Address')}</div>,
		cell: ({ row }) => {
			const email: string = row.getValue("email");
			return <div>{email}</div>;
		},
	},
	{
		accessorKey: "currency",
		header: () => <div>{i18n.t('Currency')}</div>,
		cell: ({ row }) => {
			const currency: string = row.getValue("currency");
			return <div>{currency}</div>;
		},
	},
	{
		accessorKey: "network_name",
		header: () => <div>{i18n.t('Network')}</div>,
		cell: ({ row }) => {
			const network_name: string = row.getValue("network_name");
			return <div>{network_name}</div>;
		},
	},
	{
		accessorKey: "account_health_score",
		header: () => <div>{i18n.t('Account Score')}</div>,
		cell: ({ row }) => {
			const score: string = row.getValue("account_health_score");
			return <div>{parseFloat(score).toFixed(2)}</div>;
		},
	},
	{
		accessorKey: "total_earnings",
		header: () => <div>{i18n.t('Total Earnings')}</div>,
		cell: ({ row }) => {
			const total_earnings: string = row.getValue("total_earnings");
			return <div>{parseFloat(total_earnings).toFixed(2)}</div>;
		},
	},
	{
		accessorKey: "status",
		header: () => <div>{i18n.t('Status')}</div>,
		cell: ({ row }) => {
			const status: string = row.getValue("status");
			return <StatusBadge status={status} />;
		},
	},
	{
		accessorKey: "last_active_at",
		header: () => <div>{i18n.t('Last Active')}</div>,
		cell: ({ row }) => {
			const last_active_at: string = row.getValue("last_active_at");
			return (
				<div className="text-gray-600 max-w-md truncate">
					{new Date(last_active_at).toLocaleDateString()}
				</div>
			);
		},
	},
	{
		accessorKey: "created_at",
		header: () => <div>{i18n.t('Date Joined')}</div>,
		cell: ({ row }) => {
			const created_at: string = row.getValue("created_at");
			return (
				<div className="text-gray-600 max-w-md truncate">
					{new Date(created_at).toLocaleDateString()}
				</div>
			);
		},
	},
];
export const UsersColumns: ColumnDef<User>[] = [
	{
		accessorKey: "first_name",
		header: () => <div>{i18n.t('First Name')}</div>,
		cell: ({ row }) => {
			const first_name: string = row.getValue("first_name");
			return <div>{first_name}</div>;
		},
	},
	{
		accessorKey: "last_name",
		header: () => <div>{i18n.t('Last Name')}</div>,
		cell: ({ row }) => {
			const last_name: string = row.getValue("last_name");
			return <div>{last_name}</div>;
		},
	},
	{
		accessorKey: "email",
		header: () => <div>{i18n.t('Email Address')}</div>,
		cell: ({ row }) => {
			const email: string = row.getValue("email");
			return <div>{email}</div>;
		},
	},
	{
		accessorKey: "title",
		header: () => <div>{i18n.t('Title')}</div>,
		cell: ({ row }) => {
			const title: string = row.getValue("title");
			return <div>{title}</div>;
		},
	},
	{
		accessorKey: "status",
		header: () => <div>{i18n.t('Status')}</div>,
		cell: ({ row }) => {
			const status: string = row.getValue("status");
			return <div>{<StatusBadge status={status} />}</div>;
		},
	},
];
export const SystemUsersColumns: ColumnDef<User>[] = [
	{
		accessorKey: "first_name",
		header: () => <div>{i18n.t('First Name')}</div>,
		cell: ({ row }) => {
			const first_name: string = row.getValue("first_name");
			return <div>{first_name}</div>;
		},
	},
	{
		accessorKey: "last_name",
		header: () => <div>{i18n.t('Last Name')}</div>,
		cell: ({ row }) => {
			const last_name: string = row.getValue("last_name");
			return <div>{last_name}</div>;
		},
	},
	{
		accessorKey: "email",
		header: () => <div>{i18n.t('Email Address')}</div>,
		cell: ({ row }) => {
			const email: string = row.getValue("email");
			return <div>{email}</div>;
		},
	},
	{
		accessorKey: "title",
		header: () => <div>{i18n.t('Title')}</div>,
		cell: ({ row }) => {
			const title: string = row.getValue("title");
			return <div>{title ?? '-'}</div>;
		},
	},
	{
		accessorKey: "status",
		header: () => <div>{i18n.t('Status')}</div>,
		cell: ({ row }) => {
			const status: string = row.getValue("status");
			return <div>{<StatusBadge status={status} />}</div>;
		},
	}
];

export const AdvertiserCampaignsColumns: ColumnDef<any>[] = [
	{
		accessorKey: 'name',
		header: () => i18n.t('Campaign Name'),
		cell: ({ row }) => row.getValue('name'),
	},
	{
		accessorKey: 'currency',
		header: () => i18n.t('Currency'),
		cell: ({ row }) => row.getValue('currency'),
	},
	{
		accessorKey: 'budget_total',
		header: () => i18n.t('Total Budget'),
		cell: ({ row }) => row.getValue('budget_total'),
	},
	{
		accessorKey: 'daily_budget',
		header: () => i18n.t('Daily Budget'),
		cell: ({ row }) => row.getValue('daily_budget'),
	},
	{
		accessorKey: 'start_date',
		header: () => i18n.t('Start Date'),
		cell: ({ row }) => new Date(row.getValue('start_date')).toLocaleDateString(),
	},
	{
		accessorKey: 'end_date',
		header: () => i18n.t('End Date'),
		cell: ({ row }) => new Date(row.getValue('end_date')).toLocaleDateString(),
	},
	{
		accessorKey: 'target_conversions',
		header: () => i18n.t('Target Conversions'),
		cell: ({ row }) => row.getValue('target_conversions'),
	},
	{
		accessorKey: 'target_roi',
		header: () => i18n.t('Target ROI'),
		cell: ({ row }) => `${row.getValue('target_roi')}%`,
	},
	{
		accessorKey: 'status',
		header: () => i18n.t('Status'),
		cell: ({ row }) => {
			const status: string = row.getValue('status');
			return <StatusBadge status={status} />;
		},
	},
	{
		accessorKey: 'created_at',
		header: () => i18n.t('Created At'),
		cell: ({ row }) => new Date(row.getValue('created_at')).toLocaleDateString(),
	},
];

export const OffersColumns: ColumnDef<TOffers>[] = [
	{
		accessorKey: 'name',
		header: () => i18n.t('Offer Name'),
		cell: ({ row }) => row.getValue('name'),
	},
	{
		accessorKey: 'commission_rate_1',
		header: () => i18n.t('Commission #1'),
		cell: ({ row }) => {
			const value = row.getValue('commission_rate_1');
			return value ? `$${value}` : '-';
		},
	},
	{
		accessorKey: 'commission_rate_2',
		header: () => i18n.t('Commission #2'),
		cell: ({ row }) => {
			const value = row.getValue('commission_rate_2');
			return value ? `$${value}` : '-';
		},
	},
	{
		accessorKey: 'min_payout',
		header: () => i18n.t('Minimum Payout'),
		cell: ({ row }) => {
			const value = row.getValue('min_payout');
			return value ? `$${value}` : '-';
		},
	},
	{
		accessorKey: 'total_clicks',
		header: () => i18n.t('Total Clicks'),
		cell: ({ row }) => row.getValue('total_clicks'),
	},
	{
		accessorKey: 'total_conversions',
		header: () => i18n.t('Total Conversions'),
		cell: ({ row }) => row.getValue('total_conversions'),
	},
	{
		accessorKey: 'conversion_rate',
		header: () => i18n.t('Conversion Rate'),
		cell: ({ row }) => `${row.getValue('conversion_rate')}%`,
	},
	{
		accessorKey: 'avg_order_value',
		header: () => i18n.t('Avg Order Value'),
		cell: ({ row }) => row.getValue('avg_order_value'),
	},
	{
		accessorKey: 'epc',
		header: () => i18n.t('EPC'),
		cell: ({ row }) => row.getValue('epc'),
	},
	{
		accessorKey: 'status',
		header: () => i18n.t('Status'),
		cell: ({ row }) => {
			const status: string = row.getValue('status');
			return <StatusBadge status={status} />;
		},
	},
	{
		accessorKey: 'expires_at',
		header: () => i18n.t('Expires At'),
		cell: ({ row }) => {
			const expiresAt = row.getValue('expires_at') as string;
			return expiresAt ? new Date(expiresAt).toLocaleDateString('en-GB') : '-';
		},
	},
	{
		accessorKey: 'created_at',
		header: () => i18n.t('Created At'),
		cell: ({ row }) => new Date(row.getValue('created_at')).toLocaleDateString(),
	},
];

export const MyCampaignsColumns: ColumnDef<TOffers>[] = [
	{
		accessorKey: 'name',
		header: () => i18n.t('Offer Name'),
		cell: ({ row }) => row.getValue('name'),
	},
	{
		accessorKey: 'commission_value_1',
		header: () => i18n.t('Commission #1'),
		cell: ({ row }) => row.getValue('commission_value_1'),
	},
	{
		accessorKey: 'commission_value_2',
		header: () => i18n.t('Commission #2'),
		cell: ({ row }) => row.getValue('commission_value_2'),
	},
	{
		accessorKey: 'minimum_payout',
		header: () => i18n.t('Minimum Payout'),
		cell: ({ row }) => row.getValue('minimum_payout'),
	},
	{
		accessorKey: 'total_clicks',
		header: () => i18n.t('Total Clicks'),
		cell: ({ row }) => row.getValue('total_clicks'),
	},
	{
		accessorKey: 'total_conversions',
		header: () => i18n.t('Total Conversions'),
		cell: ({ row }) => row.getValue('total_conversions'),
	},
	{
		accessorKey: 'conversion_rate',
		header: () => i18n.t('Conversion Rate'),
		cell: ({ row }) => `${row.getValue('conversion_rate')}%`,
	},
	{
		accessorKey: 'avg_order_value',
		header: () => i18n.t('Avg Order Value'),
		cell: ({ row }) => row.getValue('avg_order_value'),
	},
	{
		accessorKey: 'earnings_per_click',
		header: () => i18n.t('EPC'),
		cell: ({ row }) => row.getValue('earnings_per_click'),
	},
	{
		accessorKey: 'offer_status',
		header: () => i18n.t('Status'),
		cell: ({ row }) => {
			const status: string = row.getValue('offer_status');
			return <StatusBadge status={status} />;
		},
	},
	{
		accessorKey: 'expires_at',
		header: () => i18n.t('Expires At'),
		cell: ({ row }) => {
			const expiresAt = row.getValue('expires_at') as string;
			return expiresAt ? new Date(expiresAt).toLocaleDateString('en-GB') : '-';
		},
	},
	{
		accessorKey: 'created_at',
		header: () => i18n.t('Created At'),
		cell: ({ row }) => new Date(row.getValue('created_at')).toLocaleDateString(),
	},
];


export const ApplicationsColumns: ColumnDef<any>[] = [
	{
		accessorKey: 'first_name',
		header: () => i18n.t('Publisher Name'),
		cell: ({ row }) => {
			const firstName = row.getValue('first_name') as string;
			const lastName = row.original.last_name as string;
			return <div>{firstName} {lastName}</div>;
		},
	},
	{
		accessorKey: 'email',
		header: () => i18n.t('Email'),
		cell: ({ row }) => row.getValue('email'),
	},
	{
		accessorKey: 'campaign_name',
		header: () => i18n.t('Campaign'),
		cell: ({ row }) => row.getValue('campaign_name'),
	},
	{
		accessorKey: 'offer_name',
		header: () => i18n.t('Offer'),
		cell: ({ row }) => {
			const offerName = row.getValue('offer_name') as string;
			const offerId = row.original.offer_id;
			if (!offerId || !offerName) {
				return (
					<span className="text-yellow-600 text-sm italic">
						{i18n.t('Pending Assignment')}
					</span>
				);
			}
			return offerName;
		},
	},
	{
		accessorKey: 'website_url',
		header: () => i18n.t('Website'),
		cell: ({ row }) => {
			const url = row.getValue('website_url') as string;
			return url ? (
				<a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
					{url.length > 30 ? url.substring(0, 30) + '...' : url}
				</a>
			) : '-';
		},
	},
	{
		accessorKey: 'status',
		header: () => i18n.t('Status'),
		cell: ({ row }) => {
			const status: string = row.getValue('status');
			return <StatusBadge status={status} />;
		},
	},
	{
		accessorKey: 'applied_at',
		header: () => i18n.t('Applied At'),
		cell: ({ row }) => {
			const appliedAt = row.getValue('applied_at') as string;
			const createdAt = row.original.created_at as string;
			const date = appliedAt || createdAt;
			return date ? new Date(date).toLocaleDateString('en-GB') : '-';
		},
	},
];

export const PoolAdvertisersColumns: ColumnDef<any>[] = [
	{
		accessorKey: 'user.first_name',
		header: () => i18n.t('First Name'),
		cell: ({ row }) => row.original.user?.first_name ?? '-',
	},
	{
		accessorKey: 'user.last_name',
		header: () => i18n.t('Last Name'),
		cell: ({ row }) => row.original.user?.last_name ?? '-',
	},
	{
		accessorKey: 'user.email',
		header: () => i18n.t('Email'),
		cell: ({ row }) => row.original.user?.email ?? '-',
	},
	{
		accessorKey: 'business_name',
		header: () => i18n.t('Business Name'),
		cell: ({ row }) => row.getValue('business_name') ?? '-',
	},
	{
		accessorKey: 'industry',
		header: () => i18n.t('Industry'),
		cell: ({ row }) => row.getValue('industry') ?? '-',
	},
	{
		accessorKey: 'website_name',
		header: () => i18n.t('Website'),
		cell: ({ row }) => {
			const url = row.getValue('website_name') as string;
			return url ? (
				<a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
					{url.length > 25 ? url.substring(0, 25) + '...' : url}
				</a>
			) : '-';
		},
	},
	{
		accessorKey: 'status',
		header: () => i18n.t('Status'),
		cell: ({ row }) => {
			const status: string = row.getValue('status');
			return <StatusBadge status={status} />;
		},
	},
	{
		accessorKey: 'created_at',
		header: () => i18n.t('Registered At'),
		cell: ({ row }) => {
			const date = row.getValue('created_at') as string;
			return date ? new Date(date).toLocaleDateString('en-GB') : '-';
		},
	},
];

export const PoolPublishersColumns: ColumnDef<any>[] = [
	{
		accessorKey: 'user.first_name',
		header: () => i18n.t('First Name'),
		cell: ({ row }) => row.original.user?.first_name ?? '-',
	},
	{
		accessorKey: 'user.last_name',
		header: () => i18n.t('Last Name'),
		cell: ({ row }) => row.original.user?.last_name ?? '-',
	},
	{
		accessorKey: 'user.email',
		header: () => i18n.t('Email'),
		cell: ({ row }) => row.original.user?.email ?? '-',
	},
	{
		accessorKey: 'website_url',
		header: () => i18n.t('Website'),
		cell: ({ row }) => {
			const url = row.getValue('website_url') as string;
			return url ? (
				<a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
					{url.length > 30 ? url.substring(0, 30) + '...' : url}
				</a>
			) : '-';
		},
	},
	{
		accessorKey: 'monthly_visitors',
		header: () => i18n.t('Monthly Visitors'),
		cell: ({ row }) => {
			const visitors = row.getValue('monthly_visitors') as number;
			return visitors ? visitors.toLocaleString() : '-';
		},
	},
	{
		accessorKey: 'primary_verticals',
		header: () => i18n.t('Primary Verticals'),
		cell: ({ row }) => row.getValue('primary_verticals') ?? '-',
	},
	{
		accessorKey: 'user.created_at',
		header: () => i18n.t('Registered At'),
		cell: ({ row }) => {
			const date = row.original.user?.created_at as string;
			return date ? new Date(date).toLocaleDateString('en-GB') : '-';
		},
	},
];

export const MyCreativesColumns: ColumnDef<any>[] = [
	{
		accessorKey: 'name',
		header: () => i18n.t('Creative Name'),
		cell: ({ row }) => row.getValue('name'),
	},
	{
		accessorKey: 'type',
		header: () => i18n.t('Type'),
		cell: ({ row }) => {
			const type: string = row.getValue('type');
			return <span className="capitalize">{type}</span>;
		},
	},
	{
		accessorKey: 'campaign',
		header: () => i18n.t('Campaign'),
		cell: ({ row }) => {
			const campaign: any = row.getValue('campaign');
			return campaign?.name ?? '-';
		},
	},
	{
		accessorKey: 'offer',
		header: () => i18n.t('Offer'),
		cell: ({ row }) => {
			const offer: any = row.getValue('offer');
			return offer?.name ?? '-';
		},
	},
	{
		accessorKey: 'width',
		header: () => i18n.t('Dimensions'),
		cell: ({ row }) => {
			const width = row.original.width;
			const height = row.original.height;
			return width && height ? `${width} x ${height}` : '-';
		},
	},
	{
		accessorKey: 'clicks',
		header: () => i18n.t('Clicks'),
		cell: ({ row }) => row.getValue('clicks') ?? 0,
	},
	{
		accessorKey: 'impressions',
		header: () => i18n.t('Impressions'),
		cell: ({ row }) => row.getValue('impressions') ?? 0,
	},
	{
		accessorKey: 'status',
		header: () => i18n.t('Status'),
		cell: ({ row }) => {
			const status: string = row.getValue('status');
			return <StatusBadge status={status} />;
		},
	},
	{
		accessorKey: 'created_at',
		header: () => i18n.t('Created At'),
		cell: ({ row }) => {
			const date = row.getValue('created_at');
			return date ? new Date(date as string).toLocaleDateString() : '-';
		},
	},
];

export const LeadsColumns: ColumnDef<Lead>[] = [
	{
		accessorKey: "first_name",
		header: () => i18n.t("Lead"),
		cell: ({ row }) => {
			const lead = row.original;

			return (
				<div>
					<div className="font-medium">
						{lead.first_name} {lead.last_name}
					</div>
					<div className="text-xs text-muted-foreground">
						{lead.source}
					</div>
				</div>
			);
		},
	},
	{
		accessorKey: "email",
		header: () => i18n.t("Contact"),
		cell: ({ row }) => {
			const lead = row.original;

			return (
				<div className="space-y-1 text-sm">
					<div>{lead.email}</div>
					<div className="text-muted-foreground">
						{lead.phone}
					</div>
				</div>
			);
		},
	},
	{
		accessorKey: "company",
		header: () => i18n.t("Company"),
	},
	{
		accessorKey: "campaign",
		header: () => i18n.t("Campaign"),
		cell: ({ row }) => row.original.campaign?.name,
	},
	{
		accessorKey: "status",
		header: () => i18n.t("Status"),
		cell: ({ row }) => {
			const status = row.getValue("status") as string;

			return (
				<StatusBadge status={status} />
			);
		},
	},
	{
		accessorKey: "priority",
		header: () => i18n.t("Priority"),
		cell: ({ row }) => {
			const priority = row.getValue("priority") as string;
			return (
				<StatusBadge status={priority} />
			);
		},
	},
	{
		accessorKey: "lead_value",
		header: () => i18n.t("Value"),
		cell: ({ row }) => formatCurrency(row.getValue("lead_value")),
	},
	{
		accessorKey: "created_at",
		header: () => i18n.t("Created"),
		cell: ({ row }) => (
			<span className="text-sm text-muted-foreground">
				{new Date(row.getValue("created_at")).toLocaleDateString()}
			</span>
		),
	},
];

export const AdminInvoiceColumns: ColumnDef<AdminInvoice>[] = [
	{
		accessorKey: 'invoice_number',
		header: () => i18n.t('Invoice #'),
		cell: ({ row }) => (
			<span className="font-mono font-semibold">{row.original?.invoice_number}</span>
		),
	},
	{
		accessorKey: 'publisher',
		header: () => i18n.t('Publisher'),
		cell: ({ row }) => (
			<div>
				<p className="font-medium">
					{row.original?.publisher?.user?.first_name} {row.original?.publisher?.user?.last_name}
				</p>
				<p className="text-xs text-muted-foreground">{row.original?.publisher?.user?.email}</p>
			</div>
		),
	},
	{
		accessorKey: 'amount',
		header: () => i18n.t('Amount'),
		cell: ({ row }) => (
			<span className="font-semibold text-green-600">
				{formatCurrency(parseFloat(row.original?.amount), row.original?.currency || 'USD')}
			</span>
		),
	},
	{
		accessorKey: 'status',
		header: () => i18n.t('Status'),
		cell: ({ row }) => <StatusBadge status={row.original?.status} />,
	},
	{
		accessorKey: 'requested_at',
		header: () => i18n.t('Requested'),
		cell: ({ row }) => row.original?.requested_at
			? new Date(row.original?.requested_at).toLocaleDateString()
			: '-',
	},
	{
		accessorKey: 'approved_at',
		header: () => i18n.t('Approved'),
		cell: ({ row }) => row.original?.approved_at
			? new Date(row.original?.approved_at).toLocaleDateString()
			: '-',
	},
	{
		accessorKey: 'paid_at',
		header: () => i18n.t('Paid'),
		cell: ({ row }) => row.original?.paid_at
			? new Date(row.original?.paid_at).toLocaleDateString()
			: '-',
	},
];

export const PublisherEarningsColumn: ColumnDef<PublisherEarning>[] = [
	{
		accessorKey: 'created_at',
		header: () => i18n.t('Date'),
		cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
	},
	{
		accessorKey: 'campaign',
		header: () => i18n.t('Campaign'),
		cell: ({ row }) => row.original.publisher_campaign?.campaign?.name || 'N/A',
	},
	{
		accessorKey: 'lead',
		header: () => i18n.t('Lead'),
		cell: ({ row }) => row.original.lead?.email || 'N/A',
	},
	{
		accessorKey: 'commission_type',
		header: () => i18n.t('Type'),
		cell: ({ row }) => <StatusBadge status={row.original.commission_type} />,
	},
	{
		accessorKey: 'amount',
		header: () => i18n.t('Amount'),
		cell: ({ row }) => (
			<span className="font-semibold text-green-600">
				{formatCurrency(parseFloat(row.original.amount), 'USD')}
			</span>
		),
	},
];

export const InvoiceEarningsColumns: ColumnDef<InvoiceEarning>[] = [
	{
		accessorKey: 'created_at',
		header: () => i18n.t('Date'),
		cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
	},
	{
		accessorKey: 'campaign',
		header: () => i18n.t('Campaign'),
		cell: ({ row }) => row.original.publisher_campaign?.campaign?.name || 'N/A',
	},
	{
		accessorKey: 'lead',
		header: () => i18n.t('Lead'),
		cell: ({ row }) => (
			<div>
				<p>{row.original.lead?.email || 'N/A'}</p>
				{row.original.lead?.first_name && (
					<p className="text-xs text-muted-foreground">
						{row.original.lead?.first_name} {row.original.lead?.last_name}
					</p>
				)}
			</div>
		),
	},
	{
		accessorKey: 'commission_type',
		header: () => i18n.t('Type'),
		cell: ({ row }) => <StatusBadge status={row.original.commission_type} />,
	},
	{
		accessorKey: 'amount',
		header: () => i18n.t('Amount'),
		cell: ({ row }) => (
			<span className="font-semibold text-green-600">
				{formatCurrency(parseFloat(row.original.amount), 'USD')}
			</span>
		),
	},
];

export const EarningsColumns: ColumnDef<PublisherEarning>[] = [
	{
		accessorKey: 'created_at',
		header: () => i18n.t('Date'),
		cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
	},
	{
		accessorKey: 'campaign',
		header: () => i18n.t('Campaign'),
		cell: ({ row }) => row.original.publisher_campaign?.campaign?.name || 'N/A',
	},
	{
		accessorKey: 'offer',
		header: () => i18n.t('Offer'),
		cell: ({ row }) => row.original.publisher_campaign?.offer?.name || 'N/A',
	},
	{
		accessorKey: 'lead',
		header: () => i18n.t('Lead'),
		cell: ({ row }) => row.original.lead?.email || 'N/A',
	},
	{
		accessorKey: 'commission_type',
		header: () => i18n.t('Type'),
		cell: ({ row }) => <StatusBadge status={row.original.commission_type} />,
	},
	{
		accessorKey: 'amount',
		header: () => i18n.t('Amount'),
		cell: ({ row }) => (
			<span className="font-semibold text-green-600">
				{formatCurrency(parseFloat(row.original.amount), 'USD')}
			</span>
		),
	},
	{
		accessorKey: 'status',
		header: () => i18n.t('Status'),
		cell: ({ row }) => <StatusBadge status={row.original.status} />,
	},
	{
		accessorKey: 'invoice',
		header: () => i18n.t('Invoice'),
		cell: ({ row }) => row.original.invoice?.invoice_number || '-',
	},
];

export const InvoiceColumns: ColumnDef<PublisherInvoice>[] = [
	{
		accessorKey: 'invoice_number',
		header: () => i18n.t('Invoice #'),
		cell: ({ row }) => (
			<span className="font-mono font-semibold">{row.original.invoice_number}</span>
		),
	},
	{
		accessorKey: 'created_at',
		header: () => i18n.t('Date'),
		cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
	},
	{
		accessorKey: 'amount',
		header: () => i18n.t('Amount'),
		cell: ({ row }) => (
			<span className="font-semibold text-green-600">
				{formatCurrency(parseFloat(row.original.amount), 'USD')}
			</span>
		),
	},
	{
		accessorKey: 'status',
		header: () => i18n.t('Status'),
		cell: ({ row }) => <StatusBadge status={row.original.status} />,
	},
	{
		accessorKey: 'approved_at',
		header: () => i18n.t('Approved'),
		cell: ({ row }) => row.original.approved_at
			? new Date(row.original.approved_at).toLocaleDateString()
			: '-',
	},
	{
		accessorKey: 'paid_at',
		header: () => i18n.t('Paid'),
		cell: ({ row }) => row.original.paid_at
			? new Date(row.original.paid_at).toLocaleDateString()
			: '-',
	},
];


export const AdvertiserCampaignTermsColumns: ColumnDef<any>[] = [
	{
		accessorKey: 'description',
		header: () => i18n.t('Description'),
		cell: ({ row }) => row.getValue('description'),
	},
	{
		accessorKey: 'created_at',
		header: () => i18n.t('Created At'),
		cell: ({ row }) => new Date(row.getValue('created_at')).toLocaleDateString(),
	},
];


export const NetworkInvoiceColumns: ColumnDef<any>[] = [
	{
		accessorKey: 'invoice_number',
		header: t('Invoice #'),
		cell: ({ row }) => (
			<span className="font-mono font-semibold">{row.original.invoice_number}</span>
		),
	},
	{
		accessorKey: 'created_at',
		header: t('Date'),
		cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
	},
	{
		accessorKey: 'amount',
		header: t('Amount'),
		cell: ({ row }) => (
			<span className="font-semibold text-green-600">
				{formatCurrency(parseFloat(row.original.amount), 'USD')}
			</span>
		),
	},
	{
		accessorKey: 'status',
		header: t('Status'),
		cell: ({ row }) => <StatusBadge status={row.original.status} />,
	},
	{
		accessorKey: 'paid_at',
		header: t('Paid'),
		cell: ({ row }) => row.original.paid_at
			? new Date(row.original.paid_at).toLocaleDateString()
			: '-',
	},
];