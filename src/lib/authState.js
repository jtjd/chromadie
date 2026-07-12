export const ACCOUNT_STATES = Object.freeze({
  BOOTING: 'booting',
  SIGNED_OUT: 'signed_out',
  PROFILE_LOADING: 'profile_loading',
  PROFILE_ERROR: 'profile_error',
  AUTHENTICATED: 'authenticated'
});

export function resolveAccountState({ initialized, session, profile, profileReady, profileLoadFailed }) {
  if (!initialized) return ACCOUNT_STATES.BOOTING;
  if (!session) return ACCOUNT_STATES.SIGNED_OUT;
  if (profileLoadFailed) return ACCOUNT_STATES.PROFILE_ERROR;
  if (!profileReady) return ACCOUNT_STATES.PROFILE_LOADING;
  if (profile?.id === session.user?.id) return ACCOUNT_STATES.AUTHENTICATED;
  return ACCOUNT_STATES.PROFILE_ERROR;
}
