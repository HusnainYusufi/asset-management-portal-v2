import { useEffect, useState } from "react";
import apiClient from "@/api/apiClient";
import { useUserInfo } from "@/store/userStore";
import { Card, CardContent } from "@/ui/card";
import { Title, Text } from "@/ui/typography";
import Icon from "@/components/icon/icon";
import { rgbAlpha } from "@/utils/theme";

type SuperadminStats = {
	clients: number;
	users: number;
	assets: number;
	showrooms: number;
	showroomAssets: number;
	unreadNotifications: number;
};

type ClientStats = {
	assets: number;
	showrooms: number;
	showroomAssets: number;
	unreadNotifications: number;
	expiringSoon: number;
};

type DashboardResponse = {
	role: string;
	stats: SuperadminStats | ClientStats;
};

type StatCard = {
	key: string;
	icon: string;
	label: string;
	value: number;
	color: string;
};

function buildSuperadminCards(stats: SuperadminStats): StatCard[] {
	return [
		{
			key: "clients",
			icon: "solar:users-group-rounded-bold-duotone",
			label: "Total Clients",
			value: stats.clients,
			color: "#3b82f6",
		},
		{ key: "users", icon: "solar:user-bold-duotone", label: "Total Users", value: stats.users, color: "#8b5cf6" },
		{
			key: "assets",
			icon: "solar:box-minimalistic-bold-duotone",
			label: "Total Assets",
			value: stats.assets,
			color: "#10b981",
		},
		{
			key: "showrooms",
			icon: "solar:shop-bold-duotone",
			label: "Total Showrooms",
			value: stats.showrooms,
			color: "#f59e42",
		},
		{
			key: "showroomAssets",
			icon: "solar:folder-with-files-bold-duotone",
			label: "Showroom Assets",
			value: stats.showroomAssets,
			color: "#06b6d4",
		},
		{
			key: "notifications",
			icon: "solar:bell-bold-duotone",
			label: "Unread Notifications",
			value: stats.unreadNotifications,
			color: "#ef4444",
		},
	];
}

function buildClientCards(stats: ClientStats): StatCard[] {
	return [
		{
			key: "assets",
			icon: "solar:box-minimalistic-bold-duotone",
			label: "Total Assets",
			value: stats.assets,
			color: "#3b82f6",
		},
		{
			key: "showrooms",
			icon: "solar:shop-bold-duotone",
			label: "Total Showrooms",
			value: stats.showrooms,
			color: "#10b981",
		},
		{
			key: "showroomAssets",
			icon: "solar:folder-with-files-bold-duotone",
			label: "Showroom Assets",
			value: stats.showroomAssets,
			color: "#f59e42",
		},
		{
			key: "notifications",
			icon: "solar:bell-bold-duotone",
			label: "Unread Notifications",
			value: stats.unreadNotifications,
			color: "#ef4444",
		},
		{
			key: "expiringSoon",
			icon: "solar:alarm-bold-duotone",
			label: "Expiring Soon",
			value: stats.expiringSoon,
			color: "#f97316",
		},
	];
}

export default function Dashboard() {
	const userInfo = useUserInfo();
	const [loading, setLoading] = useState(true);
	const [cards, setCards] = useState<StatCard[]>([]);

	useEffect(() => {
		let cancelled = false;
		async function fetchStats() {
			try {
				const res = await apiClient.get<DashboardResponse>({ url: "/dashboard/stats" });
				if (cancelled) return;
				const data = (res as unknown as { data?: DashboardResponse }).data ?? (res as unknown as DashboardResponse);
				if (data.role === "SUPERADMIN") {
					setCards(buildSuperadminCards(data.stats as SuperadminStats));
				} else {
					setCards(buildClientCards(data.stats as ClientStats));
				}
			} catch {
				// error is shown by apiClient interceptor toast
			} finally {
				if (!cancelled) setLoading(false);
			}
		}
		fetchStats();
		return () => {
			cancelled = true;
		};
	}, []);

	const roleName = userInfo.roleName ?? userInfo.roles?.[0]?.name ?? "User";
	const displayName = userInfo.name ?? userInfo.username ?? userInfo.email ?? "User";

	return (
		<div className="flex flex-col gap-6 w-full p-2">
			{/* Welcome Banner */}
			<Card className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-0">
				<CardContent className="p-6">
					<Title as="h3" className="text-white mb-1">
						Welcome back, {displayName}
					</Title>
					<Text variant="body1" className="text-blue-100">
						Role: {roleName}
					</Text>
				</CardContent>
			</Card>

			{/* Stat Cards */}
			{loading ? (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{Array.from({ length: 6 }).map((_, i) => (
						<Card key={`skeleton-${String(i)}`} className="animate-pulse">
							<CardContent className="p-6">
								<div className="h-16 bg-muted rounded" />
							</CardContent>
						</Card>
					))}
				</div>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{cards.map((card) => (
						<Card key={card.key} className="transition-shadow hover:shadow-md">
							<CardContent className="flex items-center gap-4 p-6">
								<div className="rounded-xl p-3" style={{ background: rgbAlpha(card.color, 0.1) }}>
									<Icon icon={card.icon} size={32} color={card.color} />
								</div>
								<div className="flex flex-col">
									<Text variant="body2" color="secondary" className="mb-1">
										{card.label}
									</Text>
									<Title as="h3" className="text-3xl font-bold">
										{card.value.toLocaleString()}
									</Title>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
