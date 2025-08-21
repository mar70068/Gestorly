import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserAndOrg } from '../../../lib/auth';

const Body = z.object({ period: z.string() });

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error:{ code:'VALIDATION_422', message: parsed.error.message } }, { status:422 });
  const ctx = await getUserAndOrg();
  if ('error' in ctx) return NextResponse.json({ error:{ code:ctx.error, message:'Unauthorized' } }, { status: ctx.error==='AUTH_401'?401:403 });
  const { supa, org_id, user } = ctx;

  const { data: clients } = await supa.from('clients').select('id').eq('org_id', org_id);
  const { data: templates } = await supa.from('task_templates').select('id,title').eq('org_id', org_id).eq('active', true);

  const rows = [];
  for (const c of clients || []) for (const t of templates || []) rows.push({ org_id, client_id: c.id, template_id: t.id, period: parsed.data.period, status: 'pending' });

  if (rows.length){
    const { error } = await supa.from('tasks').insert(rows);
    if (error) return NextResponse.json({ error:{ code:'CONFLICT_409', message:error.message } }, { status:409 });
  }
  await supa.from('audit_logs').insert({ org_id, actor_id: user.id, action:'SCHEDULE_GENERATE', entity:'task', entity_id: null, meta_json: { period: parsed.data.period, created: rows.length } });
  return NextResponse.json({ data: { created: rows.length } });
}
