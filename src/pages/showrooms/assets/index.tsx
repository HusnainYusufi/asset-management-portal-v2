import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnsType } from "antd/es/table";
import type { UploadChangeParam, UploadFile } from "antd/es/upload/interface";
import { Table, Upload } from "antd";
import { useParams } from "react-router";
import { toast } from "sonner";
import { useFieldArray, useForm } from "react-hook-form";
import { Eye, EyeOff, Copy, Check, ExternalLink, Download, Image as ImageIcon, Trash2, Search } from "lucide-react";

import apiClient from "@/api/apiClient";
import { GLOBAL_CONFIG } from "@/global-config";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/ui/form";
import { Input } from "@/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Switch } from "@/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { DatePicker } from "@/ui/date-picker";
import { Label } from "@/ui/label";
import { fBytes } from "@/utils/format-number";

type AssetField = {
	key: string;
	type: string;
	value: string;
	isSecret?: boolean;
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
	description?: string;
	type: string;
	tags?: string[];
	fields?: AssetField[];
	files?: AssetFile[];
	createdAt?: string;
	updatedAt?: string;
	expirationDate?: string;
	expirationNotificationsEnabled?: boolean;
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
	description?: string;
	type: string;
	tags: string[];
	fields: AssetField[];
	lastUpdated: string;
	createdAt?: string;
};

type FileAssetRow = {
	id: string;
	name: string;
	description?: string;
	type: string;
	tags: string[];
	fileCount: number;
	totalSize: string;
	files: AssetFile[];
	lastUpdated: string;
};

type ShowroomAssetFormValues = {
	name: string;
	description: string;
	type: string;
	tags: string;
	assetKind: "TEXT" | "FILE";
	fields: AssetField[];
	expirationDate?: Date;
	expirationNotificationsEnabled: boolean;
};

const EMPTY_FIELD: AssetField = { key: "", type: "TEXT", value: "", isSecret: false };

const DEFAULT_FORM_VALUES: ShowroomAssetFormValues = {
	name: "",
	description: "",
	type: "GENERAL",
	tags: "",
	assetKind: "TEXT",
	fields: [EMPTY_FIELD],
	expirationDate: undefined,
	expirationNotificationsEnabled: false,
};

const extractShowroomAssets = (response: unknown): ShowroomAssetApiItem[] => {
	if (!response) return [];
	if (Array.isArray(response)) return response as ShowroomAssetApiItem[];

	const resp = response as ShowroomAssetsResponse;

	// Handle wrapped response { data: { assets: [...] } }
	if (resp.data?.assets && Array.isArray(resp.data.assets)) {
		return resp.data.assets;
	}

	// Handle unwrapped response { assets: [...] }
	if (resp.assets && Array.isArray(resp.assets)) {
		return resp.assets;
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
	description: asset.description,
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
		description: asset.description,
		type: asset.type,
		tags: asset.tags ?? [],
		fileCount: files.length,
		totalSize: totalSizeValue ? fBytes(totalSizeValue) : "-",
		files,
		lastUpdated: asset.updatedAt ?? asset.createdAt ?? "-",
	};
};

const buildFileUrl = (file: AssetFile) => {
	if (file.url) {
		if (file.url.startsWith("http://") || file.url.startsWith("https://")) return file.url;
		const baseUrl = GLOBAL_CONFIG.apiBaseUrl?.replace(/\/$/, "") || "";
		const relativeUrl = file.url.startsWith("/") ? file.url : `/${file.url}`;
		return `${baseUrl}${relativeUrl}`;
	}
	if (!file.relativePath) return "";
	const baseUrl = GLOBAL_CONFIG.apiBaseUrl?.replace(/\/$/, "") || "";
	const relativePath = file.relativePath.startsWith("/") ? file.relativePath : `/${file.relativePath}`;
	return `${baseUrl}${relativePath}`;
};

const buildPayload = (values: ShowroomAssetFormValues) => {
	const payload: Record<string, unknown> = {
		name: values.name.trim(),
		description: values.description.trim(),
		type: values.type.trim(),
		tags: values.tags
			.split(",")
			.map((tag) => tag.trim())
			.filter(Boolean),
		fields: values.fields
			.filter((field) => field.key.trim() || field.value.trim())
			.map((field) => ({
				key: field.key.trim(),
				type: field.type.trim(),
				value: field.value.trim(),
				isSecret: !!field.isSecret,
			})),
	};

	// Only include expiration fields when notifications are enabled
	if (values.expirationNotificationsEnabled) {
		payload.expirationNotificationsEnabled = true;
		if (values.expirationDate) {
			payload.expirationDate = values.expirationDate.toISOString();
		}
	}

	return payload;
};

export default function ShowroomAssetsPage() {
	const { showroomId } = useParams();
	const [textAssets, setTextAssets] = useState<TextAssetRow[]>([]);
	const [fileAssets, setFileAssets] = useState<FileAssetRow[]>([]);
	const [assetView, setAssetView] = useState<"TEXT" | "FILE">("TEXT");
	const [searchQuery, setSearchQuery] = useState("");
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editMode, setEditMode] = useState<{ id: string; name: string } | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<TextAssetRow | FileAssetRow | null>(null);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [uploadTarget, setUploadTarget] = useState<TextAssetRow | FileAssetRow | null>(null);
	const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
	const [fileList, setFileList] = useState<UploadFile[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
	const [viewAsset, setViewAsset] = useState<ShowroomAssetApiItem | null>(null);
	const [viewMode, setViewMode] = useState<"DETAILS" | "GALLERY">("DETAILS");
	const [revealedFields, setRevealedFields] = useState<Record<string, boolean>>({});
	const [copiedField, setCopiedField] = useState<string | null>(null);
	const [gallerySearch, setGallerySearch] = useState("");
	const form = useForm<ShowroomAssetFormValues>({
		defaultValues: DEFAULT_FORM_VALUES,
	});
	const fieldsArray = useFieldArray({
		control: form.control,
		name: "fields",
	});
	const assetKind = form.watch("assetKind");
	const [createUploadFiles, setCreateUploadFiles] = useState<UploadFile[]>([]);

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

	const handleViewAsset = useCallback(
		async (asset: TextAssetRow | FileAssetRow, initialViewMode: "DETAILS" | "GALLERY" = "DETAILS") => {
			if (!showroomId) return;
			try {
				const response = await apiClient.get<Record<string, unknown>>({
					url: `/showrooms/${showroomId}/assets/${asset.id}`,
				});
				const resp = response as { asset?: ShowroomAssetApiItem; data?: { asset?: ShowroomAssetApiItem } };
				const assetData = resp.asset ?? resp.data?.asset ?? (response as unknown as ShowroomAssetApiItem);
				setViewAsset(assetData);
				setViewMode(initialViewMode);
				setRevealedFields({});
				setIsViewDialogOpen(true);
			} catch (error) {
				console.error(error);
				toast.error("Failed to load asset details", { position: "top-center" });
			}
		},
		[showroomId],
	);

	const handleToggleReveal = (fieldKey: string) => {
		setRevealedFields((prev) => ({
			...prev,
			[fieldKey]: !prev[fieldKey],
		}));
	};

	const handleCopy = async (value: string, fieldKey: string) => {
		try {
			await navigator.clipboard.writeText(value);
			setCopiedField(fieldKey);
			toast.success("Copied to clipboard", { position: "top-center" });
			setTimeout(() => setCopiedField(null), 2000);
		} catch (error) {
			console.error(error);
			toast.error("Failed to copy", { position: "top-center" });
		}
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
			if (editMode) {
				await apiClient.patch({
					url: `/showrooms/${showroomId}/assets/${editMode.id}`,
					data: payload,
				});
				toast.success("Showroom asset updated", { position: "top-center" });
			} else {
				const createResponse = await apiClient.post<Record<string, unknown>>({
					url: `/showrooms/${showroomId}/assets`,
					data: payload,
				});
				// Upload files if FILE mode and files were selected
				if (values.assetKind === "FILE" && createUploadFiles.length > 0) {
					const cr = createResponse as {
						asset?: { id?: string; _id?: string };
						data?: { asset?: { id?: string; _id?: string } };
						id?: string;
						_id?: string;
					};
					const newAssetId =
						cr.asset?.id ?? cr.asset?._id ?? cr.data?.asset?.id ?? cr.data?.asset?._id ?? cr.id ?? cr._id;
					if (newAssetId) {
						const formData = new FormData();
						createUploadFiles.forEach((file) => {
							if (file.originFileObj) {
								formData.append("files", file.originFileObj);
							}
						});
						try {
							await apiClient.post({
								url: `/showrooms/${showroomId}/assets/${newAssetId}/files`,
								data: formData,
								headers: { "Content-Type": "multipart/form-data" },
							});
						} catch (uploadError) {
							console.error(uploadError);
							toast.error("Asset created but file upload failed", { position: "top-center" });
						}
					}
				}
				toast.success("Showroom asset created", { position: "top-center" });
			}
			form.reset(DEFAULT_FORM_VALUES);
			setCreateUploadFiles([]);
			setIsDialogOpen(false);
			setEditMode(null);
			await fetchAssets();
		} catch (error) {
			console.error(error);
			toast.error(editMode ? "Failed to update showroom asset" : "Failed to create showroom asset", {
				position: "top-center",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleEditAsset = useCallback(
		async (asset: TextAssetRow | FileAssetRow) => {
			if (!showroomId) return;
			try {
				const response = await apiClient.get<Record<string, unknown>>({
					url: `/showrooms/${showroomId}/assets/${asset.id}`,
				});
				const editResp = response as { asset?: ShowroomAssetApiItem; data?: { asset?: ShowroomAssetApiItem } };
				const assetData = editResp.asset ?? editResp.data?.asset ?? (response as unknown as ShowroomAssetApiItem);
				if (assetData) {
					const hasFiles = (assetData.files ?? []).length > 0;
					form.reset({
						name: assetData.name,
						description: assetData.description || "",
						type: assetData.type,
						tags: (assetData.tags || []).join(", "),
						assetKind: hasFiles ? "FILE" : "TEXT",
						fields: assetData.fields?.map((f) => ({ ...f, isSecret: f.isSecret ?? false })) || [EMPTY_FIELD],
						expirationDate: assetData.expirationDate ? new Date(assetData.expirationDate) : undefined,
						expirationNotificationsEnabled: assetData.expirationNotificationsEnabled ?? false,
					});
					setEditMode({ id: asset.id, name: asset.name });
					setIsDialogOpen(true);
				}
			} catch (error) {
				console.error(error);
				toast.error("Failed to load asset details", { position: "top-center" });
			}
		},
		[form, showroomId],
	);

	const handleDeleteAsset = useCallback((asset: TextAssetRow | FileAssetRow) => {
		setDeleteTarget(asset);
		setIsDeleteDialogOpen(true);
	}, []);

	const confirmDeleteAsset = async () => {
		if (!showroomId || !deleteTarget) return;
		try {
			await apiClient.delete({
				url: `/showrooms/${showroomId}/assets/${deleteTarget.id}`,
			});
			toast.success("Asset deleted successfully", { position: "top-center" });
			setIsDeleteDialogOpen(false);
			setDeleteTarget(null);
			await fetchAssets();
		} catch (error) {
			console.error(error);
			toast.error("Failed to delete asset", { position: "top-center" });
		}
	};

	const handleDeleteFile = async (assetId: string, fileId: string) => {
		if (!showroomId) return;
		try {
			await apiClient.delete({ url: `/showrooms/${showroomId}/assets/${assetId}/files/${fileId}` });
			toast.success("File deleted", { position: "top-center" });
			// Refresh the view asset
			const response = await apiClient.get<Record<string, unknown>>({
				url: `/showrooms/${showroomId}/assets/${assetId}`,
			});
			const resp = response as { asset?: ShowroomAssetApiItem; data?: { asset?: ShowroomAssetApiItem } };
			const updated = resp.asset ?? resp.data?.asset ?? (response as unknown as ShowroomAssetApiItem);
			setViewAsset(updated);
			await fetchAssets();
		} catch (error) {
			console.error(error);
			toast.error("Failed to delete file", { position: "top-center" });
		}
	};

	const handleOpenUpload = useCallback((asset: TextAssetRow | FileAssetRow) => {
		setUploadTarget(asset);
		setFileList([]);
		setIsUploadDialogOpen(true);
	}, []);

	const handleUploadFiles = async () => {
		if (!showroomId || !uploadTarget || fileList.length === 0) return;
		setIsSubmitting(true);
		try {
			const formData = new FormData();
			fileList.forEach((file) => {
				if (file.originFileObj) {
					formData.append("files", file.originFileObj);
				}
			});

			await apiClient.post({
				url: `/showrooms/${showroomId}/assets/${uploadTarget.id}/files`,
				data: formData,
				headers: {
					"Content-Type": "multipart/form-data",
				},
			});
			toast.success("Files uploaded successfully", { position: "top-center" });
			setIsUploadDialogOpen(false);
			setUploadTarget(null);
			setFileList([]);
			await fetchAssets();
		} catch (error) {
			console.error(error);
			toast.error("Failed to upload files", { position: "top-center" });
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
			{
				title: "Actions",
				key: "actions",
				width: 200,
				fixed: "right",
				render: (_: any, record: TextAssetRow) => (
					<div className="flex items-center gap-2">
						<Button type="button" variant="secondary" size="sm" onClick={() => void handleViewAsset(record)}>
							View
						</Button>
						<Button type="button" variant="outline" size="sm" onClick={() => void handleEditAsset(record)}>
							Edit
						</Button>
						<Button type="button" variant="destructive" size="sm" onClick={() => handleDeleteAsset(record)}>
							Delete
						</Button>
					</div>
				),
			},
		],
		[handleEditAsset, handleViewAsset, handleDeleteAsset],
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
			{
				title: "Actions",
				key: "actions",
				width: 260,
				fixed: "right",
				render: (_: any, record: FileAssetRow) => (
					<div className="flex flex-wrap items-center gap-2">
						<Button type="button" variant="secondary" size="sm" onClick={() => void handleViewAsset(record)}>
							View
						</Button>
						<Button type="button" variant="secondary" size="sm" onClick={() => void handleViewAsset(record, "GALLERY")}>
							<ImageIcon className="mr-1 h-4 w-4" />
							Gallery
						</Button>
						<Button type="button" variant="outline" size="sm" onClick={() => handleOpenUpload(record)}>
							Upload
						</Button>
						<Button type="button" variant="outline" size="sm" onClick={() => void handleEditAsset(record)}>
							Edit
						</Button>
						<Button type="button" variant="destructive" size="sm" onClick={() => handleDeleteAsset(record)}>
							Delete
						</Button>
					</div>
				),
			},
		],
		[handleEditAsset, handleViewAsset, handleDeleteAsset, handleOpenUpload],
	);

	return (
		<div className="flex flex-col gap-6">
			<Card>
				<CardHeader>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<div className="text-lg font-semibold">Showroom Assets</div>
							<div className="text-sm text-muted-foreground">
								Manage assets for showroom: <span className="font-medium text-foreground">{showroomId ?? "-"}</span>
							</div>
						</div>
						<Button type="button" onClick={() => setIsDialogOpen(true)}>
							Add Asset
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					<Tabs value={assetView} onValueChange={(v) => setAssetView(v as "TEXT" | "FILE")} className="w-full">
						<div className="mb-4 flex items-center justify-between gap-4">
							<TabsList>
								<TabsTrigger value="TEXT">Text Assets ({textAssets.length})</TabsTrigger>
								<TabsTrigger value="FILE">File Assets ({fileAssets.length})</TabsTrigger>
							</TabsList>
							<div className="w-full sm:w-[280px]">
								<Input
									placeholder="Search assets..."
									value={searchQuery}
									onChange={(event) => setSearchQuery(event.target.value)}
								/>
							</div>
						</div>

						<TabsContent value="TEXT" className="mt-0">
							<div className="rounded-lg border bg-background/40 p-2 shadow-sm">
								<Table<TextAssetRow>
									rowKey="id"
									size="middle"
									scroll={{ x: "max-content" }}
									pagination={{ pageSize: 8, showSizeChanger: true }}
									loading={isLoading}
									locale={{ emptyText: showroomId ? "No text assets found" : "Missing showroom ID" }}
									columns={textColumns}
									dataSource={filteredTextAssets}
									bordered
									rowClassName={() => "hover:bg-muted/40"}
								/>
							</div>
						</TabsContent>

						<TabsContent value="FILE" className="mt-0">
							<div className="rounded-lg border bg-background/40 p-2 shadow-sm">
								<Table<FileAssetRow>
									rowKey="id"
									size="middle"
									scroll={{ x: "max-content" }}
									pagination={{ pageSize: 8, showSizeChanger: true }}
									loading={isLoading}
									locale={{ emptyText: showroomId ? "No file assets found" : "Missing showroom ID" }}
									columns={fileColumns}
									dataSource={filteredFileAssets}
									bordered
									rowClassName={() => "hover:bg-muted/40"}
								/>
							</div>
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>
			<Dialog
				open={isDialogOpen}
				onOpenChange={(open) => {
					setIsDialogOpen(open);
					if (!open) {
						form.reset(DEFAULT_FORM_VALUES);
						setCreateUploadFiles([]);
						setEditMode(null);
					}
				}}
			>
				<DialogContent className="sm:max-w-4xl">
					<DialogHeader>
						<DialogTitle>{editMode ? "Edit showroom asset" : "Add showroom asset"}</DialogTitle>
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
												<Select value={field.value} onValueChange={field.onChange}>
													<SelectTrigger>
														<SelectValue placeholder="Select type" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="GENERAL">GENERAL</SelectItem>
														<SelectItem value="CREDENTIALS">CREDENTIALS</SelectItem>
														<SelectItem value="FILES">FILES</SelectItem>
														<SelectItem value="LINKS">LINKS</SelectItem>
													</SelectContent>
												</Select>
											</FormControl>
										</FormItem>
									)}
								/>
							</div>
							<div className="grid gap-4 md:grid-cols-2">
								<FormField
									control={form.control}
									name="assetKind"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Asset Mode</FormLabel>
											<FormControl>
												<Select value={field.value} onValueChange={field.onChange}>
													<SelectTrigger>
														<SelectValue placeholder="Select mode" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="TEXT">Text</SelectItem>
														<SelectItem value="FILE">File</SelectItem>
													</SelectContent>
												</Select>
											</FormControl>
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="description"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Description</FormLabel>
											<FormControl>
												<Input placeholder="Brief description of the asset" {...field} />
											</FormControl>
										</FormItem>
									)}
								/>
							</div>
							<div className="grid gap-4 md:grid-cols-2">
								<FormField
									control={form.control}
									name="tags"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Tags</FormLabel>
											<FormControl>
												<Input placeholder="tag1, tag2, tag3 (comma separated)" {...field} />
											</FormControl>
										</FormItem>
									)}
								/>
							</div>

							{assetKind === "FILE" && !editMode && (
								<div className="space-y-3">
									<div className="text-sm font-semibold">Upload Files</div>
									<Upload.Dragger
										multiple
										fileList={createUploadFiles}
										onChange={({ fileList }: UploadChangeParam) => setCreateUploadFiles(fileList)}
										beforeUpload={() => false}
										className="block cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors hover:border-primary/50"
									>
										<p className="text-sm font-medium">Click or drag files to this area to upload</p>
										<p className="mt-1 text-xs text-muted-foreground">Support for multiple files upload</p>
									</Upload.Dragger>
									<div className="text-xs text-muted-foreground">
										Select files to upload with this asset. You can also upload files later.
									</div>
								</div>
							)}

							{assetKind === "TEXT" && (
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
												className="grid gap-4 rounded-md border p-4 md:grid-cols-[1.3fr_0.9fr_1.3fr_0.6fr_auto]"
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
																		<SelectItem value="USERNAME">USERNAME</SelectItem>
																		<SelectItem value="PASSWORD">PASSWORD</SelectItem>
																		<SelectItem value="EMAIL">EMAIL</SelectItem>
																		<SelectItem value="NOTE">NOTE</SelectItem>
																		<SelectItem value="NUMBER">NUMBER</SelectItem>
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
												<FormField
													control={form.control}
													name={`fields.${index}.isSecret`}
													render={({ field }) => (
														<FormItem>
															<FormLabel>Secret</FormLabel>
															<FormControl>
																<div className="flex h-9 items-center">
																	<Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
																</div>
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
							)}

							<div className="space-y-4 rounded-md border p-4">
								<div className="text-sm font-semibold">Expiration Notifications</div>
								<div className="flex items-center gap-3">
									<FormField
										control={form.control}
										name="expirationNotificationsEnabled"
										render={({ field }) => (
											<FormItem className="flex items-center gap-2">
												<FormControl>
													<Switch checked={field.value} onCheckedChange={field.onChange} />
												</FormControl>
												<Label className="cursor-pointer" onClick={() => field.onChange(!field.value)}>
													Enable expiration reminders
												</Label>
											</FormItem>
										)}
									/>
								</div>
								{form.watch("expirationNotificationsEnabled") && (
									<FormField
										control={form.control}
										name="expirationDate"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Expiration Date</FormLabel>
												<FormControl>
													<DatePicker
														value={field.value}
														onChange={field.onChange}
														placeholder="Select expiration date"
														minDate={new Date()}
													/>
												</FormControl>
												<div className="text-xs text-muted-foreground">
													You will receive reminders 5 days, 3 days, 2 days before, and on the expiration day.
												</div>
											</FormItem>
										)}
									/>
								)}
							</div>

							<DialogFooter className="flex flex-wrap justify-end gap-2">
								<Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
									Cancel
								</Button>
								<Button type="submit" disabled={isSubmitting}>
									{isSubmitting ? "Saving..." : editMode ? "Update Asset" : "Save Asset"}
								</Button>
							</DialogFooter>
						</form>
					</Form>
				</DialogContent>
			</Dialog>

			<Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Upload Files</DialogTitle>
					</DialogHeader>
					<div className="py-4">
						<Upload.Dragger
							multiple
							fileList={fileList}
							onChange={({ fileList }) => setFileList(fileList)}
							beforeUpload={() => false}
							className="block cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors hover:border-primary/50"
						>
							<p className="text-sm font-medium">Click or drag files to this area to upload</p>
							<p className="mt-1 text-xs text-muted-foreground">Support for multiple files upload</p>
						</Upload.Dragger>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
							Cancel
						</Button>
						<Button onClick={() => void handleUploadFiles()} disabled={isSubmitting || fileList.length === 0}>
							{isSubmitting ? "Uploading..." : "Upload Files"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Delete Asset</DialogTitle>
					</DialogHeader>
					<div className="py-4">
						<p className="text-sm text-muted-foreground">
							Are you sure you want to delete{" "}
							<span className="font-semibold text-foreground">{deleteTarget?.name}</span>? This action cannot be undone.
						</p>
					</div>
					<DialogFooter className="gap-2 sm:gap-0">
						<Button type="button" variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
							Cancel
						</Button>
						<Button type="button" variant="destructive" onClick={() => void confirmDeleteAsset()}>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* View Asset Dialog */}
			<Dialog
				open={isViewDialogOpen}
				onOpenChange={(open) => {
					setIsViewDialogOpen(open);
					if (!open) setGallerySearch("");
				}}
			>
				<DialogContent className="w-[95vw] max-w-5xl max-h-[92vh]">
					<DialogHeader>
						<DialogTitle className="flex items-center justify-between">
							<span>{viewAsset?.name || "Asset Details"}</span>
							{(viewAsset?.files?.length ?? 0) > 0 && (
								<div className="flex items-center gap-2">
									<Button
										type="button"
										variant={viewMode === "DETAILS" ? "default" : "outline"}
										size="sm"
										onClick={() => setViewMode("DETAILS")}
									>
										Details
									</Button>
									<Button
										type="button"
										variant={viewMode === "GALLERY" ? "default" : "outline"}
										size="sm"
										onClick={() => setViewMode("GALLERY")}
									>
										<ImageIcon className="mr-1 h-4 w-4" />
										Gallery
									</Button>
								</div>
							)}
						</DialogTitle>
					</DialogHeader>

					{viewAsset && (
						<div className="space-y-6">
							{/* Asset Info */}
							<div className="grid gap-4 md:grid-cols-2">
								<div>
									<div className="text-xs font-semibold uppercase text-muted-foreground">Type</div>
									<Badge variant="secondary" className="mt-1">
										{viewAsset.type}
									</Badge>
								</div>
								{viewAsset.description && (
									<div>
										<div className="text-xs font-semibold uppercase text-muted-foreground">Description</div>
										<div className="mt-1 text-sm">{viewAsset.description}</div>
									</div>
								)}
							</div>

							{/* Tags */}
							{(viewAsset.tags?.length ?? 0) > 0 && (
								<div>
									<div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Tags</div>
									<div className="flex flex-wrap gap-2">
										{viewAsset.tags?.map((tag) => (
											<Badge key={tag} variant="outline">
												{tag}
											</Badge>
										))}
									</div>
								</div>
							)}

							{viewMode === "DETAILS" ? (
								<>
									{/* Fields */}
									{(viewAsset.fields?.length ?? 0) > 0 && (
										<div>
											<div className="text-xs font-semibold uppercase text-muted-foreground mb-3">Fields</div>
											<div className="space-y-3">
												{viewAsset.fields?.map((field, index) => (
													<div
														key={`${field.key}-${index}`}
														className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3"
													>
														<div className="flex-1 min-w-0">
															<div className="flex items-center gap-2 mb-1">
																<div className="text-xs font-semibold text-muted-foreground uppercase">{field.key}</div>
																<Badge variant="outline" className="text-[10px]">
																	{field.type}
																</Badge>
																{field.isSecret && (
																	<Badge variant="secondary" className="text-[10px]">
																		Secret
																	</Badge>
																)}
															</div>
															<div className="text-sm font-mono break-all">
																{field.isSecret && !revealedFields[`field-${index}`] ? "••••••••" : field.value || "-"}
															</div>
														</div>
														<div className="flex items-center gap-1 shrink-0">
															{field.isSecret && (
																<Button
																	type="button"
																	variant="ghost"
																	size="icon"
																	onClick={() => handleToggleReveal(`field-${index}`)}
																>
																	{revealedFields[`field-${index}`] ? (
																		<EyeOff className="h-4 w-4" />
																	) : (
																		<Eye className="h-4 w-4" />
																	)}
																</Button>
															)}
															<Button
																type="button"
																variant="ghost"
																size="icon"
																onClick={() => void handleCopy(field.value || "", `field-${index}`)}
															>
																{copiedField === `field-${index}` ? (
																	<Check className="h-4 w-4 text-green-500" />
																) : (
																	<Copy className="h-4 w-4" />
																)}
															</Button>
														</div>
													</div>
												))}
											</div>
										</div>
									)}

									{/* Files List */}
									{(viewAsset.files?.length ?? 0) > 0 && (
										<div>
											<div className="text-xs font-semibold uppercase text-muted-foreground mb-3">
												Files ({viewAsset.files?.length})
											</div>
											<div className="space-y-2">
												{viewAsset.files?.map((file) => {
													const fileUrl = buildFileUrl(file);
													return (
														<div
															key={file.id || file.filename}
															className="flex items-center justify-between gap-3 rounded-lg border p-3"
														>
															<div className="flex-1 min-w-0">
																<div className="text-sm font-medium truncate">{file.originalName}</div>
																<div className="text-xs text-muted-foreground">
																	{file.mimeType} • {file.size ? fBytes(file.size) : "-"}
																</div>
															</div>
															<div className="flex items-center gap-2 shrink-0">
																{fileUrl && (
																	<>
																		<Button type="button" variant="ghost" size="icon" asChild>
																			<a href={fileUrl} target="_blank" rel="noopener noreferrer">
																				<ExternalLink className="h-4 w-4" />
																			</a>
																		</Button>
																		<Button type="button" variant="ghost" size="icon" asChild>
																			<a href={fileUrl} download={file.originalName}>
																				<Download className="h-4 w-4" />
																			</a>
																		</Button>
																	</>
																)}
																{file.id && viewAsset.id && (
																	<Button
																		type="button"
																		variant="ghost"
																		size="icon"
																		className="text-destructive hover:text-destructive"
																		onClick={() =>
																			void handleDeleteFile(viewAsset.id ?? viewAsset._id ?? "", file.id ?? "")
																		}
																	>
																		<Trash2 className="h-4 w-4" />
																	</Button>
																)}
															</div>
														</div>
													);
												})}
											</div>
										</div>
									)}
								</>
							) : (
								/* Gallery View */
								<div className="space-y-4">
									<div className="flex items-center justify-between gap-4">
										<div className="text-xs font-semibold uppercase text-muted-foreground">
											Gallery ({viewAsset.files?.length})
										</div>
										<div className="relative w-64">
											<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
											<Input
												placeholder="Search files..."
												value={gallerySearch}
												onChange={(e) => setGallerySearch(e.target.value)}
												className="pl-9 h-9"
											/>
										</div>
									</div>
									<div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
										{(viewAsset.files ?? [])
											.filter((file) => {
												if (!gallerySearch.trim()) return true;
												const q = gallerySearch.trim().toLowerCase();
												return (
													file.originalName?.toLowerCase().includes(q) ||
													file.mimeType?.toLowerCase().includes(q) ||
													file.filename?.toLowerCase().includes(q)
												);
											})
											.map((file) => {
												const isImage = file.mimeType?.startsWith("image/");
												const fileUrl = buildFileUrl(file);
												return (
													<div
														key={file.id || file.filename}
														className="group relative aspect-square overflow-hidden rounded-lg border bg-muted/30"
													>
														{isImage && fileUrl ? (
															<img
																src={fileUrl}
																alt={file.originalName}
																className="h-full w-full object-cover transition-transform group-hover:scale-105"
															/>
														) : (
															<div className="flex h-full w-full flex-col items-center justify-center p-4">
																<ImageIcon className="h-12 w-12 text-muted-foreground/50" />
																<div className="mt-2 text-xs text-center text-muted-foreground truncate max-w-full px-2">
																	{file.originalName}
																</div>
																<div className="mt-1 text-[10px] text-muted-foreground/70">
																	{file.size ? fBytes(file.size) : ""}
																</div>
															</div>
														)}
														<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
															<div className="text-xs text-white truncate">{file.originalName}</div>
															<div className="text-[10px] text-white/70">{file.size ? fBytes(file.size) : ""}</div>
															<div className="flex items-center gap-2 mt-2">
																{fileUrl && (
																	<>
																		<Button type="button" variant="secondary" size="sm" className="h-7 text-xs" asChild>
																			<a href={fileUrl} target="_blank" rel="noopener noreferrer">
																				Open
																			</a>
																		</Button>
																		<Button type="button" variant="secondary" size="sm" className="h-7 text-xs" asChild>
																			<a href={fileUrl} download={file.originalName}>
																				Download
																			</a>
																		</Button>
																	</>
																)}
																{file.id && viewAsset.id && (
																	<Button
																		type="button"
																		variant="destructive"
																		size="sm"
																		className="h-7 text-xs"
																		onClick={() =>
																			void handleDeleteFile(viewAsset.id ?? viewAsset._id ?? "", file.id ?? "")
																		}
																	>
																		<Trash2 className="mr-1 h-3 w-3" />
																		Delete
																	</Button>
																)}
															</div>
														</div>
													</div>
												);
											})}
									</div>
									{(viewAsset.files ?? []).filter((file) => {
										if (!gallerySearch.trim()) return true;
										const q = gallerySearch.trim().toLowerCase();
										return (
											file.originalName?.toLowerCase().includes(q) ||
											file.mimeType?.toLowerCase().includes(q) ||
											file.filename?.toLowerCase().includes(q)
										);
									}).length === 0 && (
										<div className="text-center text-sm text-muted-foreground py-8">No files match your search.</div>
									)}
								</div>
							)}
						</div>
					)}

					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setIsViewDialogOpen(false)}>
							Close
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
