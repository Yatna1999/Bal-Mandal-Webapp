import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Exclude PWA files, icons, design check, and API routes from auth enforcement immediately
  if (
    pathname === '/design-check' ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/api/')
  ) {
    return NextResponse.next();
  }

  // Guard: if env vars are missing, let the request through
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (pathname !== '/login') {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    return response;
  }

  // Fetch karyakar status & password change flag
  const { data: karyakar } = await supabase
    .from('karyakars')
    .select('is_active, must_change_password')
    .eq('id', user.id)
    .single();

  if (!karyakar || !karyakar.is_active) {
    await supabase.auth.signOut();
    if (pathname !== '/login') {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', 'accountInactive');
      return NextResponse.redirect(url);
    }
    return response;
  }

  if (karyakar.must_change_password) {
    if (pathname !== '/first-password') {
      const url = request.nextUrl.clone();
      url.pathname = '/first-password';
      return NextResponse.redirect(url);
    }
    return response;
  }

  if (pathname === '/login' || pathname === '/first-password') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
