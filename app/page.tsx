import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    if (session.user.role === 'admin') {
      redirect('/admin');
    }
    redirect('/clipper');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center space-y-6 px-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Compound Clipper
        </h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          Turn video clips into a scalable distribution service. Join our community of clippers.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/login">
            <Button size="lg">Sign In</Button>
          </Link>
          <Link href="/register">
            <Button size="lg" variant="outline">Join as Clipper</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
