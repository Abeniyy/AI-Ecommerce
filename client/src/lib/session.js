export function getSessionId() {
  let sid = localStorage.getItem('sid');
  if (!sid) {
    sid = (crypto?.randomUUID && crypto.randomUUID()) || String(Date.now());
    localStorage.setItem('sid', sid);
  }
  return sid;
}
