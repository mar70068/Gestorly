import { headers } from 'next/headers';
import { supabaseService } from './supabaseService';

export async function getUserAndOrg() {
  const hdrs = headers();
  const auth = hdrs.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return { error: 'AUTH_401' as const };
  }
  const token = auth.substring('Bearer '.length);
  const supa = supabaseService();
  const { data: { user }, error } = await supa.auth.getUser(token);
  if (error || !user) return { error: 'AUTH_401' as const };

  const { data: memberships } = await supa
    .from('org_members')
    .select('org_id, status')
    .eq('user_id', user.id)
    .eq('status', 'active');

  if (!memberships || memberships.length === 0) return { error: 'FORBIDDEN_403' as const };

  // Optionally honor x-org-id
  const orgHeader = hdrs.get('x-org-id');
  const allowed = memberships.map(m => m.org_id);
  const org_id = orgHeader && allowed.includes(orgHeader) ? orgHeader : allowed[0];

  return { user, org_id, supa };
}
