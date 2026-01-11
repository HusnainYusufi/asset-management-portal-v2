import type { Permission, Role } from "#/entity";
import apiClient from "../apiClient";

export interface SignInReq {
	email: string;
	password: string;
}

export interface AuthUser {
	id: string;
	email: string;
	name?: string;
	roleId?: string;
	roleName?: string;
	tenantId?: string;
	roles?: Role[];
	permissions?: Permission[];
}

export interface SignInRes {
	accessToken: string;
	user: AuthUser;
}

export enum AuthApi {
	Login = "/auth/login",
}

const signin = (data: SignInReq) => apiClient.post<SignInRes>({ url: AuthApi.Login, data });

export default {
	signin,
};
