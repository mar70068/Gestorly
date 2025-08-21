import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserAndOrg } from '../../../../lib/auth';

const Body = z.object({
  body: z.string().min(1)
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const json = await req.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error:{ code:'VALIDATION_422', message: parsed.error.message } }, { status:422 });
  const ctx = await getUserAndOrg();
  if ('error' in ctx) return NextResponse.json({ error:{ code:ctx.error, message:'Unauthorized' } }, { status: ctx.error==='AUTH_401'?401:403 });
  const { supa, org_id, user } = ctx;

  const { data, error } = await supa.from('messages').insert({
    org_id, thread_id: params.id, author_id: user.id, body: parsed.data.body, has_attachments: false
  }).select().single();
  if (error) return NextResponse.json({ error:{ code:'VALIDATION_422', message: error.message } }, { status:422 });
  await supa.from('audit_logs').insert({ org_id, actor_id: user.id, action:'CREATE', entity:'message', entity_id: data.id, meta_json: { thread_id: params.id } });
  return NextResponse.json({ data });
}
