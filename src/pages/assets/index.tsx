import { useMemo, useState } from "react";
import type { ColumnsType } from "antd/es/table";
import { Table } from "antd";
import { toast } from "sonner";

import apiClient from "@/api/apiClient";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/ui/form";
import { Input } from "@/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Switch } from "@/ui/switch";
import { useFieldArray, useForm } from "react-hook-form";

type AssetField = {
	key: string;
	type: string;
	value: string;
	isSecret: boolean;
};

type AssetFormValues = {
	name: string;
	type: string;
	tags: string;
	assetKind: "TEXT" | "FILE";
	fields: AssetField[];
	fileName: string;
	fileUrl: string;
	fileSize: string;
};

type TextAssetRow = {
	id: string;
	name: string;
	type: string;
	tags: string[];
	fields: AssetField[];
	lastUpdated: string;
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

const EMPTY_FIELD: AssetField = { key: "", type: "TEXT", value: "", isSecret: false };

const DEFAULT_FORM_VALUES: AssetFormValues = {
	name: "",
	type: "",
	tags: "",
	assetKind: "TEXT",
	fields: [EMPTY_FIELD],
	fileName: "",
	fileUrl: "",
	fileSize: "",
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
	fileName: "",
	fileUrl: "",
	fileSize: "",
};

const MOCK_TEXT_ASSETS: TextAssetRow[] = [
	{
		id: "asset-text-1",
		name: "Tabby Subscription",
		type: "CREDENTIALS",
		tags: ["subscription", "tabby"],
		fields: [
			{ key: "username", type: "USERNAME", value: "tabby-user", isSecret: false },
			{ key: "password", type: "PASSWORD", value: "SecretPass123!", isSecret: true },
			{ key: "portal", type: "URL", value: "https://example.com", isSecret: false },
		],
		lastUpdated: "2026-01-11",
	},
	{
		id: "asset-text-2",
		name: "Notion Workspace",
		type: "API_TOKEN",
		tags: ["docs", "workspace"],
		fields: [
			{ key: "token", type: "TOKEN", value: "notion_live_****", isSecret: true },
			{ key: "workspace", type: "TEXT", value: "Operations", isSecret: false },
		],
		lastUpdated: "2026-01-08",
	},
];

const MOCK_FILE_ASSETS: FileAssetRow[] = [
	{
		id: "asset-file-1",
		name: "Vendor Contract",
		type: "PDF",
		tags: ["legal", "vendor"],
		fileName: "vendor-contract-2025.pdf",
		fileUrl: "https://example.com/contracts/vendor-contract-2025.pdf",
		fileSize: "2.4 MB",
		lastUpdated: "2026-01-05",
	},
	{
		id: "asset-file-2",
		name: "Brand Assets",
		type: "ZIP",
		tags: ["design", "branding"],
		fileName: "brand-kit-q1.zip",
		fileUrl: "https://example.com/brand/brand-kit-q1.zip",
		fileSize: "38.1 MB",
		lastUpdated: "2025-12-18",
	},
];

const parseTags = (value: string) =>
	value
		.split(",")
		.map((tag) => tag.trim())
		.filter(Boolean);

const createId = () => Math.random().toString(36).slice(2, 10);

export default function AssetsPage() {
	const [textAssets, setTextAssets] = useState<TextAssetRow[]>(MOCK_TEXT_ASSETS);
	const [fileAssets, setFileAssets] = useState<FileAssetRow[]>(MOCK_FILE_ASSETS);
	const [assetView, setAssetView] = useState<"TEXT" | "FILE">("TEXT");
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const form = useForm<AssetFormValues>({
		defaultValues: DEFAULT_FORM_VALUES,
	});
	const fieldsArray = useFieldArray({
		control: form.control,
		name: "fields",
	});
	const assetKind = form.watch("assetKind");

	const textColumns = useMemo<ColumnsType<TextAssetRow>>(
		() => [
			{ title: "Name", dataIndex: "name", key: "name", width: 200 },
			{ title: "Type", dataIndex: "type", key: "type", width: 160 },
			{
				title: "Tags",
				dataIndex: "tags",
				key: "tags",
				width: 220,
				render: (tags: string[]) => (
					<div className="flex flex-wrap gap-2">
						{tags.map((tag) => (
							<Badge key={tag} variant="secondary">
								{tag}
							</Badge>
						))}
					</div>
				),
			},
			{
				title: "Fields",
				dataIndex: "fields",
				key: "fields",
				width: 220,
				render: (fields: AssetField[]) => (
					<div className="text-xs text-muted-foreground">
						<div>{fields.length} fields</div>
						<div className="truncate">{fields.map((field) => field.key).join(", ")}</div>
					</div>
				),
			},
			{ title: "Updated", dataIndex: "lastUpdated", key: "lastUpdated", width: 140 },
		],
		[],
	);

	const fileColumns = useMemo<ColumnsType<FileAssetRow>>(
		() => [
			{ title: "Name", dataIndex: "name", key: "name", width: 220 },
			{ title: "Type", dataIndex: "type", key: "type", width: 120 },
			{
				title: "Tags",
				dataIndex: "tags",
				key: "tags",
				width: 220,
				render: (tags: string[]) => (
					<div className="flex flex-wrap gap-2">
						{tags.map((tag) => (
							<Badge key={tag} variant="secondary">
								{tag}
							</Badge>
						))}
					</div>
				),
			},
			{
				title: "File",
				dataIndex: "fileName",
				key: "fileName",
				width: 260,
				render: (_: string, record: FileAssetRow) => (
					<div className="text-xs text-muted-foreground">
						<div>{record.fileName}</div>
						<div className="truncate">{record.fileUrl}</div>
					</div>
				),
			},
			{ title: "Size", dataIndex: "fileSize", key: "fileSize", width: 120 },
			{ title: "Updated", dataIndex: "lastUpdated", key: "lastUpdated", width: 140 },
		],
		[],
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

	const handleSubmit = async (values: AssetFormValues) => {
		const tags = parseTags(values.tags);
		const payload = {
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

		try {
			await apiClient.post({
				url: "http://localhost:3267/assets",
				data: payload,
			});
		} catch (error) {
			console.error(error);
			toast.error("Failed to create asset", { position: "top-center" });
			return;
		}

		if (values.assetKind === "FILE") {
			const newFileAsset: FileAssetRow = {
				id: createId(),
				name: values.name || values.fileName || "Untitled File Asset",
				type: values.type || "FILE",
				tags,
				fileName: values.fileName || "untitled.file",
				fileUrl: values.fileUrl || "-",
				fileSize: values.fileSize || "-",
				lastUpdated: new Date().toISOString().slice(0, 10),
			};
			setFileAssets((prev) => [newFileAsset, ...prev]);
		} else {
			const newTextAsset: TextAssetRow = {
				id: createId(),
				name: values.name || "Untitled Text Asset",
				type: values.type || "TEXT",
				tags,
				fields: values.fields.filter((field) => field.key || field.value),
				lastUpdated: new Date().toISOString().slice(0, 10),
			};
			setTextAssets((prev) => [newTextAsset, ...prev]);
		}
		toast.success("Asset created", { position: "top-center" });
		form.reset(DEFAULT_FORM_VALUES);
		setIsDialogOpen(false);
	};

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
					</div>
					<div className="mt-4">
						<Table
							rowKey="id"
							size="small"
							scroll={{ x: "max-content" }}
							pagination={false}
							columns={assetView === "TEXT" ? textColumns : fileColumns}
							dataSource={assetView === "TEXT" ? textAssets : fileAssets}
						/>
					</div>
				</CardContent>
			</Card>
			<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
				<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
					<DialogHeader>
						<DialogTitle>Add new asset</DialogTitle>
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
												<Input placeholder="CREDENTIALS" {...field} />
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

							{assetKind === "FILE" && (
								<div className="grid gap-4 md:grid-cols-3">
									<FormField
										control={form.control}
										name="fileName"
										render={({ field }) => (
											<FormItem>
												<FormLabel>File Name</FormLabel>
												<FormControl>
													<Input placeholder="vendor-contract.pdf" {...field} />
												</FormControl>
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="fileUrl"
										render={({ field }) => (
											<FormItem>
												<FormLabel>File URL</FormLabel>
												<FormControl>
													<Input placeholder="https://example.com/file.pdf" {...field} />
												</FormControl>
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="fileSize"
										render={({ field }) => (
											<FormItem>
												<FormLabel>File Size</FormLabel>
												<FormControl>
													<Input placeholder="2.4 MB" {...field} />
												</FormControl>
											</FormItem>
										)}
									/>
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
																		<SelectItem value="TOKEN">TOKEN</SelectItem>
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
																	<span className="text-xs text-muted-foreground">
																		{field.value ? "Yes" : "No"}
																	</span>
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
		</div>
	);
}
