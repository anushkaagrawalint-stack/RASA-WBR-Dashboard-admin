import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { verifyAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

const DATA_DIR = path.join(process.cwd(), 'data');
const VALID_TYPES = new Set(['wbr', 'loyalty', 'catering']);

function matchesType(filename, fileType) {
  const n = filename.toLowerCase();
  if (fileType === 'loyalty')  return n.includes('loyalty');
  if (fileType === 'catering') return n.includes('catering') || n.includes('internal purpose');
  if (fileType === 'wbr')      return n.includes('weekly review') || n.includes('powered by kutlerri') || n.includes('wbr');
  return false;
}

export async function DELETE(request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const { weekName, fileType } = await request.json();
    if (!weekName) return NextResponse.json({ error: 'weekName is required' }, { status: 400 });
    if (weekName.includes('..') || weekName.includes('/') || weekName.includes('\\')) {
      return NextResponse.json({ error: 'Invalid weekName' }, { status: 400 });
    }

    const weekDir = path.join(DATA_DIR, weekName);
    if (!fs.existsSync(weekDir)) {
      return NextResponse.json({ error: 'Week not found' }, { status: 404 });
    }

    if (fileType) {
      if (!VALID_TYPES.has(fileType)) {
        return NextResponse.json({ error: 'Invalid fileType' }, { status: 400 });
      }
      const files = fs.readdirSync(weekDir).filter(f => /\.xlsx$/i.test(f));
      let deleted = 0;
      for (const f of files) {
        if (matchesType(f, fileType)) {
          fs.unlinkSync(path.join(weekDir, f));
          deleted++;
        }
      }
      return NextResponse.json({ ok: true, deleted });
    }

    // Delete entire week folder
    fs.rmSync(weekDir, { recursive: true, force: true });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
