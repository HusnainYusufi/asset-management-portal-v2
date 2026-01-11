import type { NavItemDataProps } from "@/components/nav/types";
import { GLOBAL_CONFIG } from "@/global-config";
import { useUserPermissions, useUserRoles } from "@/store/userStore";
import { checkAny } from "@/utils";
import { useMemo } from "react";
import { backendNavData } from "./nav-data-backend";
import { frontendNavData } from "./nav-data-frontend";

const navData = GLOBAL_CONFIG.routerMode === "backend" ? backendNavData : frontendNavData;

/**
 * 递归处理导航数据，过滤掉没有权限的项目
 * @param items 导航项目数组
 * @param permissions 权限列表
 * @returns 过滤后的导航项目数组
 */
const filterItems = (items: NavItemDataProps[], permissions: string[]) => {
	return items.filter((item) => {
		if (item.hidden) {
			return false;
		}
		// 检查当前项目是否有权限
		const hasPermission = item.auth ? checkAny(item.auth, permissions) : true;

		// 如果有子项目，递归处理
		if (item.children?.length) {
			const filteredChildren = filterItems(item.children, permissions);
			// 如果子项目都被过滤掉了，则过滤掉当前项目
			if (filteredChildren.length === 0) {
				return false;
			}
			// 更新子项目
			item.children = filteredChildren;
		}

		return hasPermission;
	});
};

/**
 *
 * 根据权限过滤导航数据
 * @param permissions 权限列表
 * @returns 过滤后的导航数据
 */
const filterNavData = (data: typeof navData, permissions: string[]) => {
	return data
		.map((group) => {
			// 过滤组内的项目
			const filteredItems = filterItems(group.items, permissions);

			// 如果组内没有项目了，返回 null
			if (filteredItems.length === 0) {
				return null;
			}

			// 返回过滤后的组
			return {
				...group,
				items: filteredItems,
			};
		})
		.filter((group): group is NonNullable<typeof group> => group !== null); // 过滤掉空组
};

const applyRoleVisibility = (items: NavItemDataProps[], isOwner: boolean): NavItemDataProps[] =>
	items.map((item) => {
		const nextItem: NavItemDataProps = {
			...item,
			hidden: isOwner && item.path === "/clients" ? true : item.hidden,
		};
		if (item.children?.length) {
			nextItem.children = applyRoleVisibility(item.children, isOwner);
		}
		return nextItem;
	});

/**
 * Hook to get filtered navigation data based on user permissions
 * @returns Filtered navigation data
 */
export const useFilteredNavData = () => {
	const permissions = useUserPermissions();
	const roles = useUserRoles();
	const permissionCodes = useMemo(() => permissions.map((p) => p.code), [permissions]);
	const roleCodes = useMemo(() => roles.map((role) => role.code), [roles]);
	const authCodes = useMemo(
		() => Array.from(new Set([...permissionCodes, ...roleCodes])),
		[permissionCodes, roleCodes],
	);
	const isOwner = useMemo(() => roles.some((role) => role.code === "OWNER" || role.name === "OWNER"), [roles]);
	const scopedNavData = useMemo(
		() =>
			navData.map((group) => ({
				...group,
				items: applyRoleVisibility(group.items, isOwner),
			})),
		[isOwner],
	);
	const filteredNavData = useMemo(() => filterNavData(scopedNavData, authCodes), [authCodes, scopedNavData]);
	return filteredNavData;
};
