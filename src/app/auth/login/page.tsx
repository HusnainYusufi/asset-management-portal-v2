'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest, setAuthToken } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('loading');
    setMessage('');

    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      setStatus('error');
      setMessage('Login failed. Please check your credentials.');
      return;
    }

    const payload = (await response.json()) as { accessToken?: string };
    if (payload.accessToken) {
      setAuthToken(payload.accessToken);
    }
    setStatus('success');
    setMessage('Login successful. Redirecting...');
    router.push('/dashboard/assets');
  };

  return (
    <div className='bg-muted/30 flex min-h-screen items-center justify-center p-6'>
      <Card className='w-full max-w-lg'>
        <CardHeader>
          <CardTitle>Login</CardTitle>
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
            <Button
              type='submit'
              className='w-full'
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'Signing in...' : 'Sign In'}
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
