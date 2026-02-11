'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { User, Mail, MessageCircle, Wallet } from 'lucide-react';

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState<{
    telegramHandle: string;
    walletAddress: string;
    walletType: string;
    tier: string;
    status: string;
  } | null>(null);

  useEffect(() => {
    // Fetch clipper profile data
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/clipper/profile');
        if (res.ok) {
          const data = await res.json();
          setProfileData(data.profile);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/clipper/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramHandle: profileData.telegramHandle,
          walletAddress: profileData.walletAddress,
          walletType: profileData.walletType,
        }),
      });

      if (res.ok) {
        toast.success('Profile updated');
      } else {
        toast.error('Failed to update profile');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    active: 'bg-green-100 text-green-800',
    suspended: 'bg-red-100 text-red-800',
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground">
          Manage your account settings
        </p>
      </div>

      <div className="space-y-6">
        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Your basic account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={session?.user?.image || undefined} />
                <AvatarFallback className="text-lg">
                  {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-medium">{session?.user?.name || 'User'}</h3>
                <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
              </div>
            </div>

            <div className="grid gap-4 pt-4">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Name:</span>
                <span className="text-sm">{session?.user?.name || 'Not set'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Email:</span>
                <span className="text-sm">{session?.user?.email}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Status */}
        <Card>
          <CardHeader>
            <CardTitle>Account Status</CardTitle>
            <CardDescription>Your current account status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <Badge className={statusColors[profileData?.status || 'pending']} variant="outline">
                {profileData?.status || 'pending'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Payout Information */}
        <Card>
          <CardHeader>
            <CardTitle>Payout Information</CardTitle>
            <CardDescription>Where to receive your earnings</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="walletAddress">Wallet Address</Label>
                <div className="flex gap-2">
                  <Select
                    value={profileData?.walletType || 'ETH'}
                    onValueChange={(value) => setProfileData(prev => prev ? { ...prev, walletType: value } : null)}
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
                  <div className="relative flex-1">
                    <Wallet className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="walletAddress"
                      placeholder={profileData?.walletType === 'SOL' ? 'Solana address...' : '0x...'}
                      value={profileData?.walletAddress || ''}
                      onChange={(e) => setProfileData(prev => prev ? { ...prev, walletAddress: e.target.value } : null)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Payouts are sent to this wallet address. Make sure it is correct.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="telegram">Telegram (optional)</Label>
                <div className="relative">
                  <MessageCircle className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="telegram"
                    placeholder="@username"
                    value={profileData?.telegramHandle || ''}
                    onChange={(e) => setProfileData(prev => prev ? { ...prev, telegramHandle: e.target.value } : null)}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Optional contact for communication with the team.
                </p>
              </div>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Important Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Important Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Payouts are sent to the wallet address you provide above.</p>
            <p>Keep your wallet address up to date to receive payouts on time.</p>
            <p>If you have questions about your account, reach out to the admin team.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
