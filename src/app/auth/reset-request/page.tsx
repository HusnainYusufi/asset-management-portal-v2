'use client';

import { useState, type FormEvent } from 'react';
import { apiRequest } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ResetPasswordRequestPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('loading');
    setMessage('');

    const response = await apiRequest('/auth/reset-password-request', {
      method: 'POST',
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      setStatus('error');
      setMessage('Request failed. Please verify the email and try again.');
      return;
    }

    setStatus('success');
    setMessage('Password reset request sent. Check your email.');
  };

  return (
    <div className='bg-muted/30 flex min-h-screen items-center justify-center p-6'>
      <Card className='w-full max-w-lg'>
        <CardHeader>
          <CardTitle>Reset Password Request</CardTitle>
        </CardHeader>
        <CardContent>
          <form className='space-y-4' onSubmit={handleSubmit}>
            <div className='space-y-2'>
              <Label htmlFor='email'>Email</Label>
              <Input
                id='email'
                type='email'
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder='owner@example.com'
                required
              />
            </div>
            <Button
              type='submit'
              className='w-full'
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'Submitting...' : 'Send Reset Request'}
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
