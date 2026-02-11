'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    twitterHandle: '',
    telegramHandle: '',
    walletAddress: '',
    walletType: 'ETH',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }

    if (!formData.twitterHandle.trim()) {
      setError('Twitter handle is required for clip verification');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          twitterHandle: formData.twitterHandle,
          telegramHandle: formData.telegramHandle || undefined,
          walletAddress: formData.walletAddress || undefined,
          walletType: formData.walletAddress ? formData.walletType : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      // Auto sign in after registration
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        router.push('/login');
      } else {
        router.push('/clipper');
        router.refresh();
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-4">
        <div className="flex justify-center">
          <span className="text-2xl font-black tracking-widest uppercase">
            W<span className="text-primary">3</span>C
          </span>
        </div>
        <CardDescription className="text-center">
          Create an account to start clipping
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="twitterHandle">
              Twitter Handle <span className="text-red-500">*</span>
            </Label>
            <Input
              id="twitterHandle"
              name="twitterHandle"
              type="text"
              placeholder="@username"
              value={formData.twitterHandle}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Required for clip verification. We match your tweets against this handle.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="walletAddress">Wallet Address (optional)</Label>
            <div className="flex gap-2">
              <Select
                value={formData.walletType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, walletType: value }))}
                disabled={isLoading}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ETH">ETH</SelectItem>
                  <SelectItem value="SOL">SOL</SelectItem>
                  <SelectItem value="BTC">BTC</SelectItem>
                  <SelectItem value="USDT">USDT</SelectItem>
                </SelectContent>
              </Select>
              <Input
                id="walletAddress"
                name="walletAddress"
                type="text"
                placeholder={formData.walletType === 'SOL' ? 'Solana address...' : '0x...'}
                value={formData.walletAddress}
                onChange={handleChange}
                disabled={isLoading}
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              For receiving payouts. You can add this later in your profile.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="telegramHandle">Telegram (optional)</Label>
            <Input
              id="telegramHandle"
              name="telegramHandle"
              type="text"
              placeholder="@username"
              value={formData.telegramHandle}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Create account'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
