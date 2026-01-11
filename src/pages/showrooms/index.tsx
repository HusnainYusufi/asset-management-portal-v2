import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnsType } from "antd/es/table";
import { Table } from "antd";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import apiClient from "@/api/apiClient";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/form";
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

const STEP_LABELS = ["Basics", "Meta Fields", "Templates"];

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
});

export default function ShowroomsPage() {
	const [viewMode, setViewMode] = useState<"table" | "cards">("table");
	const [showrooms, setShowrooms] = useState<ShowroomApiItem[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [open, setOpen] = useState(false);
	const [stepIndex, setStepIndex] = useState(0);
	const [submitting, setSubmitting] = useState(false);
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

	const columns = useMemo<ColumnsType<ShowroomRow>>(
		() => [
			{
				title: "Showroom",
				dataIndex: "name",
				key: "name",
				width: 220,
			},
			{
				title: "Location",
				dataIndex: "location",
				key: "location",
				width: 200,
			},
			{
				title: "Meta Fields",
				dataIndex: "metaCount",
				key: "metaCount",
				width: 140,
			},
			{
				title: "Templates",
				dataIndex: "templateCount",
				key: "templateCount",
				width: 140,
			},
			{
				title: "Last Updated",
				dataIndex: "lastUpdated",
				key: "lastUpdated",
				width: 140,
			},
		],
		[],
	);

	const showroomRows = useMemo(() => showrooms.map(mapShowroomRow), [showrooms]);

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
		if (viewMode === "cards") {
			void fetchShowrooms();
		}
	}, [fetchShowrooms, viewMode]);

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
				if (viewMode === "cards") {
					await fetchShowrooms();
				}
			} else {
				toast.error("Showroom creation failed", { position: "top-center" });
			}
		} catch (_error) {
			// Errors are already surfaced via the API client interceptor.
		} finally {
			setSubmitting(false);
		}
	};

	const isLastStep = stepIndex === STEP_LABELS.length - 1;

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
							pagination={false}
							loading={isLoading}
							columns={columns}
							dataSource={showroomRows}
						/>
					</TabsContent>
					<TabsContent value="cards">
						{isLoading ? (
							<div className="text-sm text-muted-foreground">Loading showrooms...</div>
						) : showrooms.length === 0 ? (
							<div className="text-sm text-muted-foreground">No showrooms yet. Create one to get started.</div>
						) : (
							<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
								{showrooms.map((showroom) => (
									<Card key={showroom._id ?? showroom.id ?? showroom.name} className="border border-border">
										<CardHeader>
											<div className="space-y-1">
												<div className="text-base font-semibold">{showroom.name}</div>
												<div className="text-sm text-muted-foreground">{showroom.location}</div>
											</div>
										</CardHeader>
										<CardContent className="space-y-3">
											<div className="text-xs font-semibold text-muted-foreground">Meta Fields</div>
											{showroom.metaFields?.length ? (
												<div className="space-y-1 text-sm">
													{showroom.metaFields.map((field, index) => (
														<div key={`${field.key}-${index}`} className="flex justify-between gap-2">
															<span className="text-muted-foreground">{field.key}</span>
															<span>{field.value}</span>
														</div>
													))}
												</div>
											) : (
												<div className="text-sm text-muted-foreground">No meta fields</div>
											)}
											<div className="text-xs font-semibold text-muted-foreground">Templates</div>
											{showroom.templates?.length ? (
												<div className="space-y-2 text-sm">
													{showroom.templates.map((template, index) => (
														<div key={`${template.name}-${index}`} className="space-y-1 rounded-md bg-muted/30 p-2">
															<div className="font-medium">{template.name || `Template ${index + 1}`}</div>
															{template.description && (
																<div className="text-xs text-muted-foreground">{template.description}</div>
															)}
															{template.sizes?.length ? (
																<div className="space-y-1 text-xs text-muted-foreground">
																	{template.sizes.map((size, sizeIndex) => (
																		<div key={`${size.label}-${sizeIndex}`} className="flex justify-between gap-2">
																			<span>{size.label || `Size ${sizeIndex + 1}`}</span>
																			<span>
																				{size.width}x{size.height} {size.unit}
																			</span>
																		</div>
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
				<DialogContent className="max-w-3xl">
					<DialogHeader>
						<DialogTitle>Create Showroom</DialogTitle>
					</DialogHeader>
					<Form {...form}>
						<form className="space-y-6" onSubmit={form.handleSubmit(handleCreateShowroom)}>
							<div className="flex flex-wrap gap-2 text-xs font-semibold uppercase text-muted-foreground">
								{STEP_LABELS.map((label, index) => (
									<div
										key={label}
										className={`rounded-full px-3 py-1 ${index === stepIndex ? "bg-primary/10 text-primary" : "bg-muted/40"}`}
									>
										{label}
									</div>
								))}
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
													<Input {...field} />
												</FormControl>
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
													<Input {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
							)}
							{stepIndex === 1 && (
								<div className="space-y-4">
									{metaFieldsArray.fields.map((field, index) => (
										<div key={field.id} className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
											<FormField
												control={form.control}
												name={`metaFields.${index}.key` as const}
												render={({ field }) => (
													<FormItem>
														<FormLabel>Key</FormLabel>
														<FormControl>
															<Input {...field} />
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
															<Input {...field} />
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
									<Button type="button" variant="outline" onClick={() => metaFieldsArray.append(DEFAULT_META_FIELD)}>
										Add Meta Field
									</Button>
								</div>
							)}
							{stepIndex === 2 && (
								<div className="space-y-4">
									{templatesArray.fields.map((template, index) => (
										<TemplateFields key={template.id} index={index} />
									))}
									<Button type="button" variant="outline" onClick={() => templatesArray.append(DEFAULT_TEMPLATE)}>
										Add Template
									</Button>
								</div>
							)}
							<DialogFooter className="gap-2">
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
									<Button
										type="button"
										onClick={() => setStepIndex((prev) => Math.min(prev + 1, STEP_LABELS.length - 1))}
									>
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
