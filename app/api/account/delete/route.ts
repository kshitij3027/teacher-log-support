import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deleteUserAccount } from '@/lib/services/account-deletion';

export async function POST(_req: NextRequest) {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    const user = data?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await deleteUserAccount(user.id);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Account deletion failed', details: result.errors },
        { status: 500 }
      );
    }

    // Clear auth cookies similar to logout route
    const secure = process.env.NODE_ENV === 'production';
    const res = NextResponse.json({ success: true });
    res.cookies.set('sb-access-token', '', {
      maxAge: 0,
      path: '/',
      httpOnly: true,
      secure,
      sameSite: 'lax',
    });
    res.cookies.set('sb-refresh-token', '', {
      maxAge: 0,
      path: '/',
      httpOnly: true,
      secure,
      sameSite: 'lax',
    });
    return res;
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error during account deletion' }, { status: 500 });
  }
}


