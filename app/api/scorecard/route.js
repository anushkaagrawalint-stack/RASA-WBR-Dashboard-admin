import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { listScorecards, loadScorecard } from '@/lib/scorecard';

export const runtime = 'nodejs';

// In-memory cache for parsed scorecards (files are large; parsing is the cost).
const cache = new Map();

export async function GET(request) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = new URL(request.url);
  const granularity = url.searchParams.get('granularity');
  const item = url.searchParams.get('item');

  try {
    // No granularity → return the index of available scorecards.
    if (!granularity) {
      return NextResponse.json(listScorecards());
    }
    if (!item) {
      return NextResponse.json({ error: 'Missing item' }, { status: 400 });
    }
    const key = `${granularity}:${item}`;
    if (cache.has(key)) return NextResponse.json(cache.get(key));
    const data = loadScorecard(granularity, item);
    cache.set(key, data);
    return NextResponse.json(data);
  } catch (err) {
    const status = err.code === 'NOT_FOUND' ? 404
                 : (err.code === 'BAD_ID' || err.code === 'BAD_GRANULARITY') ? 400
                 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
