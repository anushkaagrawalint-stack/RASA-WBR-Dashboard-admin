import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { listScorecards, loadScorecard, parseScorecardFromBuffer } from '@/lib/scorecard';
import { listBlobScorecards, downloadBlob } from '@/lib/blobStorage';
import { weekInfoForLabel } from '@/lib/fiscalCalendar';

export const runtime = 'nodejs';

const cache = new Map();

const MONTHS = { jan:1,january:1,feb:2,february:2,mar:3,march:3,apr:4,april:4,may:5,jun:6,june:6,jul:7,july:7,aug:8,august:8,sep:9,sept:9,september:9,oct:10,october:10,nov:11,november:11,dec:12,december:12 };
function weeklyItem(filename) {
  const m = /\(([A-Za-z]+)\s+(\d+)\s+(\d{4})\s*-\s*([A-Za-z]+)\s+(\d+)\s+(\d{4})\)/.exec(filename);
  let label = filename.replace(/\.xlsx$/i, ''), sort = filename;
  if (m) {
    const [, mon1, d1, y1, , d2] = m;
    const fiscal = weekInfoForLabel(`${mon1} ${d1}`);
    label = fiscal ? `P${fiscal.period} W${fiscal.weekInPeriod} · ${mon1} ${d1}–${d2}` : `${mon1} ${d1}–${d2}`;
    sort = y1 + String(MONTHS[mon1.toLowerCase()] || 0).padStart(2, '0') + String(parseInt(d1, 10)).padStart(2, '0');
  }
  return { id: filename, label, sort };
}
function tokenItem(filename, re, prefix) {
  const m = re.exec(filename);
  return { id: filename, label: m ? prefix + m[1] : filename.replace(/\.xlsx$/i, ''), sort: m ? String(parseInt(m[1], 10)).padStart(4, '0') : filename };
}

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
      const local = listScorecards();
      let blobIdx = { weekly: [], period: [], quarter: [] };
      try { blobIdx = await listBlobScorecards(); } catch {}
      const merge = (localArr, blobArr, itemFn) => {
        const localIds = new Set(localArr.map(x => x.id));
        const extras = blobArr.filter(b => !localIds.has(b.filename)).map(b => itemFn(b.filename));
        return [...localArr, ...extras].sort((a, b) => a.sort.localeCompare(b.sort));
      };
      return NextResponse.json({
        weekly:  merge(local.weekly,  blobIdx.weekly,  f => weeklyItem(f)),
        period:  merge(local.period,  blobIdx.period,  f => tokenItem(f, /\bP(\d+)\b/i, 'P')),
        quarter: merge(local.quarter, blobIdx.quarter, f => tokenItem(f, /\bQ(\d+)\b/i, 'Q')),
      });
    }

    // ── Scorecard data ────────────────────────────────────────────────────────
    if (!item) return NextResponse.json({ error: 'Missing item' }, { status: 400 });
    const cacheKey = `${granularity}:${item}`;
    if (cache.has(cacheKey)) return NextResponse.json(cache.get(cacheKey));

    let data;
    try {
      data = loadScorecard(granularity, item);
    } catch (localErr) {
      if (localErr.code !== 'NOT_FOUND') throw localErr;
      const blobIdx = await listBlobScorecards();
      const blobFile = (blobIdx[granularity] || []).find(b => b.filename === item);
      if (!blobFile) { const e = new Error('Scorecard not found'); e.code = 'NOT_FOUND'; throw e; }
      const buf = await downloadBlob(blobFile.url);
      data = parseScorecardFromBuffer(buf, granularity);
    }
    cache.set(cacheKey, data);
    return NextResponse.json(data);
  } catch (err) {
    const status = err.code === 'NOT_FOUND' ? 404 : (err.code === 'BAD_ID' || err.code === 'BAD_GRANULARITY') ? 400 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
