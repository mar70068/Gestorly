import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserAndOrg } from '../../../lib/auth';

const Patch = z.object({
  status: z.enum(['submitted']).default('submitted'),
  submitted_at: z.string().datetime().optional(),
  reference: z.string().optional(),
  amount_due: z.number().optional(),
  evidence_document_id: z.string().uuid().optional()
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const parsed = Patch.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error:{ code:'VALIDATION_422', message: parsed.error.message } }, { status:422 });
  const ctx = await getUserAndOrg();
  if ('error' in ctx) return NextResponse.json({ error:{ code:ctx.error, message:'Unauthorized' } }, { status: ctx.error==='AUTH_401'?401:403 });
  const { supa, org_id, user } = ctx;
  const { data, error } = await supa.from('filings').update({ ...parsed.data }).eq('id', params.id).eq('org_id', org_id).select().single();
  if (error) return NextResponse.json({ error:{ code:'VALIDATION_422', message:error.message } }, { status:422 });
  await supa.from('audit_logs').insert({ org_id, actor_id: user.id, action:'UPDATE', entity:'filing', entity_id: data.id, meta_json: parsed.data });
  return NextResponse.json({ data });
}
