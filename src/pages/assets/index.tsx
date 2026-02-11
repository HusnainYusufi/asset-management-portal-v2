import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { UploadChangeParam, UploadFile } from "antd/es/upload/interface";
import { Search as SearchIcon, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import apiClient from "@/api/apiClient";
import { Icon } from "@/components/icon";
import { Upload } from "@/components/upload";
import { getFileThumb } from "@/components/upload/utils";
import { GLOBAL_CONFIG } from "@/global-config";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";
import { DatePicker } from "@/ui/date-picker";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/ui/form";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Switch } from "@/ui/switch";
import { fBytes } from "@/utils/format-number";

type AssetField = {
	key: string;
	type: string;
	value: string;
	isSecret: boolean;
};

type AssetApiItem = {
	id: string;
	name: string;
	type: string;
	tenantId: string;
	clientId: string;
	tags: string[];
	fields: AssetField[];
	files: AssetFile[];
	createdAt: string;
	updatedAt: string;
	expirationDate?: string;
	expirationNotificationsEnabled?: boolean;
};

type AssetFile = {
	id: string;
	filename: string;
	originalName?: string;
	relativePath?: string;
	url?: string;
	size?: number;
	mimeType?: string;
	uploadedBy?: string;
	uploadedAt?: string;
};

type AssetApiResponse = {
	statusCode: number;
	message: string;
	data: {
		assets: AssetApiItem[];
	};
};

type CreateAssetApiResponse = {
	statusCode: number;
	message: string;
	data: {
		asset: AssetApiItem;
	};
};

type AssetDetailApiResponse = {
	statusCode: number;
	message: string;
	data: {
		asset: AssetApiItem;
	};
};

type AssetFormValues = {
	name: string;
	type: string;
	tags: string;
	assetKind: "TEXT" | "FILE";
	fields: AssetField[];
	expirationDate?: Date;
	expirationNotificationsEnabled: boolean;
};

type TextAssetRow = {
	id: string;
	name: string;
	type: string;
	tags: string[];
	fields: AssetField[];
	lastUpdated: string;
	createdAt: string;
};

type FileAssetRow = {
	id: string;
	name: string;
	type: string;
	tags: string[];
	fileName: string;
	fileUrl: string;
	fileSize: string;
	lastUpdated: string;
};

type ViewAssetDetail = {
	kind: "TEXT" | "FILE";
	id: string;
	name: string;
	type: string;
	tags: string[];
	createdAt?: string;
	updatedAt?: string;
	fields?: AssetField[];
	fileName?: string;
	fileUrl?: string;
	fileSize?: string;
	files?: AssetFile[];
};

type DeleteTarget = {
	id: string;
	kind: "TEXT" | "FILE";
	name: string;
};

const EMPTY_FIELD: AssetField = { key: "", type: "TEXT", value: "", isSecret: false };

const DEFAULT_FORM_VALUES: AssetFormValues = {
	name: "",
	type: "GENERAL",
	tags: "",
	assetKind: "TEXT",
	fields: [EMPTY_FIELD],
	expirationDate: undefined,
	expirationNotificationsEnabled: false,
};

const EXAMPLE_FORM_VALUES: AssetFormValues = {
	name: "Tabby Subscription",
	type: "CREDENTIALS",
	tags: "subscription, tabby",
	assetKind: "TEXT",
	fields: [
		{ key: "username", type: "USERNAME", value: "tabby-user", isSecret: false },
		{ key: "password", type: "PASSWORD", value: "SecretPass123!", isSecret: true },
		{ key: "portal", type: "URL", value: "https://example.com", isSecret: false },
	],
	expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
	expirationNotificationsEnabled: true,
};

const parseTags = (value: string) =>
	value
		.split(",")
		.map((tag) => tag.trim())
		.filter(Boolean);

const createId = () => Math.random().toString(36).slice(2, 10);

const summarizeFiles = (files: UploadFile[]) => {
	if (!files.length) {
		return { fileName: "-", totalSize: "-" };
	}
	const [firstFile, ...rest] = files;
	const fileName = rest.length ? `${firstFile.name} +${rest.length} more` : firstFile.name;
	const totalSize = fBytes(files.reduce((sum, file) => sum + (typeof file.size === "number" ? file.size : 0), 0));
	return { fileName, totalSize };
};

const formatDate = (value?: string) => {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toISOString().slice(0, 10);
};

const buildFileUrl = (file: AssetFile) => {
	if (file.url) {
		if (file.url.startsWith("http://") || file.url.startsWith("https://")) {
			return file.url;
		}
		const baseUrl = GLOBAL_CONFIG.apiBaseUrl?.replace(/\/$/, "") || "";
		const relativeUrl = file.url.startsWith("/") ? file.url : `/${file.url}`;
		return `${baseUrl}${relativeUrl}`;
	}
	if (!file.relativePath) return "";
	const baseUrl = GLOBAL_CONFIG.apiBaseUrl?.replace(/\/$/, "") || "";
	const relativePath = file.relativePath.startsWith("/") ? file.relativePath : `/${file.relativePath}`;
	return `${baseUrl}${relativePath}`;
};

const getFileDisplayName = (file: AssetFile) => file.originalName ?? file.filename ?? "Untitled file";

const mapApiAsset = (asset: AssetApiItem): TextAssetRow => ({
	id: asset.id,
	name: asset.name,
	type: asset.type,
	tags: asset.tags ?? [],
	fields: asset.fields ?? [],
	createdAt: asset.createdAt,
	lastUpdated: asset.updatedAt ?? asset.createdAt,
});

const mapFileAsset = (asset: AssetApiItem): FileAssetRow => {
	const summaryFiles: UploadFile[] = (asset.files ?? []).map((file) => ({
		uid: file.id,
		name: file.originalName ?? file.filename,
		size: file.size,
	}));
	const { fileName, totalSize } = summarizeFiles(summaryFiles);
	const firstFile = asset.files?.[0];
	const firstFileUrl = firstFile ? buildFileUrl(firstFile) : "";
	return {
		id: asset.id,
		name: asset.name,
		type: asset.type,
		tags: asset.tags ?? [],
		fileName: fileName === "-" ? "No files uploaded" : fileName,
		fileUrl: firstFileUrl || "-",
		fileSize: totalSize === "-" ? "-" : totalSize,
		lastUpdated: asset.updatedAt ?? asset.createdAt,
	};
};

export default function AssetsPage() {
	const [textAssets, setTextAssets] = useState<TextAssetRow[]>([]);
	const [fileAssets, setFileAssets] = useState<FileAssetRow[]>([]);
	const [assetView, setAssetView] = useState<"TEXT" | "FILE">("TEXT");
	const [searchQuery, setSearchQuery] = useState("");
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editMode, setEditMode] = useState<{ id: string; kind: "TEXT" | "FILE" } | null>(null);
	const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
	const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
	const [viewMode, setViewMode] = useState<"DETAILS" | "GALLERY">("DETAILS");
	const [viewAsset, setViewAsset] = useState<ViewAssetDetail | null>(null);
	const [isViewLoading, setIsViewLoading] = useState(false);
	const [revealedFields, setRevealedFields] = useState<Record<string, boolean>>({});
	const [gallerySearch, setGallerySearch] = useState("");
	const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadTarget, setUploadTarget] = useState<FileAssetRow | null>(null);
	const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
	const [createUploadFiles, setCreateUploadFiles] = useState<UploadFile[]>([]);
	const form = useForm<AssetFormValues>({
		defaultValues: DEFAULT_FORM_VALUES,
	});
	const fieldsArray = useFieldArray({
		control: form.control,
		name: "fields",
	});
	const assetKind = form.watch("assetKind");

	useEffect(() => {
		const loadAssets = async () => {
			setIsLoading(true);
			try {
				const response = await apiClient.get<AssetApiResponse>({ url: "/assets" });
				const assets = response.data?.assets ?? [];
				setTextAssets(assets.filter((asset) => (asset.files ?? []).length === 0).map(mapApiAsset));
				setFileAssets(assets.filter((asset) => (asset.files ?? []).length > 0).map(mapFileAsset));
			} catch (error) {
				console.error(error);
				toast.error("Failed to load assets", { position: "top-center" });
			} finally {
				setIsLoading(false);
			}
		};
		loadAssets();
	}, []);

	const handleEditAsset = useCallback(
		async (assetId: string, assetKind: "TEXT" | "FILE") => {
			try {
				const response = await apiClient.get<AssetDetailApiResponse | { asset?: AssetApiItem }>({
					url: `/assets/${assetId}`,
				});
				const apiAsset =
					(response as { asset?: AssetApiItem }).asset ?? (response as AssetDetailApiResponse).data?.asset;
				if (!apiAsset) {
					throw new Error("Asset not found");
				}
				const tags = (apiAsset.tags ?? []).join(", ");
				form.reset({
					name: apiAsset.name,
					type: apiAsset.type,
					tags,
					assetKind,
					fields: apiAsset.fields?.length ? apiAsset.fields : [EMPTY_FIELD],
					expirationDate: apiAsset.expirationDate ? new Date(apiAsset.expirationDate) : undefined,
					expirationNotificationsEnabled: apiAsset.expirationNotificationsEnabled ?? false,
				});
				setEditMode({ id: assetId, kind: assetKind });
				setIsDialogOpen(true);
			} catch (error) {
				console.error(error);
				toast.error("Failed to load asset for editing", { position: "top-center" });
			}
		},
		[form],
	);

	const handleViewAsset = useCallback(
		async (
			assetId: string,
			assetKind: "TEXT" | "FILE",
			_viewMode: "DETAILS" | "GALLERY" = "DETAILS",
			_asset?: TextAssetRow | FileAssetRow,
		) => {
			setIsViewDialogOpen(true);
			setViewMode(_viewMode);
			setViewAsset(null);
			setIsViewLoading(true);
			setRevealedFields({});
			try {
				const response = await apiClient.get<AssetDetailApiResponse | { asset?: AssetApiItem }>({
					url: `/assets/${assetId}`,
				});
				const apiAsset =
					(response as { asset?: AssetApiItem }).asset ?? (response as AssetDetailApiResponse).data?.asset;
				if (!apiAsset) {
					throw new Error("Asset not found");
				}
				if (assetKind === "FILE") {
					const files = apiAsset.files ?? [];
					const summaryFiles: UploadFile[] = files.map((file) => ({
						uid: file.id,
						name: getFileDisplayName(file),
						size: file.size,
					}));
					const { fileName, totalSize } = summarizeFiles(summaryFiles);
					setViewAsset({
						kind: "FILE",
						id: apiAsset.id,
						name: apiAsset.name,
						type: apiAsset.type,
						tags: apiAsset.tags ?? [],
						fileName: fileName === "-" ? "No files uploaded" : fileName,
						fileUrl: files[0] ? buildFileUrl(files[0]) || "-" : "-",
						fileSize: totalSize === "-" ? "-" : totalSize,
						updatedAt: apiAsset.updatedAt,
						files,
					});
				} else {
					setViewAsset({
						kind: "TEXT",
						id: apiAsset.id,
						name: apiAsset.name,
						type: apiAsset.type,
						tags: apiAsset.tags ?? [],
						createdAt: apiAsset.createdAt,
						updatedAt: apiAsset.updatedAt,
						fields: apiAsset.fields ?? [],
					});
				}
			} catch (error) {
				console.error(error);
				setViewAsset(null);
				toast.error("Failed to load asset details", { position: "top-center" });
			} finally {
				setIsViewLoading(false);
			}
		},
		[],
	);

	const handleDeleteAsset = useCallback(async (assetId: string, assetKind: "TEXT" | "FILE") => {
		try {
			await apiClient.delete({ url: `/assets/${assetId}` });
			if (assetKind === "TEXT") {
				setTextAssets((prev) => prev.filter((asset) => asset.id !== assetId));
			} else {
				setFileAssets((prev) => prev.filter((asset) => asset.id !== assetId));
			}
			toast.success("Asset deleted", { position: "top-center" });
		} catch (error) {
			console.error(error);
			toast.error("Failed to delete asset", { position: "top-center" });
		}
	}, []);

	const handleRequestDelete = useCallback((asset: DeleteTarget) => {
		setDeleteTarget(asset);
		setIsDeleteDialogOpen(true);
	}, []);

	const handleRequestUpload = useCallback((asset: FileAssetRow) => {
		setUploadTarget(asset);
		setIsUploadDialogOpen(true);
	}, []);

	const handleConfirmDelete = useCallback(async () => {
		if (!deleteTarget) return;
		await handleDeleteAsset(deleteTarget.id, deleteTarget.kind);
		setIsDeleteDialogOpen(false);
		setDeleteTarget(null);
	}, [deleteTarget, handleDeleteAsset]);

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
									<span className="truncate">{field.isSecret ? "••••••" : field.value || "-"}</span>
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
				width: 220,
				render: (_: string, record: TextAssetRow) => (
					<div className="flex flex-wrap gap-2">
						<Button type="button" variant="outline" size="sm" onClick={() => handleEditAsset(record.id, "TEXT")}>
							Edit
						</Button>
						<Button
							type="button"
							variant="secondary"
							size="sm"
							onClick={() => handleViewAsset(record.id, "TEXT", "DETAILS", record)}
						>
							View
						</Button>
						<Button
							type="button"
							variant="destructive"
							size="sm"
							onClick={() => handleRequestDelete({ id: record.id, kind: "TEXT", name: record.name })}
						>
							Delete
						</Button>
					</div>
				),
			},
		],
		[handleEditAsset, handleRequestDelete, handleViewAsset],
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
			{ title: "Size", dataIndex: "fileSize", key: "fileSize", width: 120 },
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
				width: 280,
				render: (_: string, record: FileAssetRow) => (
					<div className="flex flex-wrap gap-2">
						<Button type="button" variant="outline" size="sm" onClick={() => handleEditAsset(record.id, "FILE")}>
							Edit
						</Button>
						<Button
							type="button"
							variant="secondary"
							size="sm"
							onClick={() => handleViewAsset(record.id, "FILE", "DETAILS", record)}
						>
							View
						</Button>
						<Button
							type="button"
							variant="secondary"
							size="sm"
							onClick={() => handleViewAsset(record.id, "FILE", "GALLERY", record)}
						>
							Gallery
						</Button>
						<Button type="button" variant="outline" size="sm" onClick={() => handleRequestUpload(record)}>
							Upload files
						</Button>
						<Button
							type="button"
							variant="destructive"
							size="sm"
							onClick={() => handleRequestDelete({ id: record.id, kind: "FILE", name: record.name })}
						>
							Delete
						</Button>
					</div>
				),
			},
		],
		[handleEditAsset, handleRequestDelete, handleRequestUpload, handleViewAsset],
	);

	const handleAddField = () => {
		fieldsArray.append({ ...EMPTY_FIELD });
	};

	const handleRemoveField = (index: number) => {
		if (fieldsArray.fields.length > 1) {
			fieldsArray.remove(index);
		}
	};

	const handleLoadExample = () => {
		form.reset(EXAMPLE_FORM_VALUES);
	};

	const handleToggleReveal = (fieldId: string) => {
		setRevealedFields((prev) => ({ ...prev, [fieldId]: !prev[fieldId] }));
	};

	const handleCopyField = async (value: string, label: string) => {
		if (!navigator?.clipboard) {
			toast.error("Clipboard access is unavailable.");
			return;
		}

		await navigator.clipboard.writeText(value);
		toast.success(`${label} copied to clipboard.`);
	};

	const handleDeleteFile = async (assetId: string, fileId: string) => {
		try {
			await apiClient.delete({ url: `/assets/${assetId}/files/${fileId}` });
			toast.success("File deleted", { position: "top-center" });
			// Refresh view asset
			const response = await apiClient.get<Record<string, unknown>>({ url: `/assets/${assetId}` });
			const resp = response as { asset?: AssetApiItem; data?: { asset?: AssetApiItem } };
			const updated = resp.asset ?? resp.data?.asset;
			if (updated) {
				const files = updated.files ?? [];
				const summaryFiles: UploadFile[] = files.map((file) => ({
					uid: file.id,
					name: getFileDisplayName(file),
					size: file.size,
				}));
				const { fileName, totalSize } = summarizeFiles(summaryFiles);
				setViewAsset({
					kind: files.length > 0 ? "FILE" : "TEXT",
					id: updated.id,
					name: updated.name,
					type: updated.type,
					tags: updated.tags ?? [],
					fileUrl: files[0] ? buildFileUrl(files[0]) || "-" : "-",
					fileName,
					fileSize: totalSize,
					updatedAt: updated.updatedAt,
					files,
				});
			}
		} catch (error) {
			console.error(error);
			toast.error("Failed to delete file", { position: "top-center" });
		}
	};

	const handleUploadChange = ({ fileList }: UploadChangeParam) => {
		setUploadFiles(
			fileList.map((file) => ({
				...file,
				status: file.status ?? "done",
			})),
		);
	};

	const handleSubmit = async (values: AssetFormValues) => {
		const tags = parseTags(values.tags);
		const payload: Record<string, unknown> = {
			name: values.name,
			type: values.type,
			fields:
				values.assetKind === "TEXT"
					? values.fields
							.filter((field) => field.key || field.value)
							.map((field) => ({
								key: field.key,
								type: field.type,
								value: field.value,
								isSecret: field.isSecret,
							}))
					: [],
			tags,
		};

		// Only include expiration fields when notifications are enabled
		if (values.expirationNotificationsEnabled) {
			payload.expirationNotificationsEnabled = true;
			if (values.expirationDate) {
				payload.expirationDate = values.expirationDate.toISOString();
			}
		}

		let resultAsset: AssetApiItem | undefined;
		try {
			if (editMode) {
				// Update existing asset
				const response = await apiClient.patch<CreateAssetApiResponse | { asset?: AssetApiItem }>({
					url: `/assets/${editMode.id}`,
					data: payload,
				});
				if (response && typeof response === "object" && "data" in response) {
					resultAsset = response.data?.asset;
				} else if (response && typeof response === "object" && "asset" in response) {
					resultAsset = response.asset;
				}

				// Upload additional files if any were selected during edit
				if (createUploadFiles.length > 0) {
					const formData = new FormData();
					createUploadFiles.forEach((file) => {
						if (file.originFileObj) {
							formData.append("files", file.originFileObj);
						}
					});
					try {
						await apiClient.post({
							url: `/assets/${editMode.id}/files`,
							data: formData,
							headers: { "Content-Type": "multipart/form-data" },
						});
					} catch (uploadError) {
						console.error(uploadError);
						toast.error("Asset updated but file upload failed", { position: "top-center" });
					}
				}

				// Update the local state
				if (editMode.kind === "TEXT") {
					setTextAssets((prev: TextAssetRow[]) =>
						prev.map((asset: TextAssetRow) =>
							asset.id === editMode.id
								? {
										...asset,
										name: values.name,
										type: values.type,
										tags,
										fields: values.fields.filter((field) => field.key || field.value),
										lastUpdated: new Date().toISOString().slice(0, 10),
									}
								: asset,
						),
					);
				} else {
					setFileAssets((prev: FileAssetRow[]) =>
						prev.map((asset: FileAssetRow) =>
							asset.id === editMode.id
								? {
										...asset,
										name: values.name,
										type: values.type,
										tags,
										lastUpdated: new Date().toISOString().slice(0, 10),
									}
								: asset,
						),
					);
				}
				toast.success("Asset updated", { position: "top-center" });
			} else {
				// Create new asset
				const response = await apiClient.post<CreateAssetApiResponse | { asset?: AssetApiItem }>({
					url: "/assets",
					data: payload,
				});
				if (response && typeof response === "object" && "data" in response) {
					resultAsset = response.data?.asset;
				} else if (response && typeof response === "object" && "asset" in response) {
					resultAsset = response.asset;
				}

				if (values.assetKind === "FILE") {
					// Upload files if any were selected during creation
					const assetId = resultAsset?.id;
					if (assetId && createUploadFiles.length > 0) {
						const formData = new FormData();
						createUploadFiles.forEach((file) => {
							if (file.originFileObj) {
								formData.append("files", file.originFileObj);
							}
						});
						try {
							await apiClient.post({
								url: `/assets/${assetId}/files`,
								data: formData,
								headers: { "Content-Type": "multipart/form-data" },
							});
						} catch (uploadError) {
							console.error(uploadError);
							toast.error("Asset created but file upload failed", { position: "top-center" });
						}
					}
					const { fileName, totalSize } = summarizeFiles(createUploadFiles);
					const newFileAsset: FileAssetRow = {
						id: assetId ?? createId(),
						name: values.name || "Untitled File Asset",
						type: values.type || "FILES",
						tags,
						fileName: createUploadFiles.length > 0 ? fileName : "No files uploaded",
						fileUrl: "-",
						fileSize: createUploadFiles.length > 0 ? totalSize : "-",
						lastUpdated: new Date().toISOString().slice(0, 10),
					};
					setFileAssets((prev) => [newFileAsset, ...prev]);
				} else {
					const newTextAsset: TextAssetRow = {
						id: resultAsset?.id ?? createId(),
						name: values.name || "Untitled Text Asset",
						type: values.type || "TEXT",
						tags,
						fields: values.fields.filter((field) => field.key || field.value),
						createdAt: new Date().toISOString(),
						lastUpdated: new Date().toISOString().slice(0, 10),
					};
					setTextAssets((prev) => [newTextAsset, ...prev]);
				}
				toast.success("Asset created", { position: "top-center" });
			}
		} catch (error) {
			console.error(error);
			toast.error(editMode ? "Failed to update asset" : "Failed to create asset", { position: "top-center" });
			return;
		}

		form.reset(DEFAULT_FORM_VALUES);
		setEditMode(null);
		setCreateUploadFiles([]);
		setIsDialogOpen(false);
	};

	const handleConfirmUpload = async () => {
		if (!uploadTarget) return;
		if (uploadFiles.length === 0) {
			toast.error("Please attach at least one file", { position: "top-center" });
			return;
		}
		setIsUploading(true);
		const formData = new FormData();
		uploadFiles.forEach((file) => {
			if (file.originFileObj) {
				formData.append("files", file.originFileObj);
			}
		});
		try {
			await apiClient.post({
				url: `/assets/${uploadTarget.id}/files`,
				data: formData,
				headers: { "Content-Type": "multipart/form-data" },
			});
		} catch (error) {
			console.error(error);
			toast.error("Failed to upload asset files", { position: "top-center" });
			setIsUploading(false);
			return;
		}
		const { fileName, totalSize } = summarizeFiles(uploadFiles);
		setFileAssets((prev) =>
			prev.map((asset) =>
				asset.id === uploadTarget.id
					? {
							...asset,
							fileName,
							fileUrl: "Uploaded",
							fileSize: totalSize,
							lastUpdated: new Date().toISOString().slice(0, 10),
						}
					: asset,
			),
		);
		toast.success("Files uploaded", { position: "top-center" });
		setIsUploading(false);
		setIsUploadDialogOpen(false);
		setUploadFiles([]);
		setUploadTarget(null);
	};

	const normalizedSearch = searchQuery.trim().toLowerCase();
	const filteredTextAssets = useMemo(() => {
		if (!normalizedSearch) return textAssets;
		return textAssets.filter((asset) => {
			const haystack = [
				asset.name,
				asset.type,
				asset.id,
				asset.tags.join(" "),
				asset.fields.map((field) => `${field.key} ${field.value}`).join(" "),
			]
				.join(" ")
				.toLowerCase();
			return haystack.includes(normalizedSearch);
		});
	}, [normalizedSearch, textAssets]);

	const filteredFileAssets = useMemo(() => {
		if (!normalizedSearch) return fileAssets;
		return fileAssets.filter((asset) => {
			const haystack = [asset.name, asset.type, asset.id, asset.tags.join(" "), asset.fileName, asset.fileUrl]
				.join(" ")
				.toLowerCase();
			return haystack.includes(normalizedSearch);
		});
	}, [normalizedSearch, fileAssets]);

	const totalAssets = assetView === "TEXT" ? textAssets.length : fileAssets.length;
	const visibleAssets = assetView === "TEXT" ? filteredTextAssets.length : filteredFileAssets.length;
	const assetFiles = viewAsset?.kind === "FILE" ? (viewAsset.files ?? []) : [];
	const isGalleryView = viewMode === "GALLERY" && viewAsset?.kind === "FILE";

	return (
		<div className="flex flex-col gap-6">
			<Card>
				<CardHeader>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div className="text-lg font-semibold">Assets</div>
						<Button type="button" onClick={() => setIsDialogOpen(true)}>
							Add New Asset
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
								locale={{ emptyText: "No assets found" }}
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
								locale={{ emptyText: "No assets found" }}
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
						setEditMode(null);
						setCreateUploadFiles([]);
						form.reset(DEFAULT_FORM_VALUES);
					}
				}}
			>
				<DialogContent className="sm:max-w-4xl">
					<DialogHeader>
						<DialogTitle>{editMode ? "Edit asset" : "Add new asset"}</DialogTitle>
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
												<Input placeholder="Tabby Subscription" {...field} />
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
									name="tags"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Tags</FormLabel>
											<FormControl>
												<Input placeholder="subscription, tabby" {...field} />
											</FormControl>
										</FormItem>
									)}
								/>
							</div>

							{assetKind === "TEXT" && (
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
							)}

							{assetKind === "FILE" && (
								<div className="space-y-3">
									<div className="text-sm font-semibold">{editMode ? "Upload Additional Files" : "Upload Files"}</div>
									<Upload
										multiple
										maxCount={10}
										fileList={createUploadFiles}
										onChange={({ fileList }: UploadChangeParam) => {
											setCreateUploadFiles(
												fileList.map((file) => ({
													...file,
													status: file.status ?? "done",
												})),
											);
										}}
										beforeUpload={() => false}
										thumbnail
									/>
									<div className="text-xs text-muted-foreground">
										{editMode
											? "Add more files to this asset. Existing files will not be affected."
											: "Select files to upload with this asset. You can also upload files later."}
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
												className="grid gap-4 rounded-md border p-4 md:grid-cols-[1.3fr_1fr_1.3fr_0.7fr_auto]"
											>
												<FormField
													control={form.control}
													name={`fields.${index}.key`}
													render={({ field }) => (
														<FormItem>
															<FormLabel>Key</FormLabel>
															<FormControl>
																<Input placeholder="username" {...field} />
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
																		<SelectItem value="USERNAME">USERNAME</SelectItem>
																		<SelectItem value="PASSWORD">PASSWORD</SelectItem>
																		<SelectItem value="URL">URL</SelectItem>
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
																<Input placeholder="tabby-user" {...field} />
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
																<div className="flex items-center gap-2">
																	<Switch checked={field.value} onCheckedChange={field.onChange} />
																	<span className="text-xs text-muted-foreground">{field.value ? "Yes" : "No"}</span>
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
							<DialogFooter className="flex flex-wrap justify-between gap-2">
								<Button type="button" variant="outline" onClick={handleLoadExample}>
									Load Example
								</Button>
								<div className="flex gap-2">
									<Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
										Cancel
									</Button>
									<Button type="submit">Save Asset</Button>
								</div>
							</DialogFooter>
						</form>
					</Form>
				</DialogContent>
			</Dialog>
			<Dialog
				open={isUploadDialogOpen}
				onOpenChange={(open) => {
					setIsUploadDialogOpen(open);
					if (!open) {
						setUploadFiles([]);
						setUploadTarget(null);
						setIsUploading(false);
					}
				}}
			>
				<DialogContent className="sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>Upload files</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div className="text-sm text-muted-foreground">
							Uploading to:{" "}
							<span className="font-medium text-foreground">{uploadTarget?.name ?? "Selected asset"}</span>
						</div>
						{isUploading && (
							<div className="flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
								<span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
								Uploading files...
							</div>
						)}
						<Upload
							multiple
							maxCount={5}
							fileList={uploadFiles}
							onChange={handleUploadChange}
							beforeUpload={() => false}
							thumbnail
						/>
						<div className="text-xs text-muted-foreground">Select up to 5 files to upload.</div>
					</div>
					<DialogFooter className="mt-6">
						<Button type="button" variant="outline" onClick={() => setIsUploadDialogOpen(false)} disabled={isUploading}>
							Cancel
						</Button>
						<Button type="button" onClick={handleConfirmUpload} disabled={isUploading}>
							{isUploading ? "Uploading..." : "Upload files"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<Dialog
				open={isViewDialogOpen}
				onOpenChange={(open) => {
					setIsViewDialogOpen(open);
					if (!open) {
						setViewAsset(null);
						setRevealedFields({});
						setGallerySearch("");
					}
				}}
			>
				<DialogContent className="w-[95vw] max-w-5xl max-h-[92vh]">
					<DialogHeader>
						<DialogTitle>Asset details</DialogTitle>
					</DialogHeader>
					{isViewLoading ? (
						<div className="py-8 text-center text-sm text-muted-foreground">Loading asset details...</div>
					) : viewAsset ? (
						<div className="space-y-6 text-sm">
							{!isGalleryView && (
								<>
									<div className="space-y-2">
										<div className="text-lg font-semibold text-foreground">{viewAsset.name}</div>
										<div className="text-xs text-muted-foreground">ID: {viewAsset.id}</div>
										<div className="flex flex-wrap gap-2">
											{viewAsset.tags.length ? (
												viewAsset.tags.map((tag) => (
													<Badge key={tag} variant="secondary">
														{tag}
													</Badge>
												))
											) : (
												<span className="text-xs text-muted-foreground">No tags</span>
											)}
										</div>
									</div>
									<div className="grid gap-3 rounded-md border p-4 sm:grid-cols-2">
										<div>
											<div className="text-xs uppercase text-muted-foreground">Type</div>
											<div className="font-medium">{viewAsset.type || "-"}</div>
										</div>
										<div>
											<div className="text-xs uppercase text-muted-foreground">Last updated</div>
											<div className="font-medium">{formatDate(viewAsset.updatedAt)}</div>
										</div>
										{viewAsset.kind === "TEXT" ? (
											<div>
												<div className="text-xs uppercase text-muted-foreground">Created</div>
												<div className="font-medium">{formatDate(viewAsset.createdAt)}</div>
											</div>
										) : (
											<>
												<div>
													<div className="text-xs uppercase text-muted-foreground">File name</div>
													<div className="font-medium">{viewAsset.fileName || "-"}</div>
												</div>
												<div>
													<div className="text-xs uppercase text-muted-foreground">File size</div>
													<div className="font-medium">{viewAsset.fileSize || "-"}</div>
												</div>
												<div className="sm:col-span-2">
													<div className="text-xs uppercase text-muted-foreground">File URL</div>
													<div className="break-all font-medium">{viewAsset.fileUrl || "-"}</div>
												</div>
											</>
										)}
									</div>
								</>
							)}
							{viewAsset.kind === "TEXT" && (
								<div className="space-y-3">
									<div className="text-sm font-semibold">Fields</div>
									{viewAsset.fields?.length ? (
										<div className="space-y-2">
											{viewAsset.fields.map((field, index) => {
												const fieldId = `${viewAsset.id}-${index}`;
												const label = field.key || "Field";
												const displayValue = field.isSecret && !revealedFields[fieldId] ? "••••••" : field.value || "-";

												return (
													<div
														key={`${field.key}-${field.type}-${index}`}
														className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3"
													>
														<div className="min-w-[160px] space-y-1">
															<div className="text-[11px] font-medium uppercase text-muted-foreground">{label}</div>
															<div className="text-base font-semibold text-foreground">{displayValue}</div>
														</div>
														<div className="flex items-center gap-2">
															{field.isSecret && (
																<Button
																	type="button"
																	variant="outline"
																	size="sm"
																	onClick={() => handleToggleReveal(fieldId)}
																>
																	{revealedFields[fieldId] ? "Hide" : "Show"}
																</Button>
															)}
															<Button
																type="button"
																variant="secondary"
																size="sm"
																onClick={() => handleCopyField(field.value ?? "", label)}
															>
																Copy
															</Button>
														</div>
													</div>
												);
											})}
										</div>
									) : (
										<div className="text-xs text-muted-foreground">No fields attached to this asset.</div>
									)}
								</div>
							)}
							{viewAsset.kind === "FILE" && (
								<div className="space-y-4">
									<div className="flex items-center justify-between gap-4">
										<div className="text-sm font-semibold">{isGalleryView ? "Asset gallery" : "Asset files"}</div>
										<div className="flex items-center gap-3">
											<div className="relative w-64">
												<SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
												<Input
													placeholder="Search files..."
													value={gallerySearch}
													onChange={(e) => setGallerySearch(e.target.value)}
													className="pl-9 h-9"
												/>
											</div>
											<div className="text-xs text-muted-foreground">{assetFiles.length} files</div>
										</div>
									</div>
									{(() => {
										const filteredFiles = assetFiles.filter((file) => {
											if (!gallerySearch.trim()) return true;
											const q = gallerySearch.trim().toLowerCase();
											const name = (file.originalName ?? file.filename ?? "").toLowerCase();
											const mime = (file.mimeType ?? "").toLowerCase();
											return name.includes(q) || mime.includes(q);
										});
										return filteredFiles.length ? (
											<div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
												{filteredFiles.map((file) => {
													const fileUrl = buildFileUrl(file);
													const fileName = getFileDisplayName(file);
													const filePath = file.relativePath ?? file.url ?? "-";
													const isImage = file.mimeType?.startsWith("image/");
													const fileThumb = getFileThumb(fileName);
													const assetId = viewAsset.id ?? "";

													return (
														<div
															key={file.id}
															className="flex flex-col gap-3 rounded-lg border bg-background p-4 shadow-sm"
														>
															<div className="flex items-start justify-between gap-3">
																<div className="flex items-start gap-3">
																	<div className="rounded-md border bg-muted/30 p-2">
																		<Icon icon={`local:${fileThumb}`} size={28} />
																	</div>
																	<div className="space-y-1">
																		<div className="text-xs text-muted-foreground truncate max-w-[140px]">
																			{filePath}
																		</div>
																	</div>
																</div>
																<Badge variant="secondary">{file.mimeType ?? "File"}</Badge>
															</div>
															{isImage && fileUrl ? (
																<div className="overflow-hidden rounded-md border">
																	<img src={fileUrl} alt={fileName} className="h-40 w-full object-cover" />
																</div>
															) : (
																<div className="flex h-40 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
																	Preview unavailable
																</div>
															)}
															<div className="grid gap-2 text-xs text-muted-foreground">
																<div className="flex items-center justify-between">
																	<span>Size</span>
																	<span className="text-foreground">{file.size ? fBytes(file.size) : "-"}</span>
																</div>
																<div className="flex items-center justify-between">
																	<span>Uploaded</span>
																	<span className="text-foreground">{formatDate(file.uploadedAt)}</span>
																</div>
															</div>
															<div className="flex flex-wrap gap-2">
																{fileUrl ? (
																	<Button asChild size="sm">
																		<a href={fileUrl} target="_blank" rel="noreferrer" download>
																			Download
																		</a>
																	</Button>
																) : (
																	<Button size="sm" variant="outline" disabled>
																		Download
																	</Button>
																)}
																<Button
																	size="sm"
																	variant="secondary"
																	onClick={() => handleCopyField(filePath, "File path")}
																>
																	Copy path
																</Button>
																{file.id && assetId && (
																	<Button
																		size="sm"
																		variant="destructive"
																		onClick={() => void handleDeleteFile(assetId, file.id)}
																	>
																		<Trash2 className="mr-1 h-3 w-3" />
																		Delete
																	</Button>
																)}
															</div>
														</div>
													);
												})}
											</div>
										) : (
											<div className="text-center text-sm text-muted-foreground py-8">
												{gallerySearch.trim() ? "No files match your search." : "No files attached to this asset."}
											</div>
										);
									})()}
								</div>
							)}
						</div>
					) : (
						<div className="py-8 text-center text-sm text-muted-foreground">No asset details available.</div>
					)}
					<DialogFooter className="mt-6">
						<Button type="button" variant="outline" onClick={() => setIsViewDialogOpen(false)}>
							Close
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<Dialog
				open={isDeleteDialogOpen}
				onOpenChange={(open) => {
					setIsDeleteDialogOpen(open);
					if (!open) {
						setDeleteTarget(null);
					}
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Delete asset</DialogTitle>
					</DialogHeader>
					<div className="space-y-2 text-sm text-muted-foreground">
						<p>Are you sure you want to delete this asset?</p>
						<p className="text-foreground">
							<strong>{deleteTarget?.name ?? "Selected asset"}</strong>
						</p>
					</div>
					<DialogFooter className="mt-6">
						<Button type="button" variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
							Cancel
						</Button>
						<Button type="button" variant="destructive" onClick={handleConfirmDelete}>
							Yes, delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
