const DELETE_ACCOUNT_FUNCTION = 'delete-account'

export function normalizeAccountDeletionError(error) {
  const message = typeof error === 'string'
    ? error
    : error?.message || error?.error || error?.msg || ''

  const lower = message.toLowerCase()

  if (lower.includes('expired') || lower.includes('invalid jwt') || lower.includes('not authenticated')) {
    return {
      title: 'Session expired',
      message: 'Your session expired before the account could be deleted. Sign in again and retry.',
      code: 'session_expired'
    }
  }

  if (lower.includes('profile') && lower.includes('not found')) {
    return {
      title: 'Account already removed',
      message: 'We could not find an active profile for this account. It may already be deleted.',
      code: 'missing_profile'
    }
  }

  if (lower.includes('already deleted') || lower.includes('not found')) {
    return {
      title: 'Account already removed',
      message: 'This account was already deleted or is no longer available.',
      code: 'already_deleted'
    }
  }

  if (lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch')) {
    return {
      title: 'Network interruption',
      message: 'The request was interrupted. Check your connection and try again.',
      code: 'network_error'
    }
  }

  return {
    title: 'Could not delete account',
    message: 'The account could not be deleted right now. Please try again later.',
    code: 'unknown_error'
  }
}

export async function deleteAccount(supabase, confirmationPhrase = 'DELETE') {
  const { data, error } = await supabase.functions.invoke(DELETE_ACCOUNT_FUNCTION, {
    body: { confirm: confirmationPhrase }
  })

  if (error) {
    return {
      success: false,
      error: normalizeAccountDeletionError(error)
    }
  }

  if (!data?.success) {
    return {
      success: false,
      error: normalizeAccountDeletionError(data?.error || data?.message)
    }
  }

  return {
    success: true,
    alreadyDeleted: Boolean(data?.already_deleted),
    cleanup: data?.cleanup || null
  }
}
