import { NextResponse } from 'next/server';
import path from 'path';
import { listWeekFolders, deriveWeekLabel } from '@/lib/xlsxParser';
import { weekInfoForLabel } from '@/lib/fiscalCalendar';
import { verifyAuth } from '@/lib/auth';
import { listBlobWeeks } from '@/lib/blobStorage';

export const runtime = 'nodejs';

const DATA_DIR = path.join(process.cwd(), 'data');

function enrichWeek(name, label) {
  const info = weekInfoForLabel(label) || weekInfoForLabel(name);
  return {
    week: name,
    label,
    period: info ? info.period : null,
    weekInPeriod: info ? info.weekInPeriod : null,
  };
}

export async function GET(request) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    // Local weeks from data/ folder
    const localFolders = listWeekFolders(DATA_DIR);
    const localSheets = localFolders.map(name => {
      const label = deriveWeekLabel(path.join(DATA_DIR, name));
      return enrichWeek(name, label);
    });

    // Blob weeks — only include blob weeks not already present locally
    let blobNames = [];
    try { blobNames = await listBlobWeeks(); } catch {}
    const localNames = new Set(localFolders);
    const blobSheets = blobNames
      .filter(name => !localNames.has(name))
      .map(name => enrichWeek(name, name));

    const sheets = [...localSheets, ...blobSheets];
    return NextResponse.json({ sheets });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
