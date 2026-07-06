import { NextResponse } from 'next/server';
import { verifyAdmin, getUsers, resolveUserEntry } from '@/lib/auth';
import { getUsersConfig, saveUsersConfig } from '@/lib/githubStorage';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

const VALID_ROLES = new Set(['admin', 'user']);

// Helper: get current users from GitHub file, seeding from env var on first use.
async function currentUsers() {
  const fromGithub = await getUsersConfig();
  if (fromGithub !== null) return fromGithub;
  // First time: seed from USERS_JSON env var so existing accounts carry over.
  return getUsers();
}

// GET /api/admin/users — list all users (emails + roles, no hashes).
export async function GET(request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const users = await currentUsers();
    const list = Object.entries(users).map(([email, entry]) => {
      const resolved = resolveUserEntry(entry);
      return { email, role: resolved?.role || 'user' };
    });
    return NextResponse.json({ users: list });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/admin/users — add a new user or update an existing one.
// Body: { email, password?, role }
// password is required when adding a new user; optional when updating (omit to keep existing).
export async function POST(request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const { email, password, role } = await request.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }
    const normalised = email.toLowerCase().trim();
    if (!VALID_ROLES.has(role)) {
      return NextResponse.json({ error: 'role must be admin or user' }, { status: 400 });
    }

    const users = await currentUsers();
    const existing = resolveUserEntry(users[normalised]);

    if (!existing && !password) {
      return NextResponse.json({ error: 'password is required for new users' }, { status: 400 });
    }
    if (password && password.length < 6) {
      return NextResponse.json({ error: 'password must be at least 6 characters' }, { status: 400 });
    }

    const hash = password ? await bcrypt.hash(password, 10) : existing.hash;
    users[normalised] = { hash, role };
    await saveUsersConfig(users);

    return NextResponse.json({ ok: true, email: normalised, role });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/admin/users — remove a user.
// Body: { email }
export async function DELETE(request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 });
    const normalised = email.toLowerCase().trim();

    // Prevent admin from deleting their own account.
    const caller = verifyAdmin(request);
    if (caller.email === normalised) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
    }

    const users = await currentUsers();
    if (!users[normalised]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    delete users[normalised];
    await saveUsersConfig(users);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
