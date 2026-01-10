'use client';

import PageContainer from '@/components/layout/page-container';
import { workspacesInfoContent } from '@/config/infoconfig';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { mockOrganizations } from '@/lib/mock-auth';

export default function WorkspacesPage() {
  return (
    <PageContainer
      pageTitle='Workspaces'
      pageDescription='Manage your workspaces and switch between them'
      infoContent={workspacesInfoContent}
    >
      <div className='grid gap-4 md:grid-cols-2'>
        {mockOrganizations.map((organization) => (
          <Card key={organization.id}>
            <CardHeader>
              <CardTitle>{organization.name}</CardTitle>
            </CardHeader>
            <CardContent className='text-muted-foreground'>
              <p>Role: {organization.role}</p>
              <p>Plan: {organization.plan}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
