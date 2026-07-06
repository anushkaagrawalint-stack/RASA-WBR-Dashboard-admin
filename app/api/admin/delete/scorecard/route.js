import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { deleteScorecardFile } from '@/lib/githubStorage';

export const runtime = 'nodejs';

export async function DELETE(request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const { granularity, filename } = await request.json();
    if (!granularity || !filename) {
      return NextResponse.json({ error: 'granularity and filename are required' }, { status: 400 });
    }
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }
    await deleteScorecardFile(granularity, filename);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
