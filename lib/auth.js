import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const USERS_FILE = path.join(process.cwd(), 'config', 'users.json');

// Verify a Bearer token from the Authorization header. Returns the decoded
// payload (e.g. { email, role }) on success, or null if missing/invalid/expired.
export function verifyAuth(request) {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

// Returns true only when the request carries a valid admin JWT.
export function verifyAdmin(request) {
  const payload = verifyAuth(request);
  return payload && payload.role === 'admin' ? payload : null;
}

// Returns the user map. Reads from config/users.json (managed via admin panel)
// if it exists and has entries; otherwise falls back to USERS_JSON env var.
export function getUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      if (Object.keys(parsed).length > 0) return parsed;
    }
  } catch {}
  try {
    return JSON.parse(process.env.USERS_JSON || '{}');
  } catch {
    return {};
  }
}

// Normalise a user entry to { hash, role }.
export function resolveUserEntry(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') return { hash: entry, role: 'user' };
  if (typeof entry === 'object' && entry.hash) return { hash: entry.hash, role: entry.role || 'user' };
  return null;
}
