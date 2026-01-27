import { useState } from "react";
import { Copy, Check, Key, Lock, Eye, EyeOff } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/ui/sheet";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { toast } from "sonner";

type CredentialField = {
	key: string;
	type: string;
	value: string;
	isSecret?: boolean;
};

type Credential = {
	id: string;
	name: string;
	type: string;
	fields: CredentialField[];
	tags?: string[];
	createdAt?: string;
	updatedAt?: string;
};

type CredentialsDrawerProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	showroomId: string;
	showroomName: string;
	credentials: Credential[];
	isLoading?: boolean;
};

export function CredentialsDrawer({
	open,
	onOpenChange,
	showroomId: _showroomId,
	showroomName,
	credentials,
	isLoading = false,
}: CredentialsDrawerProps) {
	const [copiedField, setCopiedField] = useState<string | null>(null);
	const [revealedFields, setRevealedFields] = useState<Record<string, boolean>>({});

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

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
				<SheetHeader>
					<SheetTitle className="flex items-center gap-2">
						<Key className="h-5 w-5" />
						Quick Access Credentials
					</SheetTitle>
					<SheetDescription>
						Viewing credentials for <span className="font-semibold text-foreground">{showroomName}</span>
					</SheetDescription>
				</SheetHeader>

				<div className="mt-6 space-y-4">
					{isLoading ? (
						<div className="flex items-center justify-center py-12">
							<div className="text-sm text-muted-foreground">Loading credentials...</div>
						</div>
					) : credentials.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<Lock className="h-12 w-12 text-muted-foreground/50 mb-4" />
							<div className="text-sm font-medium text-muted-foreground">No credentials found</div>
							<div className="text-xs text-muted-foreground mt-1">
								Add text assets to this showroom to see them here
							</div>
						</div>
					) : (
						credentials.map((credential) => (
							<Card key={credential.id} className="border-primary/20">
								<CardHeader className="pb-3">
									<div className="flex items-start justify-between">
										<div className="space-y-1">
											<CardTitle className="text-base">{credential.name}</CardTitle>
											<div className="flex items-center gap-2">
												<Badge variant="secondary" className="text-xs">
													{credential.type}
												</Badge>
												{credential.tags?.map((tag) => (
													<Badge key={tag} variant="outline" className="text-xs">
														{tag}
													</Badge>
												))}
											</div>
										</div>
									</div>
								</CardHeader>
								<CardContent className="space-y-3">
									{credential.fields.map((field, index) => (
										<div
											key={`${credential.id}-${field.key}-${index}`}
											className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3"
										>
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2 mb-1">
													<div className="text-xs font-semibold text-muted-foreground uppercase">{field.key}</div>
													{field.isSecret && <Lock className="h-3 w-3 text-muted-foreground" />}
												</div>
												<div className="text-sm font-mono break-all">
													{field.isSecret && !revealedFields[`${credential.id}-${field.key}`]
														? "••••••••"
														: field.value || "-"}
												</div>
											</div>
											<div className="flex items-center gap-1 shrink-0">
												{field.isSecret && (
													<Button
														type="button"
														variant="ghost"
														size="icon"
														onClick={() => handleToggleReveal(`${credential.id}-${field.key}`)}
													>
														{revealedFields[`${credential.id}-${field.key}`] ? (
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
													onClick={() => void handleCopy(field.value, `${credential.id}-${field.key}`)}
												>
													{copiedField === `${credential.id}-${field.key}` ? (
														<Check className="h-4 w-4 text-green-500" />
													) : (
														<Copy className="h-4 w-4" />
													)}
												</Button>
											</div>
										</div>
									))}
								</CardContent>
							</Card>
						))
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}
