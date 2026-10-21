import { TPermissions, TRoles } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";

export const RolesColumns: ColumnDef<TRoles>[] = [
	{
		accessorKey: "name",
		header: () => <div>Role Name</div>,
		cell: ({ row }) => {
			const name: string = row.getValue("name");
			return <div>{name}</div>;
		},
	},
	{
		accessorKey: "created_at",
		header: () => <div>Date Created</div>,
		cell: ({ row }) => {
			const created_at: string = row.getValue("created_at");
			return (
				<div className="text-gray-600 max-w-md truncate">
					{new Date(created_at).toLocaleDateString("en-GB")}
				</div>
			);
		},
	},
	{
		id: "action",
		header: () => <div>Action</div>,
		cell: ({ row }) => (
			<div className="flex items-center gap-2">
				<button
					className="p-1 hover:bg-gray-100 rounded"
					onClick={() => console.log("Edit:", row.original)}>
					<Pencil className="w-4 h-4 text-gray-600" />
				</button>
				<button
					className="p-1 hover:bg-gray-100 rounded"
					onClick={() => console.log("Delete:", row.original)}>
					<Trash2 className="w-4 h-4 text-gray-600" />
				</button>
			</div>
		),
	},
];

export const PermissionsColumns: ColumnDef<TPermissions>[] = [
	{
		accessorKey: "name",
		header: () => <div>Pernission</div>,
		cell: ({ row }) => {
			const name: string = row.getValue("name");
			return <div>{name}</div>;
		},
	},
	{
		accessorKey: "created_at",
		header: () => <div>Date Created</div>,
		cell: ({ row }) => {
			const created_at: string = row.getValue("created_at");
			return (
				<div className="text-gray-600 max-w-md truncate">
					{new Date(created_at).toLocaleDateString("en-GB")}
				</div>
			);
		},
	},
	{
		id: "action",
		header: () => <div>Action</div>,
		cell: ({ row }) => (
			<div className="flex items-center gap-2">
				<button
					className="p-1 hover:bg-gray-100 rounded"
					onClick={() => console.log("Edit:", row.original)}>
					<Pencil className="w-4 h-4 text-gray-600" />
				</button>
				<button
					className="p-1 hover:bg-gray-100 rounded"
					onClick={() => console.log("Delete:", row.original)}>
					<Trash2 className="w-4 h-4 text-gray-600" />
				</button>
			</div>
		),
	},
];

export const NetworksColumns: ColumnDef<TRoles>[] = [
	{
		accessorKey: "name",
		header: () => <div>Pernission</div>,
		cell: ({ row }) => {
			const name: string = row.getValue("name");
			return <div>{name}</div>;
		},
	},
	{
		accessorKey: "created_at",
		header: () => <div>Date Created</div>,
		cell: ({ row }) => {
			const created_at: string = row.getValue("created_at");
			return (
				<div className="text-gray-600 max-w-md truncate">
					{new Date(created_at).toLocaleDateString("en-GB")}
				</div>
			);
		},
	},
	{
		id: "action",
		header: () => <div>Action</div>,
		cell: ({ row }) => (
			<div className="flex items-center gap-2">
				<button
					className="p-1 hover:bg-gray-100 rounded"
					onClick={() => console.log("Edit:", row.original)}>
					<Pencil className="w-4 h-4 text-gray-600" />
				</button>
				<button
					className="p-1 hover:bg-gray-100 rounded"
					onClick={() => console.log("Delete:", row.original)}>
					<Trash2 className="w-4 h-4 text-gray-600" />
				</button>
			</div>
		),
	},
];


