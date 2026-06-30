import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    // Mock Authentication Logic
    // In real app, check against DB
    if (username === 'admin' && password === 'admin123') {
      
      const response = NextResponse.json({ success: true }, { status: 200 });
      
      // Set HttpOnly cookie
      response.cookies.set({
        name: 'auth_session',
        value: 'admin_authenticated',
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 // 1 day
      });

      return response;
    }

    return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
