import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/shared/sidebar';

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session || session.user.role !== 'client') {
    redirect('/login');
  }

  return (
    <div className="flex h-screen">
      <Sidebar userRole="client" userName={session.user.name || 'Client'} />
      <main className="flex-1 overflow-auto bg-muted/30">
        {children}
      </main>
    </div>
  );
}
