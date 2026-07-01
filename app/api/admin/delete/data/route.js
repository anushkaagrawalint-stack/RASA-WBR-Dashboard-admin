import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { deleteWbrFile, deleteWbrWeek } from '@/lib/blobStorage';

export const runtime = 'nodejs';

export async function DELETE(request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const { weekName, fileType } = await request.json();
    if (!weekName) return NextResponse.json({ error: 'weekName is required' }, { status: 400 });
    if (fileType) {
      await deleteWbrFile(weekName, fileType);
    } else {
      await deleteWbrWeek(weekName);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
