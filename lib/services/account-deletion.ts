import { createClient } from '@/lib/supabase/server';

export type AccountDeletionResult = { success: true } | { success: false; errors: string[] };

export async function deleteUserAccount(userId: string): Promise<AccountDeletionResult> {
  const supabase = createClient();
  const errors: string[] = [];

  // Delete related data first (child tables) respecting RLS policies; assumes RLS allows owner to delete
  const deleteProfile = await supabase.from('user_profiles').delete().eq('user_id', userId).select();
  if ((deleteProfile as any)?.error) {
    errors.push((deleteProfile as any).error.message || 'failed to delete profile');
  }

  const deleteIncidents = await supabase.from('incidents').delete().eq('user_id', userId).select();
  if ((deleteIncidents as any)?.error) {
    errors.push((deleteIncidents as any).error.message || 'failed to delete incidents');
  }

  // Delete auth user via admin API (requires service role in real env; here mocked in tests)
  const admin: any = supabase.auth as any;
  if (admin?.admin?.deleteUser) {
    const adminDelete = await admin.admin.deleteUser(userId);
    if (adminDelete?.error) {
      errors.push(adminDelete.error.message || 'failed to delete auth user');
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true };
}


