import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;

  // Public routes
  const publicRoutes = ['/', '/login', '/register'];
  const isPublicRoute = publicRoutes.includes(pathname);

  // API routes that don't need auth
  const publicApiRoutes = ['/api/auth', '/api/health'];
  const isPublicApiRoute = publicApiRoutes.some(route => pathname.startsWith(route));

  // Allow public routes and API routes
  if (isPublicRoute || isPublicApiRoute) {
    // Redirect logged-in users away from auth pages
    if (isLoggedIn && (pathname === '/login' || pathname === '/register')) {
      if (userRole === 'admin') {
        return NextResponse.redirect(new URL('/admin', req.url));
      }
      if (userRole === 'client') {
        return NextResponse.redirect(new URL('/client', req.url));
      }
      return NextResponse.redirect(new URL('/clipper', req.url));
    }
    return NextResponse.next();
  }

  // Require authentication for all other routes
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Admin routes require admin role
  if (pathname.startsWith('/admin')) {
    if (userRole !== 'admin') {
      if (userRole === 'client') {
        return NextResponse.redirect(new URL('/client', req.url));
      }
      return NextResponse.redirect(new URL('/clipper', req.url));
    }
  }

  // Client routes require client role
  if (pathname.startsWith('/client')) {
    if (userRole === 'admin') {
      return NextResponse.redirect(new URL('/admin', req.url));
    }
    if (userRole !== 'client') {
      return NextResponse.redirect(new URL('/clipper', req.url));
    }
  }

  // Clipper routes - redirect admins and clients to their dashboards
  if (pathname.startsWith('/clipper')) {
    if (userRole === 'admin') {
      return NextResponse.redirect(new URL('/admin', req.url));
    }
    if (userRole === 'client') {
      return NextResponse.redirect(new URL('/client', req.url));
    }
    if (userRole !== 'clipper') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
