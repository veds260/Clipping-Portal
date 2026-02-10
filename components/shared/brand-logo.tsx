import { cn } from '@/lib/utils';

export function BrandLogo({ className }: { className?: string }) {
  return (
    <span className={cn("text-xl font-bold tracking-tight", className)} style={{ fontFamily: 'var(--font-space-grotesk)' }}>
      <span className="text-primary">Web3</span> Clipping
    </span>
  );
}

export function BrandIcon({ className }: { className?: string }) {
  return (
    <span className={cn("text-lg font-bold", className)} style={{ fontFamily: 'var(--font-space-grotesk)' }}>
      <span className="text-primary">W3</span>
    </span>
  );
}
