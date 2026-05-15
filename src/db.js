const BASE = import.meta.env.VITE_SUPABASE_URL ?? '';
const KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const hasDB = !!(BASE && KEY);

function headers() {
  return {
    'apikey': KEY,
    'Authorization': `Bearer ${KEY}`,
    'Content-Type': 'application/json',
  };
}

export async function submitScore({ session, name, score, correct, total }) {
  if (!hasDB) return;
  try {
    await fetch(`${BASE}/rest/v1/scores`, {
      method: 'POST',
      headers: { ...headers(), 'Prefer': 'return=minimal' },
      body: JSON.stringify({ session, name, score, correct, total }),
    });
  } catch {}
}

export async function getScores(session) {
  if (!hasDB) return [];
  try {
    const r = await fetch(
      `${BASE}/rest/v1/scores?session=eq.${encodeURIComponent(session)}&order=score.desc&select=name,score,correct,total`,
      { headers: headers() }
    );
    return r.ok ? r.json() : [];
  } catch { return []; }
}
