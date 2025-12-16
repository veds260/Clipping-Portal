import { Sidebar } from '@/components/shared/sidebar';

export default function ClipperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar variant="clipper" />
      <main className="flex-1 overflow-auto bg-muted/30">
        {children}
      </main>
    </div>
  );
}
