export function isChallengeId(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

export async function loadAuthoritativeChallenge(id, env) {
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const supabaseKey = env.VITE_SUPABASE_KEY || env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey || !isChallengeId(id)) return null;

  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/challenge-link`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'get', id })
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.success ? data.challenge : null;
  } catch {
    return null;
  }
}
