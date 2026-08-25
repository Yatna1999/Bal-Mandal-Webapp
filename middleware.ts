import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // Exclude design-check page and API routes from auth redirect enforcement
  if (pathname === '/design-check' || pathname.startsWith('/api/')) {
    return response;
  }

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
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
