'use client';

import { useEffect, useState, type FormEvent } from 'react';
import PageContainer from '@/components/layout/page-container';
import { apiRequest } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

type RoleRecord = {
  id?: string;
  name?: string;
  description?: string;
};

function normalizeList(payload: unknown, key: string) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && typeof payload === 'object' && key in payload) {
    const value = (payload as Record<string, unknown>)[key];
    return Array.isArray(value) ? value : [];
  }
  return [];
}

export default function UsersPage() {
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const loadRoles = async () => {
    setLoading(true);
    const response = await apiRequest(
      '/users/roles',
      { method: 'GET' },
      { auth: true }
    );
    if (!response.ok) {
      setErrorMessage('Failed to load roles.');
      setLoading(false);
      return;
    }
    const payload = await response.json();
    setRoles(normalizeList(payload, 'roles') as RoleRecord[]);
    setLoading(false);
  };

  useEffect(() => {
    loadRoles().catch(() => {
      setErrorMessage('Failed to load roles.');
      setLoading(false);
    });
  }, []);

  const handleUpdateRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage('');
    setErrorMessage('');

    const response = await apiRequest(
      `/users/${userId}/role`,
      {
        method: 'PATCH',
        body: JSON.stringify({ role })
      },
      { auth: true }
    );

    if (!response.ok) {
      setErrorMessage('Role update failed.');
      return;
    }

    setStatusMessage('User role updated successfully.');
    setUserId('');
    setRole('');
  };

  return (
    <PageContainer
      pageTitle='Users & Roles'
      pageDescription='View available roles and update user assignments.'
    >
      <div className='space-y-6'>
        {statusMessage ? (
          <p className='text-sm text-emerald-600'>{statusMessage}</p>
        ) : null}
        {errorMessage ? (
          <p className='text-destructive text-sm'>{errorMessage}</p>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Roles</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className='text-muted-foreground text-sm'>Loading roles...</p>
            ) : roles.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((roleItem) => (
                    <TableRow key={roleItem.id ?? roleItem.name}>
                      <TableCell className='font-mono text-xs'>
                        {roleItem.id ?? '—'}
                      </TableCell>
                      <TableCell>{roleItem.name ?? '—'}</TableCell>
                      <TableCell>{roleItem.description ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className='text-muted-foreground text-sm'>No roles found.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Update User Role</CardTitle>
          </CardHeader>
          <CardContent>
            <form className='space-y-4' onSubmit={handleUpdateRole}>
              <div className='space-y-2'>
                <Label htmlFor='user-id'>User ID</Label>
                <Input
                  id='user-id'
                  value={userId}
                  onChange={(event) => setUserId(event.target.value)}
                  placeholder='userId'
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='role'>Role</Label>
                <Input
                  id='role'
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  placeholder='TEAM_MEMBER'
                  required
                />
              </div>
              <Button type='submit' className='w-full'>
                Update Role
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
