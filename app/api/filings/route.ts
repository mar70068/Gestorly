import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserAndOrg } from '../../lib/auth';

const CreateFiling = z.object({
  client_id: z.string().uuid(),
  filing_type_id: z.string().uuid(),
  period: z.string()
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreateFiling.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error:{ code:'VALIDATION_422', message: parsed.error.message } }, { status:422 });
  const ctx = await getUserAndOrg();
  if ('error' in ctx) return NextResponse.json({ error:{ code:ctx.error, message:'Unauthorized' } }, { status: ctx.error==='AUTH_401'?401:403 });
  const { supa, org_id, user } = ctx;
  const { data, error } = await supa.from('filings').insert({ org_id, ...parsed.data, status: 'draft' }).select().single();
  if (error) return NextResponse.json({ error:{ code:'VALIDATION_422', message:error.message } }, { status:422 });
  await supa.from('audit_logs').insert({ org_id, actor_id: user.id, action:'CREATE', entity:'filing', entity_id: data.id, meta_json: parsed.data });
  return NextResponse.json({ data });
}
