'use client';

import PageContainer from '@/components/layout/page-container';
import { teamInfoContent } from '@/config/infoconfig';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { mockOrganization } from '@/lib/mock-auth';

export default function TeamPage() {
  return (
    <PageContainer
      pageTitle='Team Management'
      pageDescription='Manage your workspace team, members, roles, security and more.'
      infoContent={teamInfoContent}
    >
      <Card>
        <CardHeader>
          <CardTitle>{mockOrganization?.name} Team</CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          <p className='text-muted-foreground'>
            This template ships without a team management provider.
          </p>
          <ul className='space-y-2 text-sm'>
            <li className='flex justify-between'>
              <span>Demo User</span>
              <span className='text-muted-foreground'>Admin</span>
            </li>
            <li className='flex justify-between'>
              <span>Jamie Lee</span>
              <span className='text-muted-foreground'>Member</span>
            </li>
            <li className='flex justify-between'>
              <span>Pat Morgan</span>
              <span className='text-muted-foreground'>Viewer</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
