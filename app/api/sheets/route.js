import { NextResponse } from 'next/server';
import path from 'path';
import { listWeekFolders, deriveWeekLabel } from '@/lib/xlsxParser';
import { weekInfoForLabel } from '@/lib/fiscalCalendar';
import { verifyAuth } from '@/lib/auth';

export const runtime = 'nodejs';

const DATA_DIR = path.join(process.cwd(), 'data');

export async function GET(request) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const folders = listWeekFolders(DATA_DIR);
    const sheets = folders.map(name => {
      const label = deriveWeekLabel(path.join(DATA_DIR, name));
      const info = weekInfoForLabel(label) || weekInfoForLabel(name);
      return {
        week: name,
        label,
        period: info ? info.period : null,
        weekInPeriod: info ? info.weekInPeriod : null,
      };
    });
    return NextResponse.json({ sheets });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
