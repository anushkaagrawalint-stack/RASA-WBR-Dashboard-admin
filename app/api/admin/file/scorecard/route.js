import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { downloadScorecardFile } from '@/lib/githubStorage';

export const runtime = 'nodejs';

const VALID_GRANULARITIES = new Set(['weekly', 'period', 'quarter']);

export async function GET(request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const granularity = searchParams.get('granularity');
  const filename = searchParams.get('filename');

  if (!granularity || !filename) {
    return NextResponse.json({ error: 'granularity and filename are required' }, { status: 400 });
  }
  if (!VALID_GRANULARITIES.has(granularity)) {
    return NextResponse.json({ error: 'Invalid granularity' }, { status: 400 });
  }
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }

  try {
    const result = await downloadScorecardFile(granularity, filename);
    if (!result) return NextResponse.json({ error: 'File not found' }, { status: 404 });
    return new NextResponse(result.buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
