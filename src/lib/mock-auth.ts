export type MockUser = {
  name: string;
  email: string;
  imageUrl?: string;
};

export type MockOrganization = {
  id: string;
  name: string;
  role: string;
  permissions: string[];
  plan: 'free' | 'pro';
  imageUrl?: string;
};

export const mockUser: MockUser = {
  name: 'Demo User',
  email: 'demo@acme.com',
  imageUrl: ''
};

export const mockOrganization: MockOrganization = {
  id: 'org_demo',
  name: 'Acme Workspace',
  role: 'admin',
  permissions: ['org:teams:view', 'org:teams:manage', 'org:manage:billing'],
  plan: 'free'
};

export const mockOrganizations: MockOrganization[] = [mockOrganization];

export const hasProAccess = mockOrganization.plan === 'pro';
