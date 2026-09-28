// Mirror of public.roll_score_to_ep(bigint). The database function is the
// authority for account grants; this projection is for balance analysis and
// guest/result presentation only.
export const EP_LINEAR_KNEE = 80_000;

export function rollScoreToEp(score) {
  const safeScore = Math.max(0, Math.trunc(Number(score) || 0));
  if (safeScore <= EP_LINEAR_KNEE) return safeScore;
  return EP_LINEAR_KNEE + Math.round(
    EP_LINEAR_KNEE * Math.log1p((safeScore - EP_LINEAR_KNEE) / EP_LINEAR_KNEE)
  );
}
