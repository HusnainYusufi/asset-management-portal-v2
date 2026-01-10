import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { mockUser } from '@/lib/mock-auth';

export default function ProfileViewPage() {
  return (
    <div className='flex w-full flex-col gap-4 p-4'>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className='space-y-2'>
          <div>
            <span className='text-muted-foreground text-sm'>Name</span>
            <p className='text-lg font-medium'>{mockUser.name}</p>
          </div>
          <div>
            <span className='text-muted-foreground text-sm'>Email</span>
            <p className='text-lg font-medium'>{mockUser.email}</p>
          </div>
        </CardContent>
      </Card>
      <p className='text-muted-foreground text-sm'>
        Connect your authentication provider to manage profile details.
      </p>
    </div>
  );
}
