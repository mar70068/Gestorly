import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserAndOrg } from '../../../lib/auth';

export async function GET() {
  const ctx = await getUserAndOrg();
  if ('error' in ctx) return NextResponse.json({ error:{ code:ctx.error, message:'Unauthorized' } }, { status: ctx.error==='AUTH_401'?401:403 });
  const { supa, org_id } = ctx;
  const { data, error } = await supa.from('clients').select('*').eq('org_id', org_id).order('created_at', {ascending:false});
  if (error) return NextResponse.json({ error:{ code:'BAD_REQUEST', message:error.message } }, { status:400 });
  return NextResponse.json({ data });
}

const CreateClient = z.object({
  display_name: z.string().min(2),
  tax_id: z.string().optional(),
  country: z.string().default('ES'),
  assignee_id: z.string().uuid().optional()
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreateClient.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error:{ code:'VALIDATION_422', message: parsed.error.message } }, { status:422 });
  const ctx = await getUserAndOrg();
  if ('error' in ctx) return NextResponse.json({ error:{ code:ctx.error, message:'Unauthorized' } }, { status: ctx.error==='AUTH_401'?401:403 });
  const { supa, org_id, user } = ctx;
  const { data, error } = await supa.from('clients').insert({ org_id, ...parsed.data }).select().single();
  if (error) return NextResponse.json({ error:{ code:'VALIDATION_422', message:error.message } }, { status:422 });
  await supa.from('audit_logs').insert({ org_id, actor_id: user.id, action:'CREATE', entity:'client', entity_id: data.id, meta_json: parsed.data });
  return NextResponse.json({ data });
}
