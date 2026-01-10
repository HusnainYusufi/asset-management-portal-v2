import { NavItem } from '@/types';

/**
 * Navigation configuration with RBAC support
 *
 * This configuration is used for both the sidebar navigation and Cmd+K bar.
 *
 * RBAC Access Control:
 * Each navigation item can have an `access` property that controls visibility
 * based on permissions, plans, features, roles, and organization context.
 *
 * Examples:
 *
 * 1. Require organization:
 *    access: { requireOrg: true }
 *
 * 2. Require specific permission:
 *    access: { requireOrg: true, permission: 'org:teams:manage' }
 *
 * 3. Require specific plan:
 *    access: { plan: 'pro' }
 *
 * 4. Require specific feature:
 *    access: { feature: 'premium_access' }
 *
 * 5. Require specific role:
 *    access: { role: 'admin' }
 *
 * 6. Multiple conditions (all must be true):
 *    access: { requireOrg: true, permission: 'org:teams:manage', plan: 'pro' }
 *
 * Note: The `visible` function is deprecated but still supported for backward compatibility.
 * Use the `access` property for new items.
 */
export const navItems: NavItem[] = [
  {
    title: 'Assets',
    url: '/dashboard/assets',
    icon: 'assets',
    shortcut: ['a', 'a'],
    items: []
  },
  {
    title: 'Showrooms',
    url: '/dashboard/showrooms',
    icon: 'showrooms',
    shortcut: ['s', 's'],
    items: []
  },
  {
    title: 'Users & Roles',
    url: '/dashboard/users',
    icon: 'users',
    shortcut: ['u', 'u'],
    items: []
  },
  {
    title: 'Auth',
    url: '#',
    icon: 'auth',
    items: [
      {
        title: 'Superadmin Setup',
        url: '/auth/superadmin-setup',
        icon: 'auth'
      },
      {
        title: 'Client Onboard',
        url: '/auth/onboard',
        icon: 'auth'
      },
      {
        title: 'Login',
        url: '/auth/login',
        icon: 'login'
      },
      {
        title: 'Reset Password',
        url: '/auth/reset-password',
        icon: 'auth'
      }
    ]
  }
];
