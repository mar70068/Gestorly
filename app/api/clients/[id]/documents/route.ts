import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserAndOrg } from '../../../../lib/auth';

const Body = z.object({
  filename: z.string().min(1),
  mime: z.string().optional(),
  size: z.number().optional(),
  type: z.string().optional(),
  period: z.string().optional()
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error:{ code:'VALIDATION_422', message: parsed.error.message } }, { status:422 });
  const ctx = await getUserAndOrg();
  if ('error' in ctx) return NextResponse.json({ error:{ code:ctx.error, message:'Unauthorized' } }, { status: ctx.error==='AUTH_401'?401:403 });
  const { supa, org_id, user } = ctx;

  const path = `${org_id}/${params.id}/${Date.now()}_${parsed.data.filename}`;

  const { data: signed, error: signErr } = await supa.storage.from('gestorly-docs').createSignedUploadUrl(path);
  if (signErr) return NextResponse.json({ error:{ code:'STORAGE_ERR', message: signErr.message } }, { status:500 });

  const { data: doc, error: docErr } = await supa.from('documents').insert({
    org_id, client_id: params.id, uploader_id: user.id, path,
    file_name: parsed.data.filename, file_size: parsed.data.size ?? null, mime_type: parsed.data.mime ?? null,
    type: parsed.data.type ?? null, period: parsed.data.period ?? null
  }).select().single();
  if (docErr) return NextResponse.json({ error:{ code:'VALIDATION_422', message: docErr.message } }, { status:422 });

  await supa.from('audit_logs').insert({ org_id, actor_id: user.id, action:'CREATE', entity:'document', entity_id: doc.id, meta_json: { filename: parsed.data.filename } });

  return NextResponse.json({ data: { document_id: doc.id, upload: signed } });
}
