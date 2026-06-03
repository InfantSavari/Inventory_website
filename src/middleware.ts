import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from './lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Retrieve token from cookies
  const token = request.cookies.get('token')?.value;
  const user = token ? await verifyJWT(token) : null;

  // Protect Admin Routes
  if (pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (user.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Protect Dashboard Routes
  if (pathname.startsWith('/dashboard')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (user.role !== 'USER' && user.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Gateway at root / path
  if (pathname === '/') {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (user.role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Login page bypass if already authenticated
  if (pathname === '/login') {
    if (user) {
      if (user.role === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api/auth/* (auth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, public folder files
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)',
  ],
};
