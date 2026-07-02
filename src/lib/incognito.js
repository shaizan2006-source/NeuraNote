/** True while an incognito session is usable: not explicitly closed, not past TTL. */
export function sessionActive(session, now = new Date()) {
  if (!session) return false;
  if (session.closed_at) return false;
  return new Date(session.expires_at) > now;
}
