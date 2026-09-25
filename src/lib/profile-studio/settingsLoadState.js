function createStudioIdentityDraft(studioDraft, context) {
  return studioDraft
    ? {
        bio: context.targetProfile?.bio || '',
        identityPresentation: studioDraft.identityPresentation
      }
    : null;
}

function createResolvedLoadState(context, studioDraft, error = '') {
  return {
    context,
    studioDraft,
    studioIdentityDraft: createStudioIdentityDraft(studioDraft, context),
    cosmeticPreviewLoadout: null,
    error,
    preserveDrafts: false
  };
}

/**
 * Project one accepted Profile Studio context response into its editor state.
 * Request and account identity must be checked by the caller before invoking
 * this function.
 *
 * @param {{previousContext?: any, nextContext: any, studioDraft?: any, fallbackColor: string, mergeProfileStudioContext: (previous: any, next: any) => any, toEditorProfileConfig: (value: any, fallbackColor?: string) => any}} options
 */
export function resolveProfileStudioSettingsLoadState({
  previousContext = null,
  nextContext,
  studioDraft: currentDraft = null,
  fallbackColor,
  mergeProfileStudioContext,
  toEditorProfileConfig
}) {
  if (nextContext.loadError && previousContext) {
    return {
      context: { ...previousContext, dataWarning: nextContext.loadError },
      preserveDrafts: true
    };
  }

  if (nextContext.configurationUnavailable) {
    const context = mergeProfileStudioContext(previousContext, nextContext);
    const nextDraft = context.profileConfig
      ? (currentDraft || toEditorProfileConfig(context.profileConfig.draft, fallbackColor))
      : null;
    return createResolvedLoadState(context, nextDraft);
  }

  const nextDraft = nextContext.profileConfig
    ? toEditorProfileConfig(nextContext.profileConfig.draft, fallbackColor)
    : null;
  const error = nextContext.loadError
    || (!nextContext.viewingOwnProfile ? 'Profile settings are available only for your own profile.' : '');
  return createResolvedLoadState(nextContext, nextDraft, error);
}

/**
 * Project an accepted full-context response into the already mounted editor.
 * The caller owns request freshness, async failure handling, and state writes.
 *
 * @param {any} nextContext
 * @param {any} currentContext
 * @param {any} currentDraft
 * @param {any} currentIdentityDraft
 * @param {boolean} preserveIdentityDraft
 * @param {string} fallbackColor
 * @param {(previous: any, next: any) => any} mergeProfileStudioContext
 * @param {(value: any, fallbackColor?: string) => any} toEditorProfileConfig
 */
export function resolveProfileStudioFullContextRefreshState(
  nextContext,
  currentContext = null,
  currentDraft = null,
  currentIdentityDraft = null,
  preserveIdentityDraft = false,
  fallbackColor,
  mergeProfileStudioContext,
  toEditorProfileConfig
) {
  const sameProfile = currentContext?.profileId
    && currentContext.profileId === nextContext.profileId;
  const differentProfile = currentContext?.profileId
    && nextContext.profileId
    && !sameProfile;

  if (nextContext.loadError) {
    const context = currentContext && !differentProfile ? currentContext : nextContext;
    return {
      context: {
        ...context,
        dataWarning: nextContext.loadError
      },
      studioDraft: differentProfile ? null : currentDraft,
      studioIdentityDraft: differentProfile ? null : currentIdentityDraft,
      fullContextLoaded: false
    };
  }

  const previousContext = differentProfile ? null : currentContext;
  const previousDraft = previousContext ? currentDraft : null;
  const previousIdentityDraft = previousContext ? currentIdentityDraft : null;
  let context = previousContext;
  let studioDraft = previousDraft;
  let studioIdentityDraft = previousIdentityDraft;

  if (nextContext.targetProfile || nextContext.profileConfig || nextContext.configurationUnavailable) {
    context = mergeProfileStudioContext(previousContext, nextContext);
    const refreshedProfileConfig = context.profileConfig;
    studioDraft = refreshedProfileConfig
      ? (previousDraft || toEditorProfileConfig(refreshedProfileConfig.draft, fallbackColor))
      : null;
    studioIdentityDraft = studioDraft
      ? preserveIdentityDraft && sameProfile && previousIdentityDraft
        ? { ...previousIdentityDraft, identityPresentation: studioDraft.identityPresentation }
        : { bio: context.targetProfile?.bio || '', identityPresentation: studioDraft.identityPresentation }
      : null;
  }

  return {
    context,
    studioDraft,
    studioIdentityDraft,
    fullContextLoaded: nextContext.configurationUnavailable !== true
  };
}
