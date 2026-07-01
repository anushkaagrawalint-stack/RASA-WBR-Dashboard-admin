// Vercel Blob helpers for WBR data and scorecard files.
//
// Blob path conventions:
//   wbr-data/{weekName}/wbr.xlsx
//   wbr-data/{weekName}/loyalty.xlsx
//   wbr-data/{weekName}/catering.xlsx
//   scorecard/{granularity}/{filename}
import { list, put, del } from '@vercel/blob';

// ── WBR Data ─────────────────────────────────────────────────────────────────

export async function listBlobWeeks() {
  const { blobs } = await list({ prefix: 'wbr-data/', mode: 'folded' });
  // Each blob URL is like wbr-data/{weekName}/{file} — extract unique week names.
  const weeks = new Set();
  for (const b of blobs) {
    const parts = b.pathname.split('/');
    if (parts.length >= 3) weeks.add(decodeURIComponent(parts[1]));
  }
  return [...weeks].sort();
}

// Returns { wbr, loyalty, catering } — each is the blob object or null.
export async function listBlobWeekFiles(weekName) {
  const prefix = `wbr-data/${encodeURIComponent(weekName)}/`;
  const { blobs } = await list({ prefix });
  const map = { wbr: null, loyalty: null, catering: null };
  for (const b of blobs) {
    const file = b.pathname.split('/').pop();
    if (file === 'wbr.xlsx')      map.wbr      = b;
    if (file === 'loyalty.xlsx')  map.loyalty  = b;
    if (file === 'catering.xlsx') map.catering = b;
  }
  return map;
}

// Download a blob and return its Buffer.
export async function downloadBlob(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to download blob: ' + url);
  return Buffer.from(await res.arrayBuffer());
}

export async function uploadWbrFile(weekName, fileType, buffer, originalName) {
  const path = `wbr-data/${encodeURIComponent(weekName)}/${fileType}.xlsx`;
  await put(path, buffer, { access: 'public', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', addRandomSuffix: false });
}

export async function deleteWbrFile(weekName, fileType) {
  const path = `wbr-data/${encodeURIComponent(weekName)}/${fileType}.xlsx`;
  await del(path);
}

export async function deleteWbrWeek(weekName) {
  for (const ft of ['wbr', 'loyalty', 'catering']) {
    try { await deleteWbrFile(weekName, ft); } catch {}
  }
}

// ── Scorecard ─────────────────────────────────────────────────────────────────

export async function listBlobScorecards() {
  const { blobs } = await list({ prefix: 'scorecard/' });
  const result = { weekly: [], period: [], quarter: [] };
  for (const b of blobs) {
    const parts = b.pathname.split('/');
    if (parts.length < 3) continue;
    const granularity = parts[1];
    const filename = decodeURIComponent(parts[2]);
    if (result[granularity]) result[granularity].push({ filename, url: b.url, pathname: b.pathname });
  }
  return result;
}

export async function uploadScorecardFile(granularity, buffer, filename) {
  const path = `scorecard/${granularity}/${encodeURIComponent(filename)}`;
  await put(path, buffer, { access: 'public', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', addRandomSuffix: false });
}

export async function deleteScorecardFile(granularity, filename) {
  const path = `scorecard/${granularity}/${encodeURIComponent(filename)}`;
  await del(path);
}

// ── Admin status: all blob weeks with which files are present ─────────────────

export async function getBlobStatus() {
  const { blobs } = await list({ prefix: 'wbr-data/' });
  const weeks = {};
  for (const b of blobs) {
    const parts = b.pathname.split('/');
    if (parts.length < 3) continue;
    const weekName = decodeURIComponent(parts[1]);
    const file = parts[2];
    if (!weeks[weekName]) weeks[weekName] = { weekName, wbr: false, loyalty: false, catering: false };
    if (file === 'wbr.xlsx')      weeks[weekName].wbr      = true;
    if (file === 'loyalty.xlsx')  weeks[weekName].loyalty  = true;
    if (file === 'catering.xlsx') weeks[weekName].catering = true;
  }

  const scorecardBlobs = await listBlobScorecards();

  return {
    weeks: Object.values(weeks).sort((a, b) => a.weekName.localeCompare(b.weekName)),
    scorecards: scorecardBlobs,
  };
}
