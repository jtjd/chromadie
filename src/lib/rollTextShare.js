/**
 * Build and copy a share message from one click-time snapshot of a confirmed
 * roll. The caller owns request/account freshness and browser/application
 * effects; challenge links still come from the authenticated server path.
 *
 * @param {{
 *   requestId: number,
 *   accountId: string | null,
 *   score: number,
 *   shareHex: string,
 *   rarity: string,
 *   earnedLine?: string,
 *   senderUsername?: string | null,
 *   appOrigin: string,
 *   authenticated: boolean,
 *   accountMode: string
 * }} snapshot
 * @param {{
 *   isCurrent: () => boolean,
 *   createChallengeLink: (payload: {score: number, hex: string, senderUsername: string | null}) => Promise<{success?: boolean, shareUrl?: string}>,
 *   writeText: (text: string) => Promise<void>,
 *   track: (name: string, payload: any) => void,
 *   toast: (message: string, type: string) => void,
 *   onCopied: () => void
 * }} effects
 * @returns {Promise<{status: 'stale' | 'copied' | 'copy-failed', text?: string}>}
 */
export async function runRollTextShare(snapshot, {
  isCurrent,
  createChallengeLink,
  writeText,
  track,
  toast,
  onCopied
}) {
  let shareUrl = snapshot.appOrigin;
  const challengeLink = snapshot.authenticated
    ? await createChallengeLink({
        score: snapshot.score,
        hex: snapshot.shareHex,
        senderUsername: snapshot.senderUsername
      })
    : { success: false };

  if (!isCurrent()) return { status: 'stale' };

  if (challengeLink.success && challengeLink.shareUrl) {
    shareUrl = new URL(challengeLink.shareUrl, snapshot.appOrigin).toString();
  } else if (snapshot.authenticated) {
    toast('The result was copied without a challenge link because the server could not create one.', 'error');
  }

  const callToAction = challengeLink.success ? `Challenge me: ${shareUrl}` : `Play ChromaDie: ${shareUrl}`;
  const earnedLine = snapshot.earnedLine ? `\n${snapshot.earnedLine}` : '';
  const text = `🎲 ChromaDie Daily Roll\n${snapshot.shareHex} • ${snapshot.score.toLocaleString()} pts • ${snapshot.rarity}${earnedLine}\n${callToAction}`;

  track('progression_share_started', {
    surface: 'roll',
    accountMode: snapshot.accountMode,
    method: 'clipboard'
  });

  try {
    await writeText(text);
  } catch {
    if (!isCurrent()) return { status: 'stale' };
    toast('Could not copy the result. Please try again.', 'error');
    return { status: 'copy-failed' };
  }

  if (!isCurrent()) return { status: 'stale' };
  onCopied();
  return { status: 'copied', text };
}
