import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserAndOrg } from '../../lib/auth';

const CreateThread = z.object({
  client_id: z.string().uuid().optional(),
  topic: z.string().min(2),
  linked_type: z.enum(['general','task','filing']).default('general'),
  linked_id: z.string().uuid().nullable().optional()
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreateThread.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error:{ code:'VALIDATION_422', message: parsed.error.message } }, { status:422 });
  const ctx = await getUserAndOrg();
  if ('error' in ctx) return NextResponse.json({ error:{ code:ctx.error, message:'Unauthorized' } }, { status: ctx.error==='AUTH_401'?401:403 });
  const { supa, org_id, user } = ctx;
  const { data, error } = await supa.from('threads').insert({ org_id, ...parsed.data }).select().single();
  if (error) return NextResponse.json({ error:{ code:'VALIDATION_422', message:error.message } }, { status:422 });
  await supa.from('audit_logs').insert({ org_id, actor_id: user.id, action:'CREATE', entity:'thread', entity_id: data.id, meta_json: parsed.data });
  return NextResponse.json({ data });
}
