// app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db/client';
import { candidates } from '@/lib/db/schema';
import { writePdf, pdfPathFor } from '@/lib/storage';
import { enqueueExtraction } from '@/lib/extraction/queue';
import { getUserFromRequest } from '@/lib/auth/session';
import { checkRateLimit } from '@/lib/rate-limit';

const MAX_BYTES = 10 * 1024 * 1024;
const PDF_MAGIC = Buffer.from('%PDF-', 'utf8');

export async function POST(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  if (!checkRateLimit(`upload:${user.id}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'rate_limited', message: '上传过于频繁，请稍后再试' }, { status: 429 });
  }

  let form: FormData;
  try { form = await req.formData(); }
  catch { return NextResponse.json({ error: 'invalid_form' }, { status: 400 }); }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'missing_file' }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'file_too_large' }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  // magic-bytes 校验比 mime 可靠
  if (!bytes.subarray(0, 5).equals(PDF_MAGIC)) {
    return NextResponse.json({ error: 'not_a_pdf' }, { status: 415 });
  }

  const id = nanoid(12);
  const path = pdfPathFor(id);
  writePdf(path, bytes);

  const now = new Date();
  db.insert(candidates).values({
    id,
    pdfPath: path,
    pdfSize: bytes.length,
    status: '待筛选',
    extractionStatus: 'uploaded',
    userId: user.id,
    createdAt: now, updatedAt: now,
  }).run();

  enqueueExtraction(id);

  return NextResponse.json({ id, extractionStatus: 'uploaded' });
}
