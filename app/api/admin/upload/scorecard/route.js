import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { uploadScorecardFile } from '@/lib/blobStorage';

export const runtime = 'nodejs';

const VALID_GRANULARITIES = new Set(['weekly', 'period', 'quarter']);

export async function POST(request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const form = await request.formData();
    const granularity = form.get('granularity');
    const file = form.get('file');

    if (!granularity || !file) {
      return NextResponse.json({ error: 'granularity and file are required' }, { status: 400 });
    }
    if (!VALID_GRANULARITIES.has(granularity)) {
      return NextResponse.json({ error: 'granularity must be weekly, period, or quarter' }, { status: 400 });
    }
    if (!file.name.match(/\.xlsx$/i)) {
      return NextResponse.json({ error: 'Only .xlsx files are accepted' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadScorecardFile(granularity, buffer, file.name);
    return NextResponse.json({ ok: true, granularity, filename: file.name });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
