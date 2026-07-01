import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { verifyAdmin } from '@/lib/auth';
import { getBlobStatus } from '@/lib/blobStorage';
import { listScorecards } from '@/lib/scorecard';

export const runtime = 'nodejs';

const DATA_DIR = path.join(process.cwd(), 'data');

function detectFileType(filename) {
  const n = filename.toLowerCase();
  if (n.includes('loyalty')) return 'loyalty';
  if (n.includes('catering') || n.includes('internal purpose')) return 'catering';
  if (n.includes('weekly review') || n.includes('powered by kutlerri') || n.includes('wbr')) return 'wbr';
  return null;
}

function getLocalWeekStatus() {
  if (!fs.existsSync(DATA_DIR)) return {};
  const weeks = {};
  try {
    for (const name of fs.readdirSync(DATA_DIR)) {
      const dir = path.join(DATA_DIR, name);
      if (!fs.statSync(dir).isDirectory()) continue;
      const files = fs.readdirSync(dir).filter(f => /\.xlsx?$/i.test(f));
      const present = { wbr: false, loyalty: false, catering: false };
      for (const f of files) {
        const type = detectFileType(f);
        if (type) present[type] = true;
      }
      weeks[name] = present;
    }
  } catch {}
  return weeks;
}

export async function GET(request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const [blobStatus, localWeeks, localScorecards] = await Promise.all([
      getBlobStatus(),
      Promise.resolve(getLocalWeekStatus()),
      Promise.resolve(listScorecards()),
    ]);

    // Merge local + blob weeks
    const allWeekNames = new Set([
      ...Object.keys(localWeeks),
      ...blobStatus.weeks.map(w => w.weekName),
    ]);
    const weeks = [...allWeekNames].sort().map(weekName => {
      const local = localWeeks[weekName] || { wbr: false, loyalty: false, catering: false };
      const blobEntry = blobStatus.weeks.find(w => w.weekName === weekName);
      const blob = blobEntry
        ? { wbr: blobEntry.wbr, loyalty: blobEntry.loyalty, catering: blobEntry.catering }
        : { wbr: false, loyalty: false, catering: false };
      return { weekName, local, blob };
    });

    // Merge local + blob scorecards
    const scorecards = {};
    for (const gran of ['weekly', 'period', 'quarter']) {
      const localFiles = (localScorecards[gran] || []).map(s => s.id);
      const blobFiles  = (blobStatus.scorecards[gran] || []).map(s => s.filename);
      const all = new Map();
      for (const f of localFiles) all.set(f, 'local');
      for (const f of blobFiles)  all.set(f, all.has(f) ? 'both' : 'blob');
      scorecards[gran] = [...all.entries()].map(([filename, source]) => ({ filename, source }));
    }

    return NextResponse.json({ weeks, scorecards });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
