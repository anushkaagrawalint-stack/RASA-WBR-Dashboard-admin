import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { getAllWeeks, listScorecardFiles } from '@/lib/githubStorage';

export const runtime = 'nodejs';

export async function GET(request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const [weeks, scorecards] = await Promise.all([
      getAllWeeks(),
      listScorecardFiles(),
    ]);
    return NextResponse.json({ weeks, scorecards });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
