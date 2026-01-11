import { useEffect, useMemo, useState } from "react";
import type { ColumnsType } from "antd/es/table";
import { Table } from "antd";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import apiClient from "@/api/apiClient";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/form";
import { Input } from "@/ui/input";

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

const DEFAULT_FORM_VALUES: ClientOnboardPayload = {
	clientName: "Demo Client",
	ownerName: "Owner User",
	ownerEmail: "yusufihusnain0@gmail.com",
	ownerPassword: "ChangeMe123!",
	ownerRoleId: "6962c89d8e3ba79bd65d1fdd",
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
	const form = useForm<ClientOnboardPayload>({
		defaultValues: DEFAULT_FORM_VALUES,
	});

	const columns = useMemo<ColumnsType<ClientRow>>(
		() => [
			{
				title: "Client",
				dataIndex: "clientName",
				key: "clientName",
				width: 220,
			},
			{
				title: "Tenant ID",
				dataIndex: "tenantId",
				key: "tenantId",
				width: 280,
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
			},
		],
		[],
	);

	const fetchClients = async () => {
		try {
			const response = await apiClient.get<ClientsResponse | ClientApiItem[]>({
				url: "/clients",
			});
			const items = extractClients(response);
			setClients(mapClientRows(items));
		} catch (error) {
			// Errors are already surfaced via the API client interceptor.
		}
	};

	useEffect(() => {
		void fetchClients();
	}, []);

	const handleOpen = () => {
		form.reset(DEFAULT_FORM_VALUES);
		setOpen(true);
	};

	const handleClose = () => {
		setOpen(false);
	};

	const handleOnboard = async (values: ClientOnboardPayload) => {
		setSubmitting(true);
		try {
			const response = await apiClient.post<ClientOnboardResponse>({
				url: "/auth/onboard",
				data: values,
			});

			const isSuccess =
				response &&
				typeof response === "object" &&
				("accessToken" in response ||
					"user" in response ||
					"client" in response ||
					("statusCode" in response && response.statusCode === 200));

			if (isSuccess) {
				toast.success("CLIENT ONBOARDED", { position: "top-center" });
				setOpen(false);
				await fetchClients();
			} else {
				toast.error("Client onboarding failed", { position: "top-center" });
			}
		} catch (error) {
			// Errors are already surfaced via the API client interceptor.
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div className="text-lg font-semibold">Clients</div>
					<Button onClick={handleOpen}>Add Clients</Button>
				</div>
			</CardHeader>
			<CardContent>
				<Table rowKey="id" size="small" scroll={{ x: "max-content" }} pagination={false} columns={columns} dataSource={clients} />
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
								rules={{ required: "Owner role ID is required" }}
								render={({ field }) => (
									<FormItem>
										<FormLabel>Owner Role ID</FormLabel>
										<FormControl>
											<Input {...field} />
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
