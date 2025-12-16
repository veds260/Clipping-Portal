'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { createClient, updateClient } from '@/lib/actions/clients';

interface ClientFormProps {
  client?: {
    id: string;
    name: string;
    brandName: string | null;
    twitterHandle: string | null;
    logoUrl: string | null;
    monthlyBudget: string | null;
    payRatePer1k: string | null;
    contentGuidelines: string | null;
    isActive: boolean | null;
    userId: string | null;
  };
}

export function ClientForm({ client }: ClientFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!client;
  const hasLoginAccount = !!client?.userId;

  const [formData, setFormData] = useState({
    name: client?.name || '',
    brandName: client?.brandName || '',
    twitterHandle: client?.twitterHandle || '',
    logoUrl: client?.logoUrl || '',
    monthlyBudget: parseFloat(client?.monthlyBudget || '0') || 0,
    payRatePer1k: parseFloat(client?.payRatePer1k || '0') || 0,
    contentGuidelines: client?.contentGuidelines || '',
    isActive: client?.isActive ?? true,
    // Login account fields (only for new clients)
    createLoginAccount: false,
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate login fields if creating account
    if (!isEditing && formData.createLoginAccount) {
      if (!formData.email) {
        toast.error('Email is required for login account');
        return;
      }
      if (!formData.password || formData.password.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }
    }

    setIsLoading(true);

    const submitData = {
      name: formData.name,
      brandName: formData.brandName || undefined,
      twitterHandle: formData.twitterHandle || undefined,
      logoUrl: formData.logoUrl || undefined,
      monthlyBudget: formData.monthlyBudget || undefined,
      payRatePer1k: formData.payRatePer1k || undefined,
      contentGuidelines: formData.contentGuidelines || undefined,
      isActive: formData.isActive,
      // Only include login fields for new clients
      ...((!isEditing && formData.createLoginAccount) && {
        createLoginAccount: true,
        email: formData.email,
        password: formData.password,
      }),
    };

    const result = client
      ? await updateClient(client.id, submitData)
      : await createClient(submitData);

    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(client ? 'Client updated' : 'Client created');
      router.push('/admin/clients');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
            <CardDescription>Basic details about this client</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Client Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., John Smith"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brandName">Brand/Company Name</Label>
                <Input
                  id="brandName"
                  value={formData.brandName}
                  onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                  placeholder="e.g., Acme Protocol"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="twitterHandle">Twitter/X Handle</Label>
                <Input
                  id="twitterHandle"
                  value={formData.twitterHandle}
                  onChange={(e) => setFormData({ ...formData, twitterHandle: e.target.value })}
                  placeholder="@handle"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input
                  id="logoUrl"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="flex items-center justify-between border rounded-lg p-4">
              <div>
                <h3 className="font-medium">Active Client</h3>
                <p className="text-sm text-muted-foreground">
                  Inactive clients won't appear in campaign options
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {!isEditing && (
          <Card>
            <CardHeader>
              <CardTitle>Login Account</CardTitle>
              <CardDescription>
                Create login credentials so the client can access their dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between border rounded-lg p-4">
                <div>
                  <h3 className="font-medium">Create Login Account</h3>
                  <p className="text-sm text-muted-foreground">
                    Allow this client to login and view their campaigns
                  </p>
                </div>
                <Switch
                  checked={formData.createLoginAccount}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, createLoginAccount: checked })
                  }
                />
              </div>

              {formData.createLoginAccount && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="client@example.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Min 6 characters"
                      required
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isEditing && hasLoginAccount && (
          <Card>
            <CardHeader>
              <CardTitle>Login Account</CardTitle>
              <CardDescription>
                This client has a login account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Client can login to view their dashboard. Password reset is not yet available.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Budget & Rates</CardTitle>
            <CardDescription>Financial settings for this client</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="monthlyBudget">Monthly Budget ($)</Label>
                <Input
                  id="monthlyBudget"
                  type="number"
                  step="0.01"
                  value={formData.monthlyBudget}
                  onChange={(e) => setFormData({ ...formData, monthlyBudget: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  Leave at 0 for unlimited
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payRatePer1k">Custom Pay Rate ($ per 1K views)</Label>
                <Input
                  id="payRatePer1k"
                  type="number"
                  step="0.01"
                  value={formData.payRatePer1k}
                  onChange={(e) => setFormData({ ...formData, payRatePer1k: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  Leave at 0 to use tier-based rates
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content Guidelines</CardTitle>
            <CardDescription>Specific requirements for this client's content</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="contentGuidelines">Guidelines</Label>
              <Textarea
                id="contentGuidelines"
                value={formData.contentGuidelines}
                onChange={(e) => setFormData({ ...formData, contentGuidelines: e.target.value })}
                placeholder="Specific requirements, topics to cover, things to avoid..."
                rows={6}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4 mt-6">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : client ? 'Update Client' : 'Create Client'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
