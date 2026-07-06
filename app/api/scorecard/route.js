import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { listScorecards, loadScorecard } from '@/lib/scorecard';

export const runtime = 'nodejs';

const cache = new Map();

export async function GET(request) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = new URL(request.url);
  const granularity = url.searchParams.get('granularity');
  const item = url.searchParams.get('item');

  try {
    // ── Index ─────────────────────────────────────────────────────────────────
    if (!granularity) {
      return NextResponse.json(listScorecards());
    }

    // ── Scorecard data ────────────────────────────────────────────────────────
    if (!item) return NextResponse.json({ error: 'Missing item' }, { status: 400 });
    const cacheKey = `${granularity}:${item}`;
    if (cache.has(cacheKey)) return NextResponse.json(cache.get(cacheKey));

    const data = loadScorecard(granularity, item);
    cache.set(cacheKey, data);
    return NextResponse.json(data);
  } catch (err) {
    const status = err.code === 'NOT_FOUND' ? 404 : (err.code === 'BAD_ID' || err.code === 'BAD_GRANULARITY') ? 400 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
