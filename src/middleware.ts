import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authSession = request.cookies.get('auth_session');

  // Protect /dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!authSession || authSession.value !== 'admin_authenticated') {
      // Redirect to login if not authenticated
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Redirect /login to /dashboard if already authenticated
  if (request.nextUrl.pathname === '/login') {
    if (authSession && authSession.value === 'admin_authenticated') {
      return NextResponse.redirect(new URL('/dashboard/patients', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
