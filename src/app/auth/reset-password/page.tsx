'use client';

import { useState, type FormEvent } from 'react';
import { apiRequest } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('loading');
    setMessage('');

    const response = await apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password })
    });

    if (!response.ok) {
      setStatus('error');
      setMessage('Reset failed. Please verify the token and try again.');
      return;
    }

    setStatus('success');
    setMessage('Password reset successfully. You can now log in.');
  };

  return (
    <div className='bg-muted/30 flex min-h-screen items-center justify-center p-6'>
      <Card className='w-full max-w-lg'>
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form className='space-y-4' onSubmit={handleSubmit}>
            <div className='space-y-2'>
              <Label htmlFor='token'>Reset Token</Label>
              <Input
                id='token'
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder='123456'
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='password'>New Password</Label>
              <Input
                id='password'
                type='password'
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder='ChangeMe123!'
                required
              />
            </div>
            <Button
              type='submit'
              className='w-full'
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'Submitting...' : 'Reset Password'}
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
