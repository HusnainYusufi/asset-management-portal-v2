'use client';

import { useState, type FormEvent } from 'react';
import { apiRequest } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function OnboardPage() {
  const [clientName, setClientName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('loading');
    setMessage('');

    const response = await apiRequest('/auth/onboard', {
      method: 'POST',
      body: JSON.stringify({
        clientName,
        ownerName,
        ownerEmail,
        ownerPassword
      })
    });

    if (!response.ok) {
      setStatus('error');
      setMessage('Onboarding failed. Please check the details and try again.');
      return;
    }

    setStatus('success');
    setMessage('Client onboarded successfully.');
  };

  return (
    <div className='bg-muted/30 flex min-h-screen items-center justify-center p-6'>
      <Card className='w-full max-w-xl'>
        <CardHeader>
          <CardTitle>Client Onboarding</CardTitle>
        </CardHeader>
        <CardContent>
          <form className='space-y-4' onSubmit={handleSubmit}>
            <div className='space-y-2'>
              <Label htmlFor='clientName'>Client Name</Label>
              <Input
                id='clientName'
                value={clientName}
                onChange={(event) => setClientName(event.target.value)}
                placeholder='Demo Client'
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='ownerName'>Owner Name</Label>
              <Input
                id='ownerName'
                value={ownerName}
                onChange={(event) => setOwnerName(event.target.value)}
                placeholder='Owner User'
                required
              />
            </div>
            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='ownerEmail'>Owner Email</Label>
                <Input
                  id='ownerEmail'
                  type='email'
                  value={ownerEmail}
                  onChange={(event) => setOwnerEmail(event.target.value)}
                  placeholder='owner@example.com'
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='ownerPassword'>Owner Password</Label>
                <Input
                  id='ownerPassword'
                  type='password'
                  value={ownerPassword}
                  onChange={(event) => setOwnerPassword(event.target.value)}
                  placeholder='ChangeMe123!'
                  required
                />
              </div>
            </div>
            <Button
              type='submit'
              className='w-full'
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'Submitting...' : 'Create Client'}
            </Button>
            {message ? (
              <p
                className={
                  status === 'error'
                    ? 'text-destructive text-sm'
                    : 'text-sm text-emerald-600'
                }
              >
                {message}
              </p>
            ) : null}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
