import { NextResponse } from 'next/server';
import { listWeeks } from '@/lib/githubStorage';
import { weekInfoForLabel } from '@/lib/fiscalCalendar';
import { verifyAuth } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(request) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const weekNames = await listWeeks();
    const sheets = weekNames.map(name => {
      const info = weekInfoForLabel(name);
      return {
        week: name,
        label: name,
        period: info ? info.period : null,
        weekInPeriod: info ? info.weekInPeriod : null,
      };
    });
    return NextResponse.json({ sheets });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
