'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { User, Mail, AtSign, MessageCircle } from 'lucide-react';

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState<{
    telegramHandle: string;
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

  const handleUpdateTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/clipper/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramHandle: profileData.telegramHandle }),
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

  const tierColors: Record<string, string> = {
    tier1: 'bg-emerald-900/30 text-emerald-400 border-emerald-700',
    tier2: 'bg-blue-900/30 text-blue-400 border-blue-700',
    tier3: 'bg-purple-900/30 text-purple-400 border-purple-700',
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

        {/* Clipper Status */}
        <Card>
          <CardHeader>
            <CardTitle>Clipper Status</CardTitle>
            <CardDescription>
              Your current tier and account status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Tier</span>
                <Badge className={tierColors[profileData?.tier || 'tier1']} variant="outline">
                  {profileData?.tier || 'tier1'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                <Badge className={statusColors[profileData?.status || 'pending']} variant="outline">
                  {profileData?.status || 'pending'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>
              How we can reach you for payouts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateTelegram} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="telegram">Telegram Handle</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MessageCircle className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="telegram"
                      placeholder="@username"
                      value={profileData?.telegramHandle || ''}
                      onChange={(e) => setProfileData(prev => prev ? { ...prev, telegramHandle: e.target.value } : null)}
                      className="pl-10"
                    />
                  </div>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Payouts are coordinated via Telegram. Make sure this is accurate.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Important Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Important Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Payments are processed outside this platform via Telegram or crypto.
            </p>
            <p>
              Keep your contact information up to date to receive payouts.
            </p>
            <p>
              If you have questions about your account, reach out to the admin team.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
