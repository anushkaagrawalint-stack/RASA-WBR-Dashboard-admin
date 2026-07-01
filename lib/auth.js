import jwt from 'jsonwebtoken';

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

// Returns the user map parsed from USERS_JSON env.
// Each entry is either a bcrypt hash string OR { hash, role } object.
export function getUsers() {
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
