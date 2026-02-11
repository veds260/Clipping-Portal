'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface CampaignAnnouncement {
  campaignId: string;
  campaignName: string;
  announcement: string;
}

interface CampaignAnnouncementsProps {
  announcements: CampaignAnnouncement[];
}

const DISMISSED_KEY = 'dismissed-announcements';

function getDismissedMap(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '{}');
  } catch {
    return {};
  }
}

function dismissAnnouncement(campaignId: string, text: string) {
  const map = getDismissedMap();
  map[campaignId] = text;
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(map));
}

export function CampaignAnnouncements({ announcements }: CampaignAnnouncementsProps) {
  const [pending, setPending] = useState<CampaignAnnouncement[]>([]);
  const [current, setCurrent] = useState<CampaignAnnouncement | null>(null);

  useEffect(() => {
    const dismissed = getDismissedMap();
    // Only show announcements that haven't been dismissed or whose text changed
    const unseen = announcements.filter(
      (a) => dismissed[a.campaignId] !== a.announcement
    );
    if (unseen.length > 0) {
      setCurrent(unseen[0]);
      setPending(unseen.slice(1));
    }
  }, [announcements]);

  const handleDismiss = () => {
    if (current) {
      dismissAnnouncement(current.campaignId, current.announcement);
    }
    if (pending.length > 0) {
      setCurrent(pending[0]);
      setPending(pending.slice(1));
    } else {
      setCurrent(null);
    }
  };

  if (!current) return null;

  return (
    <Dialog open={true} onOpenChange={() => handleDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            {current.campaignName}
          </DialogTitle>
          <DialogDescription>Campaign announcement</DialogDescription>
        </DialogHeader>
        <div className="whitespace-pre-wrap text-sm py-2">
          {current.announcement}
        </div>
        <DialogFooter>
          <Button onClick={handleDismiss} className="w-full">
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
