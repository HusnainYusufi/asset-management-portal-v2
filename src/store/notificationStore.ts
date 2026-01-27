import { create } from "zustand";
import apiClient from "@/api/apiClient";

export type NotificationType = "EXPIRATION_REMINDER" | "EXPIRATION_TODAY";

export type Notification = {
	id: string;
	title: string;
	message: string;
	type: NotificationType;
	isRead: boolean;
	assetName?: string;
	showroomName?: string;
	daysUntilExpiry?: number;
	createdAt: string;
};

type NotificationApiResponse = {
	statusCode: number;
	data: Notification[];
};

type UnreadCountResponse = {
	statusCode: number;
	data: { count: number };
};

type NotificationStore = {
	notifications: Notification[];
	unreadCount: number;
	isLoading: boolean;

	actions: {
		fetchNotifications: () => Promise<void>;
		fetchUnreadCount: () => Promise<void>;
		markAsRead: (id: string) => Promise<void>;
		markAllAsRead: () => Promise<void>;
	};
};

const useNotificationStore = create<NotificationStore>()((set, _get) => ({
	notifications: [],
	unreadCount: 0,
	isLoading: false,

	actions: {
		fetchNotifications: async () => {
			set({ isLoading: true });
			try {
				const response = await apiClient.get<NotificationApiResponse>({
					url: "/notifications",
				});
				const data = response?.data || response || [];
				set({
					notifications: Array.isArray(data) ? data : [],
					unreadCount: Array.isArray(data) ? data.filter((n: Notification) => !n.isRead).length : 0,
				});
			} catch (_error) {
				// Error handling is done by apiClient interceptor
			} finally {
				set({ isLoading: false });
			}
		},

		fetchUnreadCount: async () => {
			try {
				const response = await apiClient.get<UnreadCountResponse>({
					url: "/notifications/unread-count",
				});
				const count = response?.data?.count ?? (response as unknown as { count?: number })?.count ?? 0;
				set({ unreadCount: count });
			} catch (_error) {
				// Error handling is done by apiClient interceptor
			}
		},

		markAsRead: async (id: string) => {
			try {
				await apiClient.patch({
					url: `/notifications/${id}/read`,
				});
				set((state) => ({
					notifications: state.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
					unreadCount: Math.max(0, state.unreadCount - 1),
				}));
			} catch (_error) {
				// Error handling is done by apiClient interceptor
			}
		},

		markAllAsRead: async () => {
			try {
				await apiClient.patch({
					url: "/notifications/read-all",
				});
				set((state) => ({
					notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
					unreadCount: 0,
				}));
			} catch (_error) {
				// Error handling is done by apiClient interceptor
			}
		},
	},
}));

export const useNotifications = () => useNotificationStore((state) => state.notifications);
export const useUnreadCount = () => useNotificationStore((state) => state.unreadCount);
export const useNotificationLoading = () => useNotificationStore((state) => state.isLoading);
export const useNotificationActions = () => useNotificationStore((state) => state.actions);

export default useNotificationStore;
