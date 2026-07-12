export async function signOutCurrentBrowser(auth) {
  let first;
  try {
    first = await auth.signOut();
  } catch (error) {
    first = { error };
  }
  if (!first?.error) return { error: null, usedLocalFallback: false };

  let fallback;
  try {
    fallback = await auth.signOut({ scope: 'local' });
  } catch (error) {
    fallback = { error };
  }
  return {
    error: fallback?.error || null,
    usedLocalFallback: !fallback?.error
  };
}
