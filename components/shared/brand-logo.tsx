import { cn } from '@/lib/utils';

export function BrandLogo({ className }: { className?: string }) {
  return (
    <span className={cn("text-xl font-black tracking-widest uppercase", className)} style={{ fontFamily: 'var(--font-space-grotesk)' }}>
      W<span className="text-primary">3</span>C
    </span>
  );
}

export function BrandIcon({ className }: { className?: string }) {
  return (
    <span className={cn("text-lg font-black tracking-widest", className)} style={{ fontFamily: 'var(--font-space-grotesk)' }}>
      W<span className="text-primary">3</span>C
    </span>
  );
}
