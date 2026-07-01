import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { parseWeekFolder, parseWeekFolderFromBuffers } from '@/lib/xlsxParser';
import { verifyAuth } from '@/lib/auth';
import { listBlobWeekFiles, downloadBlob } from '@/lib/blobStorage';

export const runtime = 'nodejs';

const DATA_DIR = path.join(process.cwd(), 'data');

const cache = new Map();

function localFingerprint(dirPath) {
  if (!fs.existsSync(dirPath)) return '';
  const files = fs.readdirSync(dirPath).filter(f => /\.xlsx?$/i.test(f));
  return files.map(f => f + ':' + fs.statSync(path.join(dirPath, f)).mtimeMs).join('|');
}

export async function GET(request, { params }) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { week } = await params;
    if (!week || /[\\/]/.test(week) || week.includes('..')) {
      return NextResponse.json({ error: 'Invalid week name' }, { status: 400 });
    }

    const localFolder = path.join(DATA_DIR, week);

    // ── Local path ────────────────────────────────────────────────────────────
    if (fs.existsSync(localFolder)) {
      const fp = localFingerprint(localFolder);
      const cacheKey = `local:${week}:${fp}`;
      if (cache.has(cacheKey)) return NextResponse.json(cache.get(cacheKey));
      const data = parseWeekFolder(localFolder);
      cache.set(cacheKey, data);
      return NextResponse.json(data);
    }

    // ── Blob path ─────────────────────────────────────────────────────────────
    const blobFiles = await listBlobWeekFiles(week);
    if (!blobFiles.wbr && !blobFiles.loyalty && !blobFiles.catering) {
      return NextResponse.json({ error: 'Week not found: ' + week }, { status: 404 });
    }

    const blobFp = [blobFiles.wbr?.url, blobFiles.loyalty?.url, blobFiles.catering?.url].join('|');
    const cacheKey = `blob:${week}:${blobFp}`;
    if (cache.has(cacheKey)) return NextResponse.json(cache.get(cacheKey));

    const buffers = {};
    if (blobFiles.wbr)      buffers.wbr      = await downloadBlob(blobFiles.wbr.url);
    if (blobFiles.loyalty)  buffers.loyalty  = await downloadBlob(blobFiles.loyalty.url);
    if (blobFiles.catering) buffers.catering = await downloadBlob(blobFiles.catering.url);

    const data = parseWeekFolderFromBuffers(buffers, week);
    cache.set(cacheKey, data);
    return NextResponse.json(data);
  } catch (err) {
    console.error('[api/data/[week]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
