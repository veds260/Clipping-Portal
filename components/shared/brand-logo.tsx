import { cn } from '@/lib/utils';

export function BrandLogo({ className }: { className?: string }) {
  return (
    <span className={cn("text-2xl font-bold tracking-tight", className)}>
      <span className="text-primary">W3C</span>
    </span>
  );
}

export function BrandIcon({ className }: { className?: string }) {
  return (
    <span className={cn("text-lg font-bold", className)}>
      <span className="text-primary">W3</span>
    </span>
  );
}
