import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    if (session.user.role === 'admin') {
      redirect('/admin');
    }
    redirect('/clipper');
  }

  redirect('/login');
}
