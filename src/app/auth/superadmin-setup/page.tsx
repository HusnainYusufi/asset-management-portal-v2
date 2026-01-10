'use client';

import { useState, type FormEvent } from 'react';
import { apiRequest } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SuperadminSetupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [setupKey, setSetupKey] = useState('');
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('loading');
    setMessage('');

    const response = await apiRequest('/auth/setup-superadmin', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, setupKey })
    });

    if (!response.ok) {
      setStatus('error');
      setMessage('Setup failed. Please verify the setup key and details.');
      return;
    }

    setStatus('success');
    setMessage('Superadmin created successfully.');
  };

  return (
    <div className='bg-muted/30 flex min-h-screen items-center justify-center p-6'>
      <Card className='w-full max-w-xl'>
        <CardHeader>
          <CardTitle>Setup Superadmin</CardTitle>
        </CardHeader>
        <CardContent>
          <form className='space-y-4' onSubmit={handleSubmit}>
            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='email'>Email</Label>
                <Input
                  id='email'
                  type='email'
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder='superadmin@example.com'
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='name'>Name</Label>
                <Input
                  id='name'
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder='Super Admin'
                  required
                />
              </div>
            </div>
            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='password'>Password</Label>
                <Input
                  id='password'
                  type='password'
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder='ChangeMe123!'
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='setupKey'>Setup Key</Label>
                <Input
                  id='setupKey'
                  value={setupKey}
                  onChange={(event) => setSetupKey(event.target.value)}
                  placeholder='CHANGE_ME_SUPERADMIN_KEY'
                  required
                />
              </div>
            </div>
            <Button
              type='submit'
              className='w-full'
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'Submitting...' : 'Create Superadmin'}
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
