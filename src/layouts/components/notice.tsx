import CyanBlur from "@/assets/images/background/cyan-blur.png";
import RedBlur from "@/assets/images/background/red-blur.png";
import { Icon } from "@/components/icon";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { ScrollArea } from "@/ui/scroll-area";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/ui/sheet";
import { Text } from "@/ui/typography";
import { type CSSProperties, useEffect, useState } from "react";
import {
	useNotifications,
	useUnreadCount,
	useNotificationActions,
	useNotificationLoading,
	type Notification,
} from "@/store/notificationStore";
import { formatDistanceToNow } from "date-fns";

export default function NoticeButton() {
	const [drawerOpen, setDrawerOpen] = useState(false);
	const notifications = useNotifications();
	const unreadCount = useUnreadCount();
	const isLoading = useNotificationLoading();
	const { fetchNotifications, fetchUnreadCount, markAsRead, markAllAsRead } = useNotificationActions();

	const style: CSSProperties = {
		backdropFilter: "blur(20px)",
		backgroundImage: `url("${CyanBlur}"), url("${RedBlur}")`,
		backgroundRepeat: "no-repeat, no-repeat",
		backgroundPosition: "right top, left bottom",
		backgroundSize: "50%, 50%",
	};

	// Fetch notifications when drawer opens
	useEffect(() => {
		if (drawerOpen) {
			void fetchNotifications();
		}
	}, [drawerOpen, fetchNotifications]);

	// Fetch unread count on mount and periodically
	useEffect(() => {
		void fetchUnreadCount();
		const interval = setInterval(() => {
			void fetchUnreadCount();
		}, 60000); // Check every minute
		return () => clearInterval(interval);
	}, [fetchUnreadCount]);

	const handleMarkAllAsRead = async () => {
		await markAllAsRead();
	};

	const handleNotificationClick = async (notification: Notification) => {
		if (!notification.isRead) {
			await markAsRead(notification.id);
		}
	};

	const getTimeAgo = (dateString: string) => {
		try {
			return formatDistanceToNow(new Date(dateString), { addSuffix: true });
		} catch {
			return "Recently";
		}
	};

	const getNotificationIcon = (type: string, daysUntilExpiry?: number) => {
		if (type === "EXPIRATION_TODAY" || daysUntilExpiry === 0) {
			return "solar:danger-triangle-bold-duotone";
		}
		return "solar:alarm-bold-duotone";
	};

	const getNotificationColor = (type: string, daysUntilExpiry?: number) => {
		if (type === "EXPIRATION_TODAY" || daysUntilExpiry === 0) {
			return "text-red-500";
		}
		if (daysUntilExpiry && daysUntilExpiry <= 2) {
			return "text-orange-500";
		}
		return "text-yellow-500";
	};

	return (
		<>
			<div
				className="relative cursor-pointer"
				role="button"
				tabIndex={0}
				onClick={() => setDrawerOpen(true)}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						setDrawerOpen(true);
					}
				}}
			>
				<Button variant="ghost" size="icon" className="rounded-full">
					<Icon icon="solar:bell-bing-bold-duotone" size={24} />
				</Button>
				{unreadCount > 0 && (
					<Badge variant="destructive" shape="circle" className="absolute -right-2 -top-2">
						{unreadCount > 99 ? "99+" : unreadCount}
					</Badge>
				)}
			</div>
			<Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
				<SheetContent side="right" className="sm:max-w-md p-0 [&>button]:hidden flex flex-col" style={style}>
					<SheetHeader className="flex flex-row items-center justify-between p-4 h-16 shrink-0">
						<SheetTitle>Notifications</SheetTitle>
						<Button
							variant="ghost"
							size="icon"
							className="rounded-full text-primary"
							onClick={() => void handleMarkAllAsRead()}
							title="Mark all as read"
						>
							<Icon icon="solar:check-read-broken" size={20} />
						</Button>
					</SheetHeader>
					<div className="flex-1 overflow-hidden">
						{isLoading ? (
							<div className="flex items-center justify-center h-full">
								<Text color="secondary">Loading notifications...</Text>
							</div>
						) : notifications.length === 0 ? (
							<div className="flex flex-col items-center justify-center h-full gap-3 px-4">
								<Icon icon="solar:bell-off-bold-duotone" size={48} className="text-muted-foreground/50" />
								<Text color="secondary">No notifications yet</Text>
								<Text variant="caption" color="secondary" className="text-center">
									You will receive notifications here when your subscriptions are about to expire
								</Text>
							</div>
						) : (
							<ScrollArea className="h-full">
								<div className="space-y-1 p-2">
									{notifications.map((notification) => (
										<div
											key={notification.id}
											role="button"
											tabIndex={0}
											className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
												notification.isRead ? "bg-transparent hover:bg-muted/30" : "bg-primary/5 hover:bg-primary/10"
											}`}
											onClick={() => void handleNotificationClick(notification)}
											onKeyDown={(e) => {
												if (e.key === "Enter" || e.key === " ") {
													void handleNotificationClick(notification);
												}
											}}
										>
											<div
												className={`p-2 rounded-full bg-muted/50 ${getNotificationColor(
													notification.type,
													notification.daysUntilExpiry,
												)}`}
											>
												<Icon icon={getNotificationIcon(notification.type, notification.daysUntilExpiry)} size={20} />
											</div>
											<div className="flex-1 min-w-0">
												<div className="flex items-start justify-between gap-2">
													<Text variant="subTitle2" className={notification.isRead ? "font-normal" : "font-semibold"}>
														{notification.title}
													</Text>
													{!notification.isRead && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
												</div>
												<Text variant="caption" color="secondary" className="line-clamp-2 mt-1">
													{notification.message}
												</Text>
												<div className="flex items-center gap-2 mt-2">
													<Text variant="caption" color="secondary">
														{getTimeAgo(notification.createdAt)}
													</Text>
													{notification.assetName && (
														<>
															<Text variant="caption" color="secondary">
																•
															</Text>
															<Badge variant="secondary" className="text-[10px] px-1.5 py-0">
																{notification.assetName}
															</Badge>
														</>
													)}
													{notification.showroomName && (
														<>
															<Text variant="caption" color="secondary">
																•
															</Text>
															<Badge variant="outline" className="text-[10px] px-1.5 py-0">
																{notification.showroomName}
															</Badge>
														</>
													)}
												</div>
											</div>
										</div>
									))}
								</div>
							</ScrollArea>
						)}
					</div>
					<SheetFooter className="flex flex-row h-16 w-full items-center justify-center p-4 shrink-0 border-t">
						<Button
							variant="outline"
							className="w-full"
							onClick={() => void handleMarkAllAsRead()}
							disabled={unreadCount === 0}
						>
							Mark all as read
						</Button>
					</SheetFooter>
				</SheetContent>
			</Sheet>
		</>
	);
}
