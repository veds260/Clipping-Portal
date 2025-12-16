'use client';

import { useState, useEffect } from 'react';
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BrandLogo, BrandIcon } from '@/components/shared/brand-logo';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

export function Sidebar({ userRole, userName, variant }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored !== null) {
      setIsCollapsed(stored === 'true');
    }
  }, []);

  // Save collapsed state to localStorage
  const toggleCollapsed = () => {
    const newValue = !isCollapsed;
    setIsCollapsed(newValue);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newValue));
  };

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

  // Prevent hydration mismatch by rendering expanded state initially
  const collapsed = mounted ? isCollapsed : false;

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          'flex h-full flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Header */}
        <div className={cn('p-4', collapsed ? 'px-2' : 'p-6')}>
          <Link href={getHomeUrl()} className="block">
            {collapsed ? (
              <div className="flex justify-center">
                <BrandIcon className="h-8 w-8 text-white" />
              </div>
            ) : (
              <>
                <BrandLogo className="h-8 w-auto text-white" />
                <p className="text-xs text-sidebar-foreground/60 mt-1">
                  {getPortalName()}
                </p>
              </>
            )}
          </Link>
        </div>

        {/* Collapse Toggle Button */}
        <div className={cn('px-3 mb-2', collapsed && 'px-2')}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleCollapsed}
                className={cn(
                  'w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent',
                  collapsed ? 'justify-center px-0' : 'justify-end'
                )}
              >
                {collapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side={collapsed ? 'right' : 'bottom'}>
              {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/admin' && item.href !== '/clipper' && item.href !== '/client' && pathname.startsWith(item.href));

              const linkContent = (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center rounded-lg px-3 py-2 text-sm transition-colors',
                    collapsed ? 'justify-center' : 'gap-3',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      {linkContent}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {item.title}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return linkContent;
            })}
          </nav>
        </ScrollArea>

        {/* User Section */}
        <div className="border-t border-sidebar-border p-4">
          {collapsed ? (
            <div className="flex flex-col items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-8 w-8 cursor-pointer">
                    <AvatarImage src={session?.user?.image || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="font-medium">{session?.user?.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign out</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
