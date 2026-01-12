import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnsType } from "antd/es/table";
import { Table } from "antd";
import { useParams } from "react-router";
import { toast } from "sonner";
import { useFieldArray, useForm } from "react-hook-form";

import apiClient from "@/api/apiClient";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/ui/form";
import { Input } from "@/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Switch } from "@/ui/switch";
import { fBytes } from "@/utils/format-number";

type AssetField = {
	key: string;
	type: string;
	value: string;
};

type AssetFile = {
	id?: string;
	filename?: string;
	originalName?: string;
	relativePath?: string;
	url?: string;
	size?: number;
	mimeType?: string;
	uploadedBy?: string;
	uploadedAt?: string;
};

type ShowroomAssetApiItem = {
	id?: string;
	_id?: string;
	name: string;
	type: string;
	tags?: string[];
	fields?: AssetField[];
	files?: AssetFile[];
	createdAt?: string;
	updatedAt?: string;
};

type ShowroomAssetsResponse = {
	statusCode?: number;
	message?: string;
	data?: {
		assets?: ShowroomAssetApiItem[];
	};
	assets?: ShowroomAssetApiItem[];
};

type TextAssetRow = {
	id: string;
	name: string;
	type: string;
	tags: string[];
	fields: AssetField[];
	lastUpdated: string;
	createdAt?: string;
};

type FileAssetRow = {
	id: string;
	name: string;
	type: string;
	tags: string[];
	fileCount: number;
	totalSize: string;
	lastUpdated: string;
};

type ShowroomAssetFormValues = {
	name: string;
	type: string;
	fields: AssetField[];
};

const EMPTY_FIELD: AssetField = { key: "", type: "TEXT", value: "" };

const DEFAULT_FORM_VALUES: ShowroomAssetFormValues = {
	name: "",
	type: "",
	fields: [EMPTY_FIELD],
};

const extractShowroomAssets = (response: ShowroomAssetsResponse | ShowroomAssetApiItem[] | undefined) => {
	if (Array.isArray(response)) {
		return response;
	}
	if (response && typeof response === "object") {
		if ("data" in response && response.data && Array.isArray(response.data.assets)) {
			return response.data.assets;
		}
		if ("assets" in response && Array.isArray(response.assets)) {
			return response.assets;
		}
	}
	return [];
};

const createFallbackId = () => Math.random().toString(36).slice(2, 10);

const formatDate = (value?: string) => {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toISOString().slice(0, 10);
};

const mapTextAsset = (asset: ShowroomAssetApiItem): TextAssetRow => ({
	id: asset.id ?? asset._id ?? createFallbackId(),
	name: asset.name,
	type: asset.type,
	tags: asset.tags ?? [],
	fields: asset.fields ?? [],
	createdAt: asset.createdAt,
	lastUpdated: asset.updatedAt ?? asset.createdAt ?? "-",
});

const mapFileAsset = (asset: ShowroomAssetApiItem): FileAssetRow => {
	const files = asset.files ?? [];
	const totalSizeValue = files.reduce((sum, file) => sum + (file.size ?? 0), 0);
	return {
		id: asset.id ?? asset._id ?? createFallbackId(),
		name: asset.name,
		type: asset.type,
		tags: asset.tags ?? [],
		fileCount: files.length,
		totalSize: totalSizeValue ? fBytes(totalSizeValue) : "-",
		lastUpdated: asset.updatedAt ?? asset.createdAt ?? "-",
	};
};

const buildPayload = (values: ShowroomAssetFormValues) => ({
	name: values.name.trim(),
	type: values.type.trim(),
	fields: values.fields
		.filter((field) => field.key.trim() || field.value.trim())
		.map((field) => ({
			key: field.key.trim(),
			type: field.type.trim(),
			value: field.value.trim(),
		})),
});

export default function ShowroomAssetsPage() {
	const { showroomId } = useParams();
	const [textAssets, setTextAssets] = useState<TextAssetRow[]>([]);
	const [fileAssets, setFileAssets] = useState<FileAssetRow[]>([]);
	const [assetView, setAssetView] = useState<"TEXT" | "FILE">("TEXT");
	const [searchQuery, setSearchQuery] = useState("");
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const form = useForm<ShowroomAssetFormValues>({
		defaultValues: DEFAULT_FORM_VALUES,
	});
	const fieldsArray = useFieldArray({
		control: form.control,
		name: "fields",
	});

	const fetchAssets = useCallback(async () => {
		if (!showroomId) {
			return;
		}
		setIsLoading(true);
		try {
			const response = await apiClient.get<ShowroomAssetsResponse | ShowroomAssetApiItem[]>({
				url: `/showrooms/${showroomId}/assets`,
			});
			const assets = extractShowroomAssets(response);
			setTextAssets(assets.filter((asset) => (asset.files ?? []).length === 0).map(mapTextAsset));
			setFileAssets(assets.filter((asset) => (asset.files ?? []).length > 0).map(mapFileAsset));
		} catch (error) {
			console.error(error);
			toast.error("Failed to load showroom assets", { position: "top-center" });
		} finally {
			setIsLoading(false);
		}
	}, [showroomId]);

	useEffect(() => {
		void fetchAssets();
	}, [fetchAssets]);

	const handleAddField = () => {
		fieldsArray.append({ ...EMPTY_FIELD });
	};

	const handleRemoveField = (index: number) => {
		if (fieldsArray.fields.length > 1) {
			fieldsArray.remove(index);
		}
	};

	const handleSubmit = async (values: ShowroomAssetFormValues) => {
		if (!showroomId) {
			toast.error("Showroom is missing. Please go back and try again.", { position: "top-center" });
			return;
		}
		setIsSubmitting(true);
		try {
			const payload = buildPayload(values);
			await apiClient.post({
				url: `/showrooms/${showroomId}/assets`,
				data: payload,
			});
			toast.success("Showroom asset created", { position: "top-center" });
			form.reset(DEFAULT_FORM_VALUES);
			setIsDialogOpen(false);
			await fetchAssets();
		} catch (error) {
			console.error(error);
			toast.error("Failed to create showroom asset", { position: "top-center" });
		} finally {
			setIsSubmitting(false);
		}
	};

	const normalizedSearch = searchQuery.trim().toLowerCase();
	const filteredTextAssets = useMemo(() => {
		if (!normalizedSearch) return textAssets;
		return textAssets.filter((asset) => {
			const fieldsMatch =
				asset.fields?.some((field) =>
					`${field.key} ${field.type} ${field.value}`.toLowerCase().includes(normalizedSearch),
				) ?? false;
			const tagsMatch = asset.tags?.some((tag) => tag.toLowerCase().includes(normalizedSearch)) ?? false;
			return (
				asset.name.toLowerCase().includes(normalizedSearch) ||
				asset.type.toLowerCase().includes(normalizedSearch) ||
				fieldsMatch ||
				tagsMatch
			);
		});
	}, [normalizedSearch, textAssets]);

	const filteredFileAssets = useMemo(() => {
		if (!normalizedSearch) return fileAssets;
		return fileAssets.filter((asset) => {
			const tagsMatch = asset.tags?.some((tag) => tag.toLowerCase().includes(normalizedSearch)) ?? false;
			return (
				asset.name.toLowerCase().includes(normalizedSearch) ||
				asset.type.toLowerCase().includes(normalizedSearch) ||
				tagsMatch
			);
		});
	}, [normalizedSearch, fileAssets]);

	const totalAssets = assetView === "TEXT" ? textAssets.length : fileAssets.length;
	const visibleAssets = assetView === "TEXT" ? filteredTextAssets.length : filteredFileAssets.length;

	const textColumns = useMemo<ColumnsType<TextAssetRow>>(
		() => [
			{
				title: "Asset",
				dataIndex: "name",
				key: "name",
				width: 240,
				sorter: (a, b) => a.name.localeCompare(b.name),
				render: (_: string, record: TextAssetRow) => (
					<div className="space-y-1">
						<div className="text-sm font-semibold text-foreground">{record.name}</div>
						<div className="text-xs text-muted-foreground">ID: {record.id}</div>
					</div>
				),
			},
			{
				title: "Type",
				dataIndex: "type",
				key: "type",
				width: 160,
				sorter: (a, b) => a.type.localeCompare(b.type),
			},
			{
				title: "Tags",
				dataIndex: "tags",
				key: "tags",
				width: 220,
				render: (tags: string[]) => (
					<div className="flex flex-wrap gap-2">
						{tags.length ? (
							tags.map((tag) => (
								<Badge key={tag} variant="secondary">
									{tag}
								</Badge>
							))
						) : (
							<span className="text-xs text-muted-foreground">No tags</span>
						)}
					</div>
				),
			},
			{
				title: "Fields",
				dataIndex: "fields",
				key: "fields",
				width: 320,
				render: (fields: AssetField[]) => (
					<div className="space-y-2 text-xs text-muted-foreground">
						<div className="flex items-center justify-between">
							<span>{fields.length} fields</span>
							<span className="text-[10px] uppercase tracking-wide text-muted-foreground">Preview</span>
						</div>
						<div className="space-y-1">
							{fields.map((field, index) => (
								<div key={`${field.key}-${field.type}-${index}`} className="flex items-center justify-between gap-3">
									<span className="truncate text-foreground">{field.key || "Untitled"}</span>
									<span className="truncate">{field.value || "-"}</span>
								</div>
							))}
						</div>
					</div>
				),
			},
			{
				title: "Updated",
				dataIndex: "lastUpdated",
				key: "lastUpdated",
				width: 140,
				sorter: (a, b) => new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime(),
				render: (value: string) => <span className="text-xs text-muted-foreground">{formatDate(value)}</span>,
			},
		],
		[],
	);

	const fileColumns = useMemo<ColumnsType<FileAssetRow>>(
		() => [
			{
				title: "Name",
				dataIndex: "name",
				key: "name",
				width: 220,
				sorter: (a, b) => a.name.localeCompare(b.name),
			},
			{
				title: "Type",
				dataIndex: "type",
				key: "type",
				width: 120,
				sorter: (a, b) => a.type.localeCompare(b.type),
			},
			{
				title: "Tags",
				dataIndex: "tags",
				key: "tags",
				width: 220,
				render: (tags: string[]) => (
					<div className="flex flex-wrap gap-2">
						{tags.length ? (
							tags.map((tag) => (
								<Badge key={tag} variant="secondary">
									{tag}
								</Badge>
							))
						) : (
							<span className="text-xs text-muted-foreground">No tags</span>
						)}
					</div>
				),
			},
			{
				title: "Files",
				dataIndex: "fileCount",
				key: "fileCount",
				width: 120,
			},
			{
				title: "Total size",
				dataIndex: "totalSize",
				key: "totalSize",
				width: 140,
			},
			{
				title: "Updated",
				dataIndex: "lastUpdated",
				key: "lastUpdated",
				width: 140,
				sorter: (a, b) => new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime(),
				render: (value: string) => <span className="text-xs text-muted-foreground">{formatDate(value)}</span>,
			},
		],
		[],
	);

	return (
		<div className="flex flex-col gap-6">
			<Card>
				<CardHeader>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<div className="text-lg font-semibold">Showroom Assets</div>
							<div className="text-sm text-muted-foreground">
								Showing assets for showroom: <span className="font-medium text-foreground">{showroomId ?? "-"}</span>
							</div>
						</div>
						<Button type="button" onClick={() => setIsDialogOpen(true)}>
							Add Asset
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					<div className="flex flex-wrap items-center justify-between gap-4">
						<div className="flex flex-wrap items-center gap-3">
							<span className="text-sm font-medium text-muted-foreground">Show assets</span>
							<div className="flex items-center gap-2 rounded-full border px-3 py-1.5">
								<span className={assetView === "TEXT" ? "text-sm font-semibold" : "text-sm text-muted-foreground"}>
									Text
								</span>
								<Switch
									checked={assetView === "FILE"}
									onCheckedChange={(checked) => setAssetView(checked ? "FILE" : "TEXT")}
								/>
								<span className={assetView === "FILE" ? "text-sm font-semibold" : "text-sm text-muted-foreground"}>
									File
								</span>
							</div>
							<div className="text-xs text-muted-foreground">
								Showing {visibleAssets} of {totalAssets}
							</div>
						</div>
						<div className="w-full sm:w-[280px]">
							<Input
								placeholder="Search assets..."
								value={searchQuery}
								onChange={(event) => setSearchQuery(event.target.value)}
							/>
						</div>
					</div>
					<div className="mt-4 rounded-lg border bg-background/40 p-2 shadow-sm">
						{assetView === "TEXT" ? (
							<Table<TextAssetRow>
								rowKey="id"
								size="middle"
								scroll={{ x: "max-content" }}
								pagination={{ pageSize: 8, showSizeChanger: true }}
								loading={isLoading}
								locale={{ emptyText: showroomId ? "No assets found" : "Missing showroom ID" }}
								columns={textColumns}
								dataSource={filteredTextAssets}
								bordered
								rowClassName={() => "hover:bg-muted/40"}
							/>
						) : (
							<Table<FileAssetRow>
								rowKey="id"
								size="middle"
								scroll={{ x: "max-content" }}
								pagination={{ pageSize: 8, showSizeChanger: true }}
								loading={isLoading}
								locale={{ emptyText: showroomId ? "No assets found" : "Missing showroom ID" }}
								columns={fileColumns}
								dataSource={filteredFileAssets}
								bordered
								rowClassName={() => "hover:bg-muted/40"}
							/>
						)}
					</div>
				</CardContent>
			</Card>
			<Dialog
				open={isDialogOpen}
				onOpenChange={(open) => {
					setIsDialogOpen(open);
					if (!open) {
						form.reset(DEFAULT_FORM_VALUES);
					}
				}}
			>
				<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
					<DialogHeader>
						<DialogTitle>Add showroom asset</DialogTitle>
					</DialogHeader>
					<Form {...form}>
						<form className="space-y-6" onSubmit={form.handleSubmit(handleSubmit)}>
							<div className="grid gap-4 md:grid-cols-2">
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Asset Name</FormLabel>
											<FormControl>
												<Input placeholder="Canva Design Link" {...field} />
											</FormControl>
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="type"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Asset Type</FormLabel>
											<FormControl>
												<Input placeholder="LINKS" {...field} />
											</FormControl>
										</FormItem>
									)}
								/>
							</div>
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<div className="text-sm font-semibold">Fields</div>
									<Button type="button" variant="outline" size="sm" onClick={handleAddField}>
										Add Field
									</Button>
								</div>
								<div className="space-y-4">
									{fieldsArray.fields.map((fieldItem, index) => (
										<div
											key={fieldItem.id}
											className="grid gap-4 rounded-md border p-4 md:grid-cols-[1.3fr_1fr_1.3fr_auto]"
										>
											<FormField
												control={form.control}
												name={`fields.${index}.key`}
												render={({ field }) => (
													<FormItem>
														<FormLabel>Key</FormLabel>
														<FormControl>
															<Input placeholder="url" {...field} />
														</FormControl>
													</FormItem>
												)}
											/>
											<FormField
												control={form.control}
												name={`fields.${index}.type`}
												render={({ field }) => (
													<FormItem>
														<FormLabel>Type</FormLabel>
														<FormControl>
															<Select value={field.value} onValueChange={field.onChange}>
																<SelectTrigger>
																	<SelectValue placeholder="Select type" />
																</SelectTrigger>
																<SelectContent>
																	<SelectItem value="TEXT">TEXT</SelectItem>
																	<SelectItem value="URL">URL</SelectItem>
																	<SelectItem value="TOKEN">TOKEN</SelectItem>
																	<SelectItem value="USERNAME">USERNAME</SelectItem>
																	<SelectItem value="PASSWORD">PASSWORD</SelectItem>
																</SelectContent>
															</Select>
														</FormControl>
													</FormItem>
												)}
											/>
											<FormField
												control={form.control}
												name={`fields.${index}.value`}
												render={({ field }) => (
													<FormItem>
														<FormLabel>Value</FormLabel>
														<FormControl>
															<Input placeholder="https://canva.com/design/123" {...field} />
														</FormControl>
													</FormItem>
												)}
											/>
											<div className="flex items-end">
												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={() => handleRemoveField(index)}
													disabled={fieldsArray.fields.length === 1}
												>
													Remove
												</Button>
											</div>
										</div>
									))}
								</div>
							</div>
							<DialogFooter className="flex flex-wrap justify-end gap-2">
								<Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
									Cancel
								</Button>
								<Button type="submit" disabled={isSubmitting}>
									{isSubmitting ? "Saving..." : "Save Asset"}
								</Button>
							</DialogFooter>
						</form>
					</Form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
