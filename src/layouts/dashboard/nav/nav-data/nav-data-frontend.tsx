import { Icon } from "@/components/icon";
import type { NavProps } from "@/components/nav";
export const frontendNavData: NavProps["data"] = [
	{
		name: "sys.nav.clients",
		items: [
			{
				title: "sys.nav.clients",
				path: "/clients",
				icon: <Icon icon="solar:users-group-rounded-bold-duotone" size="24" />,
				auth: ["SUPERADMIN"],
			},
		],
	},
	{
		name: "sys.nav.assets",
		items: [
			{
				title: "sys.nav.assets",
				path: "/assets",
				icon: <Icon icon="solar:box-minimalistic-bold-duotone" size="24" />,
				auth: ["OWNER", "EMPLOYEE"],
			},
			{
				title: "sys.nav.showrooms",
				path: "/showrooms",
				icon: <Icon icon="solar:shop-bold-duotone" size="24" />,
				auth: ["OWNER", "EMPLOYEE"],
			},
		],
	},
];
