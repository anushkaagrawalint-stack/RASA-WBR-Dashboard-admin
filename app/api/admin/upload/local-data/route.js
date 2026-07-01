import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { verifyAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

const DATA_DIR = path.join(process.cwd(), 'data');
const VALID_TYPES = new Set(['wbr', 'loyalty', 'catering']);

export async function POST(request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const form = await request.formData();
    const weekName = form.get('weekName');
    const fileType = form.get('fileType');
    const file     = form.get('file');

    if (!weekName || !fileType || !file) {
      return NextResponse.json({ error: 'weekName, fileType and file are required' }, { status: 400 });
    }
    if (!VALID_TYPES.has(fileType)) {
      return NextResponse.json({ error: 'fileType must be wbr, loyalty, or catering' }, { status: 400 });
    }
    if (weekName.includes('..') || weekName.includes('/') || weekName.includes('\\')) {
      return NextResponse.json({ error: 'Invalid weekName' }, { status: 400 });
    }
    if (!file.name.match(/\.xlsx$/i)) {
      return NextResponse.json({ error: 'Only .xlsx files are accepted' }, { status: 400 });
    }

    const weekDir = path.join(DATA_DIR, weekName);
    if (!fs.existsSync(weekDir)) fs.mkdirSync(weekDir, { recursive: true });

    // Remove any existing file of this type (there may be one with original filename)
    const existing = fs.readdirSync(weekDir).filter(f => /\.xlsx$/i.test(f));
    for (const f of existing) {
      const n = f.toLowerCase();
      const isMatch =
        (fileType === 'loyalty'  && n.includes('loyalty')) ||
        (fileType === 'catering' && (n.includes('catering') || n.includes('internal purpose'))) ||
        (fileType === 'wbr'      && (n.includes('weekly review') || n.includes('powered by kutlerri') || n.includes('wbr')));
      if (isMatch) fs.unlinkSync(path.join(weekDir, f));
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(weekDir, `${fileType}.xlsx`), buffer);

    return NextResponse.json({ ok: true, weekName, fileType });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
