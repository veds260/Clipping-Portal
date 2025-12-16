'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  Film,
  Users,
  DollarSign,
  Settings,
  LogOut,
  Upload,
  FileText,
  User,
  Radio,
  Briefcase,
  Megaphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BrandLogo, BrandIcon } from '@/components/shared/brand-logo';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const adminNavItems: NavItem[] = [
  { title: 'Overview', href: '/admin', icon: LayoutDashboard },
  { title: 'Channels', href: '/admin/channels', icon: Radio },
  { title: 'Clips', href: '/admin/clips', icon: Film },
  { title: 'Clippers', href: '/admin/clippers', icon: Users },
  { title: 'Clients', href: '/admin/clients', icon: Briefcase },
  { title: 'Campaigns', href: '/admin/campaigns', icon: Megaphone },
  { title: 'Payouts', href: '/admin/payouts', icon: DollarSign },
  { title: 'Settings', href: '/admin/settings', icon: Settings },
];

const clipperNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/clipper', icon: LayoutDashboard },
  { title: 'Submit Clip', href: '/clipper/submit', icon: Upload },
  { title: 'My Clips', href: '/clipper/clips', icon: Film },
  { title: 'Earnings', href: '/clipper/earnings', icon: DollarSign },
  { title: 'Guidelines', href: '/clipper/guidelines', icon: FileText },
  { title: 'Profile', href: '/clipper/profile', icon: User },
];

const clientNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/client', icon: LayoutDashboard },
  { title: 'Campaigns', href: '/client/campaigns', icon: Megaphone },
  { title: 'Clips', href: '/client/clips', icon: Film },
];

interface SidebarProps {
  userRole?: 'admin' | 'clipper' | 'client';
  userName?: string;
  variant?: 'admin' | 'clipper';
}

export function Sidebar({ userRole, userName, variant }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Support both old variant prop and new userRole prop
  const role = userRole || variant || 'clipper';
  const navItems = role === 'admin' ? adminNavItems : role === 'client' ? clientNavItems : clipperNavItems;

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  const getHomeUrl = () => {
    if (role === 'admin') return '/admin';
    if (role === 'client') return '/client';
    return '/clipper';
  };

  const getPortalName = () => {
    if (role === 'admin') return 'Admin Dashboard';
    if (role === 'client') return 'Client Portal';
    return 'Clipper Portal';
  };

  return (
    <div className="flex h-full w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="p-6">
        <Link href={getHomeUrl()} className="block">
          <BrandLogo className="h-8 w-auto text-white" />
          <p className="text-xs text-sidebar-foreground/60 mt-1">
            {getPortalName()}
          </p>
        </Link>
      </div>

      <ScrollArea className="flex-1 px-3">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/admin' && item.href !== '/clipper' && item.href !== '/client' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={session?.user?.image || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-sidebar-foreground">
              {session?.user?.name || 'User'}
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {session?.user?.email}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
