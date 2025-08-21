import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserAndOrg } from '../../lib/auth';

export async function GET() {
  const ctx = await getUserAndOrg();
  if ('error' in ctx) return NextResponse.json({ error:{ code:ctx.error, message:'Unauthorized' } }, { status: ctx.error==='AUTH_401'?401:403 });
  const { supa, org_id } = ctx;
  const { data, error } = await supa.from('tasks').select('*').eq('org_id', org_id).order('created_at', {ascending:false});
  if (error) return NextResponse.json({ error:{ code:'BAD_REQUEST', message:error.message } }, { status:400 });
  return NextResponse.json({ data });
}

const CreateTask = z.object({
  client_id: z.string().uuid(),
  template_id: z.string().uuid().nullable().optional(),
  period: z.string(),
  due_at: z.string().datetime().optional(),
  status: z.string().optional()
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreateTask.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error:{ code:'VALIDATION_422', message: parsed.error.message } }, { status:422 });
  const ctx = await getUserAndOrg();
  if ('error' in ctx) return NextResponse.json({ error:{ code:ctx.error, message:'Unauthorized' } }, { status: ctx.error==='AUTH_401'?401:403 });
  const { supa, org_id, user } = ctx;
  const { data, error } = await supa.from('tasks').insert({ org_id, ...parsed.data }).select().single();
  if (error) return NextResponse.json({ error:{ code:'VALIDATION_422', message:error.message } }, { status:422 });
  await supa.from('audit_logs').insert({ org_id, actor_id: user.id, action:'CREATE', entity:'task', entity_id: data.id, meta_json: parsed.data });
  return NextResponse.json({ data });
}
