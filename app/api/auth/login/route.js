import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getUsers, resolveUserEntry } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { email, password } = body || {};
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }

  const users = getUsers();
  const normalized = String(email).toLowerCase().trim();
  const entry = resolveUserEntry(users[normalized]);
  if (!entry) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, entry.hash);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const role = entry.role || 'user';
  const token = jwt.sign({ email: normalized, role }, process.env.JWT_SECRET, { expiresIn: '8h' });
  return NextResponse.json({ token, user: { email: normalized, role } });
}
