import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnsType } from "antd/es/table";
import { Table } from "antd";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import apiClient from "@/api/apiClient";
import { useUserRoles } from "@/store/userStore";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/form";
import { Input } from "@/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";

type ClientRow = {
	id: string;
	clientName: string;
	tenantId: string;
	status: "Active" | "Inactive";
	createdAt: string;
};

type ClientApiItem = {
	_id: string;
	name: string;
	tenantId: string;
	isActive: boolean;
	createdAt?: string;
	updatedAt?: string;
};

type ClientsResponse = {
	statusCode?: number;
	message?: string;
	data?: ClientApiItem[];
};

type ClientOnboardPayload = {
	clientName: string;
	ownerName: string;
	ownerEmail: string;
	ownerPassword: string;
	ownerRoleId: string;
};

type ClientOnboardResponse = {
	statusCode?: number;
	accessToken?: string;
	user?: unknown;
	client?: unknown;
};

type RoleApiItem = {
	_id?: string;
	id?: string;
	name: string;
	description?: string;
	isActive?: boolean;
};

type RolesResponse = {
	statusCode?: number;
	message?: string;
	data?: { roles?: RoleApiItem[] };
	roles?: RoleApiItem[];
};

const DEFAULT_FORM_VALUES: ClientOnboardPayload = {
	clientName: "",
	ownerName: "",
	ownerEmail: "",
	ownerPassword: "",
	ownerRoleId: "",
};

const formatDate = (value?: string) => (value ? value.slice(0, 10) : "-");

const extractClients = (response: ClientsResponse | ClientApiItem[] | undefined) => {
	if (Array.isArray(response)) {
		return response;
	}
	if (response && typeof response === "object" && "data" in response && Array.isArray(response.data)) {
		return response.data;
	}
	return [];
};

const mapClientRows = (items: ClientApiItem[]): ClientRow[] =>
	items.map((item) => ({
		id: item._id,
		clientName: item.name,
		tenantId: item.tenantId,
		status: item.isActive ? "Active" : "Inactive",
		createdAt: formatDate(item.createdAt),
	}));

export default function ClientsPage() {
	const [open, setOpen] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [clients, setClients] = useState<ClientRow[]>([]);
	const [availableRoles, setAvailableRoles] = useState<RoleApiItem[]>([]);
	const [rolesLoading, setRolesLoading] = useState(false);
	const userRoles = useUserRoles();
	// Only consider user as SuperAdmin if roles are loaded AND user has SUPERADMIN role
	const rolesLoaded = userRoles.length > 0;
	const isSuperAdmin =
		rolesLoaded && userRoles.some((role) => role.code === "SUPERADMIN" || role.name === "SUPERADMIN");
	const form = useForm<ClientOnboardPayload>({
		defaultValues: DEFAULT_FORM_VALUES,
	});

	const fetchClients = useCallback(async () => {
		try {
			const response = await apiClient.get<ClientsResponse | ClientApiItem[]>({
				url: "/clients",
			});
			const items = extractClients(response);
			setClients(mapClientRows(items));
		} catch (_error) {
			// Errors are already surfaced via the API client interceptor.
		}
	}, []);

	const fetchRoles = useCallback(async () => {
		setRolesLoading(true);
		try {
			const response = await apiClient.get<RolesResponse>({
				url: "/roles",
			});
			const rolesData = response.data?.roles || response.roles || [];
			setAvailableRoles(rolesData);
		} catch (error) {
			console.error(error);
			toast.error("Failed to load roles", { position: "top-center" });
		} finally {
			setRolesLoading(false);
		}
	}, []);

	useEffect(() => {
		// Only fetch if roles are loaded and user is confirmed SUPERADMIN
		if (!rolesLoaded || !isSuperAdmin) {
			return;
		}
		void fetchClients();
		void fetchRoles();
	}, [fetchClients, fetchRoles, rolesLoaded, isSuperAdmin]);

	const handleOpen = () => {
		form.reset(DEFAULT_FORM_VALUES);
		setOpen(true);
	};

	const handleClose = () => {
		setOpen(false);
	};

	const columns = useMemo<ColumnsType<ClientRow>>(
		() => [
			{
				title: "Client",
				dataIndex: "clientName",
				key: "clientName",
				width: 220,
				sorter: (a, b) => a.clientName.localeCompare(b.clientName),
			},
			{
				title: "Tenant ID",
				dataIndex: "tenantId",
				key: "tenantId",
				width: 320,
			},
			{
				title: "Status",
				dataIndex: "status",
				key: "status",
				width: 120,
				render: (status: ClientRow["status"]) => (
					<Badge variant={status === "Active" ? "success" : "warning"}>{status}</Badge>
				),
			},
			{
				title: "Created",
				dataIndex: "createdAt",
				key: "createdAt",
				width: 140,
				sorter: (a, b) => a.createdAt.localeCompare(b.createdAt),
			},
		],
		[],
	);

	const handleOnboard = async (values: ClientOnboardPayload) => {
		setSubmitting(true);
		try {
			await apiClient.post<ClientOnboardResponse>({
				url: "/auth/onboard",
				data: values,
			});
			// If we get here without throwing, the request succeeded
			toast.success("CLIENT ONBOARDED", { position: "top-center" });
			setOpen(false);
			await fetchClients();
		} catch (_error) {
			// Errors are already surfaced via the API client interceptor.
		} finally {
			setSubmitting(false);
		}
	};

	// Show loading state while roles are being loaded
	if (!rolesLoaded) {
		return (
			<Card>
				<CardHeader>
					<div className="text-lg font-semibold">Clients</div>
				</CardHeader>
				<CardContent>
					<div className="text-sm text-muted-foreground">Loading...</div>
				</CardContent>
			</Card>
		);
	}

	// Show message for non-superadmin users
	if (!isSuperAdmin) {
		return (
			<Card>
				<CardHeader>
					<div className="text-lg font-semibold">Clients</div>
				</CardHeader>
				<CardContent>
					<div className="text-sm text-muted-foreground">Clients are managed by administrators.</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div className="text-lg font-semibold">Clients</div>
					<Button onClick={handleOpen}>Add Clients</Button>
				</div>
			</CardHeader>
			<CardContent>
				<Table
					rowKey="id"
					size="small"
					scroll={{ x: "max-content" }}
					pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: [10, 25, 50] }}
					columns={columns}
					dataSource={clients}
				/>
			</CardContent>

			<Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Onboard Client</DialogTitle>
					</DialogHeader>
					<Form {...form}>
						<form className="space-y-4" onSubmit={form.handleSubmit(handleOnboard)}>
							<FormField
								control={form.control}
								name="clientName"
								rules={{ required: "Client name is required" }}
								render={({ field }) => (
									<FormItem>
										<FormLabel>Client Name</FormLabel>
										<FormControl>
											<Input {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="ownerName"
								rules={{ required: "Owner name is required" }}
								render={({ field }) => (
									<FormItem>
										<FormLabel>Owner Name</FormLabel>
										<FormControl>
											<Input {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="ownerEmail"
								rules={{ required: "Owner email is required" }}
								render={({ field }) => (
									<FormItem>
										<FormLabel>Owner Email</FormLabel>
										<FormControl>
											<Input type="email" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="ownerPassword"
								rules={{ required: "Owner password is required" }}
								render={({ field }) => (
									<FormItem>
										<FormLabel>Owner Password</FormLabel>
										<FormControl>
											<Input type="password" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="ownerRoleId"
								rules={{ required: "Owner role is required" }}
								render={({ field }) => (
									<FormItem>
										<FormLabel>Owner Role</FormLabel>
										<FormControl>
											<Select value={field.value} onValueChange={field.onChange} disabled={rolesLoading}>
												<SelectTrigger>
													<SelectValue placeholder={rolesLoading ? "Loading roles..." : "Select role"} />
												</SelectTrigger>
												<SelectContent>
													{availableRoles
														.filter((r) => r.name === "OWNER")
														.map((role) => (
															<SelectItem key={role._id || role.id} value={role._id || role.id || ""}>
																{role.name}
															</SelectItem>
														))}
												</SelectContent>
											</Select>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<DialogFooter>
								<Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
									Cancel
								</Button>
								<Button type="submit" disabled={submitting}>
									Onboard Client
								</Button>
							</DialogFooter>
						</form>
					</Form>
				</DialogContent>
			</Dialog>
		</Card>
	);
}
