import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnsType } from "antd/es/table";
import { Table } from "antd";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import apiClient from "@/api/apiClient";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Badge } from "@/ui/badge";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/ui/form";
import { Input } from "@/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";

type ShowroomMetaField = {
	key: string;
	value: string;
};

type ShowroomSize = {
	label: string;
	width: number;
	height: number;
	unit: string;
};

type ShowroomTemplate = {
	name: string;
	description: string;
	sizes: ShowroomSize[];
};

type ShowroomApiItem = {
	_id?: string;
	id?: string;
	name: string;
	location: string;
	metaFields?: ShowroomMetaField[];
	templates?: ShowroomTemplate[];
	createdAt?: string;
	updatedAt?: string;
};

type ShowroomsResponse = {
	statusCode?: number;
	message?: string;
	data?: ShowroomApiItem[] | { showrooms?: ShowroomApiItem[] };
	showrooms?: ShowroomApiItem[];
};

type ShowroomRow = {
	id: string;
	name: string;
	location: string;
	metaCount: number;
	templateCount: number;
	lastUpdated: string;
	metaFields?: ShowroomMetaField[];
	templates?: ShowroomTemplate[];
};

type ShowroomFormValues = {
	name: string;
	location: string;
	metaFields: ShowroomMetaField[];
	templates: ShowroomTemplate[];
};

const DEFAULT_META_FIELD: ShowroomMetaField = { key: "", value: "" };
const DEFAULT_SIZE: ShowroomSize = { label: "", width: 0, height: 0, unit: "px" };
const DEFAULT_TEMPLATE: ShowroomTemplate = { name: "", description: "", sizes: [DEFAULT_SIZE] };

const DEFAULT_FORM_VALUES: ShowroomFormValues = {
	name: "",
	location: "",
	metaFields: [DEFAULT_META_FIELD],
	templates: [DEFAULT_TEMPLATE],
};

const STEP_DETAILS = [
	{
		label: "Basics",
		title: "Showroom basics",
		description: "Name your showroom and capture its primary location details.",
	},
	{
		label: "Meta Fields",
		title: "Custom metadata",
		description: "Add optional metadata like staffing, operating hours, or contact details.",
	},
	{
		label: "Templates",
		title: "Template setup",
		description: "Define template layouts with dimensions for consistent showroom assets.",
	},
	{
		label: "Review",
		title: "Review & confirm",
		description: "Double-check the information before creating the showroom.",
	},
];

const formatDate = (value?: string) => (value ? value.slice(0, 10) : "-");

const extractShowrooms = (response: ShowroomsResponse | ShowroomApiItem[] | undefined) => {
	if (Array.isArray(response)) {
		return response;
	}
	if (response && typeof response === "object") {
		if ("data" in response && Array.isArray(response.data)) {
			return response.data;
		}
		if ("data" in response && response.data && typeof response.data === "object" && "showrooms" in response.data) {
			const nested = response.data as { showrooms?: ShowroomApiItem[] };
			if (Array.isArray(nested.showrooms)) {
				return nested.showrooms;
			}
		}
		if ("showrooms" in response && Array.isArray(response.showrooms)) {
			return response.showrooms;
		}
	}
	return [];
};

const mapShowroomRow = (item: ShowroomApiItem): ShowroomRow => ({
	id: item._id ?? item.id ?? `${item.name}-${item.location}`,
	name: item.name,
	location: item.location,
	metaCount: item.metaFields?.length ?? 0,
	templateCount: item.templates?.length ?? 0,
	lastUpdated: formatDate(item.updatedAt ?? item.createdAt),
	metaFields: item.metaFields ?? [],
	templates: item.templates ?? [],
});

export default function ShowroomsPage() {
	const [viewMode, setViewMode] = useState<"table" | "cards">("table");
	const [showrooms, setShowrooms] = useState<ShowroomApiItem[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [open, setOpen] = useState(false);
	const [stepIndex, setStepIndex] = useState(0);
	const [submitting, setSubmitting] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const form = useForm<ShowroomFormValues>({
		defaultValues: DEFAULT_FORM_VALUES,
	});
	const metaFieldsArray = useFieldArray({
		control: form.control,
		name: "metaFields",
	});
	const templatesArray = useFieldArray({
		control: form.control,
		name: "templates",
	});
	const watchedValues = form.watch();

	const columns = useMemo<ColumnsType<ShowroomRow>>(
		() => [
			{
				title: "Showroom",
				dataIndex: "name",
				key: "name",
				width: 220,
				sorter: (a, b) => a.name.localeCompare(b.name),
				render: (_, record) => (
					<div className="space-y-1">
						<div className="font-medium text-foreground">{record.name}</div>
						<div className="text-xs text-muted-foreground">ID: {record.id}</div>
					</div>
				),
			},
			{
				title: "Location",
				dataIndex: "location",
				key: "location",
				width: 200,
				sorter: (a, b) => a.location.localeCompare(b.location),
			},
			{
				title: "Meta Fields",
				dataIndex: "metaCount",
				key: "metaCount",
				width: 140,
				sorter: (a, b) => a.metaCount - b.metaCount,
				render: (value: number) => <span className="font-medium">{value}</span>,
			},
			{
				title: "Templates",
				dataIndex: "templateCount",
				key: "templateCount",
				width: 140,
				sorter: (a, b) => a.templateCount - b.templateCount,
				render: (value: number) => <span className="font-medium">{value}</span>,
			},
			{
				title: "Last Updated",
				dataIndex: "lastUpdated",
				key: "lastUpdated",
				width: 140,
				sorter: (a, b) => a.lastUpdated.localeCompare(b.lastUpdated),
			},
		],
		[],
	);

	const filteredShowrooms = useMemo(() => {
		const normalized = searchTerm.trim().toLowerCase();
		if (!normalized) {
			return showrooms;
		}
		return showrooms.filter((showroom) => {
			const metaMatch =
				showroom.metaFields?.some((field) => `${field.key} ${field.value}`.toLowerCase().includes(normalized)) ?? false;
			const templateMatch =
				showroom.templates?.some((template) =>
					`${template.name} ${template.description ?? ""}`.toLowerCase().includes(normalized),
				) ?? false;
			return (
				showroom.name.toLowerCase().includes(normalized) ||
				showroom.location.toLowerCase().includes(normalized) ||
				metaMatch ||
				templateMatch
			);
		});
	}, [searchTerm, showrooms]);

	const showroomRows = useMemo(() => filteredShowrooms.map(mapShowroomRow), [filteredShowrooms]);
	const summaryCounts = useMemo(
		() => ({
			total: showrooms.length,
			filtered: filteredShowrooms.length,
		}),
		[filteredShowrooms.length, showrooms.length],
	);

	const fetchShowrooms = useCallback(async () => {
		setIsLoading(true);
		try {
			const response = await apiClient.get<ShowroomsResponse | ShowroomApiItem[]>({ url: "/showrooms" });
			setShowrooms(extractShowrooms(response));
		} catch (_error) {
			// Errors are already surfaced via the API client interceptor.
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		void fetchShowrooms();
	}, [fetchShowrooms]);

	const handleOpen = () => {
		form.reset(DEFAULT_FORM_VALUES);
		setStepIndex(0);
		setOpen(true);
	};

	const handleClose = () => {
		setOpen(false);
	};

	const buildPayload = (values: ShowroomFormValues) => ({
		name: values.name.trim(),
		location: values.location.trim(),
		metaFields: values.metaFields
			.filter((field) => field.key.trim() || field.value.trim())
			.map((field) => ({ key: field.key.trim(), value: field.value.trim() })),
		templates: values.templates
			.filter(
				(template) =>
					template.name.trim() ||
					template.description.trim() ||
					template.sizes.some((size) => size.label.trim() || size.width || size.height || size.unit.trim()),
			)
			.map((template) => ({
				name: template.name.trim(),
				description: template.description.trim(),
				sizes: template.sizes
					.filter((size) => size.label.trim() || size.width || size.height || size.unit.trim())
					.map((size) => ({
						label: size.label.trim(),
						width: size.width,
						height: size.height,
						unit: size.unit.trim(),
					})),
			})),
	});

	const handleCreateShowroom = async (values: ShowroomFormValues) => {
		setSubmitting(true);
		try {
			const payload = buildPayload(values);
			const response = await apiClient.post<ShowroomApiItem | ShowroomsResponse>({
				url: "/showrooms",
				data: payload,
			});
			if (response) {
				toast.success("SHOWROOM CREATED", { position: "top-center" });
				setOpen(false);
				await fetchShowrooms();
			} else {
				toast.error("Showroom creation failed", { position: "top-center" });
			}
		} catch (_error) {
			// Errors are already surfaced via the API client interceptor.
		} finally {
			setSubmitting(false);
		}
	};

	const handleNextStep = async () => {
		if (stepIndex === 0) {
			const isValid = await form.trigger(["name", "location"]);
			if (!isValid) {
				return;
			}
		}
		setStepIndex((prev) => Math.min(prev + 1, STEP_DETAILS.length - 1));
	};

	const isLastStep = stepIndex === STEP_DETAILS.length - 1;
	const currentStep = STEP_DETAILS[stepIndex];

	const TemplateFields = ({ index }: { index: number }) => {
		const sizesArray = useFieldArray({
			control: form.control,
			name: `templates.${index}.sizes` as const,
		});

		return (
			<div className="space-y-4 rounded-lg border border-border p-4">
				<div className="flex items-center justify-between">
					<div className="text-sm font-semibold">Template {index + 1}</div>
					<Button
						type="button"
						variant="ghost"
						onClick={() => templatesArray.remove(index)}
						disabled={templatesArray.fields.length === 1}
					>
						Remove Template
					</Button>
				</div>
				<div className="grid gap-4 md:grid-cols-2">
					<FormField
						control={form.control}
						name={`templates.${index}.name` as const}
						render={({ field }) => (
							<FormItem>
								<FormLabel>Template Name</FormLabel>
								<FormControl>
									<Input {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name={`templates.${index}.description` as const}
						render={({ field }) => (
							<FormItem>
								<FormLabel>Description</FormLabel>
								<FormControl>
									<Input {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
				<div className="space-y-3">
					{sizesArray.fields.map((size, sizeIndex) => (
						<div key={size.id} className="space-y-2 rounded-md bg-muted/20 p-3">
							<div className="flex items-center justify-between">
								<div className="text-xs font-semibold text-muted-foreground">Size {sizeIndex + 1}</div>
								<Button
									type="button"
									variant="ghost"
									onClick={() => sizesArray.remove(sizeIndex)}
									disabled={sizesArray.fields.length === 1}
								>
									Remove Size
								</Button>
							</div>
							<div className="grid gap-4 md:grid-cols-4">
								<FormField
									control={form.control}
									name={`templates.${index}.sizes.${sizeIndex}.label` as const}
									render={({ field }) => (
										<FormItem>
											<FormLabel>Label</FormLabel>
											<FormControl>
												<Input {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name={`templates.${index}.sizes.${sizeIndex}.width` as const}
									render={({ field }) => (
										<FormItem>
											<FormLabel>Width</FormLabel>
											<FormControl>
												<Input
													type="number"
													value={Number.isNaN(field.value) ? "" : (field.value ?? "")}
													onChange={(event) => {
														const value = event.target.value;
														field.onChange(value === "" ? 0 : Number(value));
													}}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name={`templates.${index}.sizes.${sizeIndex}.height` as const}
									render={({ field }) => (
										<FormItem>
											<FormLabel>Height</FormLabel>
											<FormControl>
												<Input
													type="number"
													value={Number.isNaN(field.value) ? "" : (field.value ?? "")}
													onChange={(event) => {
														const value = event.target.value;
														field.onChange(value === "" ? 0 : Number(value));
													}}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name={`templates.${index}.sizes.${sizeIndex}.unit` as const}
									render={({ field }) => (
										<FormItem>
											<FormLabel>Unit</FormLabel>
											<FormControl>
												<Input {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</div>
					))}
				</div>
				<Button type="button" variant="outline" onClick={() => sizesArray.append(DEFAULT_SIZE)}>
					Add Size
				</Button>
			</div>
		);
	};

	const renderExpandedRow = (record: ShowroomRow) => (
		<div className="grid gap-4 md:grid-cols-2">
			<div className="rounded-md border border-border bg-muted/20 p-4">
				<div className="text-xs font-semibold uppercase text-muted-foreground">Meta Fields</div>
				{record.metaFields?.length ? (
					<div className="mt-3 flex flex-wrap gap-2">
						{record.metaFields.map((field, index) => (
							<Badge key={`${field.key}-${index}`} variant="secondary">
								{field.key || "Key"}: {field.value || "Value"}
							</Badge>
						))}
					</div>
				) : (
					<div className="mt-2 text-sm text-muted-foreground">No meta fields configured.</div>
				)}
			</div>
			<div className="rounded-md border border-border bg-muted/20 p-4">
				<div className="text-xs font-semibold uppercase text-muted-foreground">Templates</div>
				{record.templates?.length ? (
					<div className="mt-3 space-y-3 text-sm">
						{record.templates.map((template, index) => (
							<div key={`${template.name}-${index}`} className="space-y-1">
								<div className="font-medium">{template.name || `Template ${index + 1}`}</div>
								{template.description && <div className="text-xs text-muted-foreground">{template.description}</div>}
								{template.sizes?.length ? (
									<div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
										{template.sizes.map((size, sizeIndex) => (
											<Badge key={`${size.label}-${sizeIndex}`} variant="outline">
												{size.label || `Size ${sizeIndex + 1}`}: {size.width}x{size.height} {size.unit}
											</Badge>
										))}
									</div>
								) : (
									<div className="text-xs text-muted-foreground">No sizes configured.</div>
								)}
							</div>
						))}
					</div>
				) : (
					<div className="mt-2 text-sm text-muted-foreground">No templates configured.</div>
				)}
			</div>
		</div>
	);

	const reviewMetaFields = watchedValues.metaFields?.filter((field) => field.key.trim() || field.value.trim()) ?? [];
	const reviewTemplates =
		watchedValues.templates?.filter(
			(template) =>
				template.name.trim() ||
				template.description.trim() ||
				template.sizes.some((size) => size.label.trim() || size.width || size.height || size.unit.trim()),
		) ?? [];

	return (
		<Card>
			<CardHeader>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<div className="text-lg font-semibold">Showrooms</div>
						<div className="text-sm text-muted-foreground">
							Switch between table and card views to manage showrooms.
						</div>
					</div>
					<Button onClick={handleOpen}>Create Showroom</Button>
				</div>
			</CardHeader>
			<CardContent>
				<div className="flex flex-wrap items-center justify-between gap-3 pb-4">
					<div className="space-y-1 text-sm text-muted-foreground">
						<div className="font-medium text-foreground">Showrooms overview</div>
						<div>
							Showing {summaryCounts.filtered} of {summaryCounts.total} showrooms
						</div>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Input
							placeholder="Search by name, location, meta fields, or templates"
							value={searchTerm}
							onChange={(event) => setSearchTerm(event.target.value)}
							className="w-full sm:w-80"
						/>
					</div>
				</div>
				<Tabs
					value={viewMode}
					onValueChange={(value) => setViewMode(value === "cards" ? "cards" : "table")}
					className="space-y-4"
				>
					<TabsList>
						<TabsTrigger value="table">Table</TabsTrigger>
						<TabsTrigger value="cards">Cards</TabsTrigger>
					</TabsList>
					<TabsContent value="table">
						<Table
							rowKey="id"
							size="small"
							scroll={{ x: "max-content" }}
							pagination={{ pageSize: 6, showSizeChanger: true, pageSizeOptions: [6, 12, 24, 48] }}
							loading={isLoading}
							columns={columns}
							dataSource={showroomRows}
							expandable={{
								expandedRowRender: renderExpandedRow,
							}}
						/>
					</TabsContent>
					<TabsContent value="cards">
						{isLoading ? (
							<div className="text-sm text-muted-foreground">Loading showrooms...</div>
						) : filteredShowrooms.length === 0 ? (
							<div className="text-sm text-muted-foreground">
								No showrooms match your search. Try adjusting the filters.
							</div>
						) : (
							<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
								{filteredShowrooms.map((showroom) => (
									<Card key={showroom._id ?? showroom.id ?? showroom.name} className="border border-border">
										<CardHeader>
											<div className="space-y-2">
												<div>
													<div className="text-base font-semibold">{showroom.name}</div>
													<div className="text-sm text-muted-foreground">{showroom.location}</div>
												</div>
												<div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
													<Badge variant="outline">{showroom.metaFields?.length ?? 0} meta fields</Badge>
													<Badge variant="outline">{showroom.templates?.length ?? 0} templates</Badge>
												</div>
											</div>
										</CardHeader>
										<CardContent className="space-y-3">
											<div className="text-xs font-semibold text-muted-foreground">Meta Fields</div>
											{showroom.metaFields?.length ? (
												<div className="flex flex-wrap gap-2 text-sm">
													{showroom.metaFields.map((field, index) => (
														<Badge key={`${field.key}-${index}`} variant="secondary">
															{field.key}: {field.value}
														</Badge>
													))}
												</div>
											) : (
												<div className="text-sm text-muted-foreground">No meta fields</div>
											)}
											<div className="text-xs font-semibold text-muted-foreground">Templates</div>
											{showroom.templates?.length ? (
												<div className="space-y-2 text-sm">
													{showroom.templates.map((template, index) => (
														<div key={`${template.name}-${index}`} className="space-y-2 rounded-md bg-muted/30 p-3">
															<div className="font-medium">{template.name || `Template ${index + 1}`}</div>
															{template.description && (
																<div className="text-xs text-muted-foreground">{template.description}</div>
															)}
															{template.sizes?.length ? (
																<div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
																	{template.sizes.map((size, sizeIndex) => (
																		<Badge key={`${size.label}-${sizeIndex}`} variant="outline">
																			{size.label || `Size ${sizeIndex + 1}`}: {size.width}x{size.height} {size.unit}
																		</Badge>
																	))}
																</div>
															) : (
																<div className="text-xs text-muted-foreground">No sizes configured</div>
															)}
														</div>
													))}
												</div>
											) : (
												<div className="text-sm text-muted-foreground">No templates</div>
											)}
										</CardContent>
									</Card>
								))}
							</div>
						)}
					</TabsContent>
				</Tabs>
			</CardContent>

			<Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
				<DialogContent className="max-h-[90vh] w-[95vw] max-w-6xl overflow-y-auto border border-primary/20 bg-background/95 p-0 shadow-2xl sm:max-w-6xl">
					<DialogHeader className="border-b border-border bg-muted/40 px-8 py-6">
						<DialogTitle className="text-2xl font-semibold">Create Showroom</DialogTitle>
						<div className="text-sm text-muted-foreground">
							Follow the guided steps to build a complete showroom profile.
						</div>
					</DialogHeader>
					<Form {...form}>
						<form className="space-y-8 px-8 py-6" onSubmit={form.handleSubmit(handleCreateShowroom)}>
							<div className="grid gap-6 lg:grid-cols-[260px_1fr]">
								<div className="space-y-3 rounded-xl border border-border bg-muted/30 p-5 shadow-sm">
									<div className="text-xs font-semibold uppercase text-muted-foreground">Progress</div>
									{STEP_DETAILS.map((step, index) => (
										<div
											key={step.label}
											className={`rounded-lg border px-3 py-3 text-sm transition ${
												index === stepIndex
													? "border-primary/40 bg-primary/15 text-primary shadow-sm"
													: "border-border text-muted-foreground hover:border-primary/30"
											}`}
										>
											<div className="text-xs font-semibold uppercase">{step.label}</div>
											<div className="text-sm font-medium">{step.title}</div>
										</div>
									))}
								</div>
								<div className="space-y-6">
									<div>
										<div className="text-xl font-semibold">{currentStep.title}</div>
										<div className="text-sm text-muted-foreground">{currentStep.description}</div>
									</div>
									{stepIndex === 0 && (
										<div className="grid gap-4 md:grid-cols-2">
											<FormField
												control={form.control}
												name="name"
												rules={{ required: "Showroom name is required" }}
												render={({ field }) => (
													<FormItem>
														<FormLabel>Name</FormLabel>
														<FormControl>
															<Input placeholder="e.g. Riyadh Showroom" {...field} />
														</FormControl>
														<FormDescription>Use a clear, recognizable showroom name.</FormDescription>
														<FormMessage />
													</FormItem>
												)}
											/>
											<FormField
												control={form.control}
												name="location"
												rules={{ required: "Location is required" }}
												render={({ field }) => (
													<FormItem>
														<FormLabel>Location</FormLabel>
														<FormControl>
															<Input placeholder="e.g. Saudi Arabia" {...field} />
														</FormControl>
														<FormDescription>Provide a city, country, or key area.</FormDescription>
														<FormMessage />
													</FormItem>
												)}
											/>
										</div>
									)}
									{stepIndex === 1 && (
										<div className="space-y-4">
											<div className="rounded-md border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
												Add details like staffing levels, operating hours, or a key contact number. These fields are
												optional.
											</div>
											{metaFieldsArray.fields.map((field, index) => (
												<div key={field.id} className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
													<FormField
														control={form.control}
														name={`metaFields.${index}.key` as const}
														render={({ field }) => (
															<FormItem>
																<FormLabel>Key</FormLabel>
																<FormControl>
																	<Input placeholder="e.g. staff" {...field} />
																</FormControl>
																<FormMessage />
															</FormItem>
														)}
													/>
													<FormField
														control={form.control}
														name={`metaFields.${index}.value` as const}
														render={({ field }) => (
															<FormItem>
																<FormLabel>Value</FormLabel>
																<FormControl>
																	<Input placeholder="e.g. 60" {...field} />
																</FormControl>
																<FormMessage />
															</FormItem>
														)}
													/>
													<div className="flex items-end">
														<Button
															type="button"
															variant="ghost"
															onClick={() => metaFieldsArray.remove(index)}
															disabled={metaFieldsArray.fields.length === 1}
														>
															Remove
														</Button>
													</div>
												</div>
											))}
											<Button
												type="button"
												variant="outline"
												onClick={() => metaFieldsArray.append(DEFAULT_META_FIELD)}
											>
												Add Meta Field
											</Button>
										</div>
									)}
									{stepIndex === 2 && (
										<div className="space-y-4">
											<div className="rounded-md border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
												Templates help standardize showroom assets. Define at least one template with relevant
												dimensions.
											</div>
											{templatesArray.fields.map((template, index) => (
												<TemplateFields key={template.id} index={index} />
											))}
											<Button type="button" variant="outline" onClick={() => templatesArray.append(DEFAULT_TEMPLATE)}>
												Add Template
											</Button>
										</div>
									)}
									{stepIndex === 3 && (
										<div className="space-y-4">
											<div className="grid gap-4 md:grid-cols-2">
												<div className="rounded-md border border-border bg-muted/20 p-4">
													<div className="text-xs font-semibold uppercase text-muted-foreground">Basics</div>
													<div className="mt-3 space-y-1 text-sm">
														<div>
															<span className="text-muted-foreground">Name: </span>
															<span className="font-medium">{watchedValues.name || "—"}</span>
														</div>
														<div>
															<span className="text-muted-foreground">Location: </span>
															<span className="font-medium">{watchedValues.location || "—"}</span>
														</div>
													</div>
												</div>
												<div className="rounded-md border border-border bg-muted/20 p-4">
													<div className="text-xs font-semibold uppercase text-muted-foreground">Meta Fields</div>
													{reviewMetaFields.length ? (
														<div className="mt-3 flex flex-wrap gap-2">
															{reviewMetaFields.map((field, index) => (
																<Badge key={`${field.key}-${index}`} variant="secondary">
																	{field.key}: {field.value}
																</Badge>
															))}
														</div>
													) : (
														<div className="mt-2 text-sm text-muted-foreground">No meta fields added.</div>
													)}
												</div>
											</div>
											<div className="rounded-md border border-border bg-muted/20 p-4">
												<div className="text-xs font-semibold uppercase text-muted-foreground">Templates</div>
												{reviewTemplates.length ? (
													<div className="mt-3 space-y-3 text-sm">
														{reviewTemplates.map((template, index) => (
															<div key={`${template.name}-${index}`} className="space-y-1">
																<div className="font-medium">{template.name || `Template ${index + 1}`}</div>
																{template.description && (
																	<div className="text-xs text-muted-foreground">{template.description}</div>
																)}
																{template.sizes?.length ? (
																	<div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
																		{template.sizes.map((size, sizeIndex) => (
																			<Badge key={`${size.label}-${sizeIndex}`} variant="outline">
																				{size.label || `Size ${sizeIndex + 1}`}: {size.width}x{size.height} {size.unit}
																			</Badge>
																		))}
																	</div>
																) : (
																	<div className="text-xs text-muted-foreground">No sizes configured.</div>
																)}
															</div>
														))}
													</div>
												) : (
													<div className="mt-2 text-sm text-muted-foreground">No templates added.</div>
												)}
											</div>
										</div>
									)}
								</div>
							</div>
							<DialogFooter className="gap-2 border-t border-border px-8 py-6">
								<Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
									Cancel
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={() => setStepIndex((prev) => Math.max(prev - 1, 0))}
									disabled={stepIndex === 0 || submitting}
								>
									Back
								</Button>
								{isLastStep ? (
									<Button type="submit" disabled={submitting}>
										Create Showroom
									</Button>
								) : (
									<Button type="button" onClick={handleNextStep}>
										Next
									</Button>
								)}
							</DialogFooter>
						</form>
					</Form>
				</DialogContent>
			</Dialog>
		</Card>
	);
}
