/** Keep post-auth navigation inside the app and out of authentication loops. */
export function authReturnUrl(value: string | null): string {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\s\u0000-\u001f]/.test(value)
  ) {
    return '/library';
  }
  try {
    const url = new URL(value, 'https://ktob.invalid');
    // Angular decodes path segments and separates matrix parameters before matching routes.
    const firstSegment = decodeURIComponent(url.pathname.split('/')[1].split(/[;(]/, 1)[0]);
    if (
      url.origin !== 'https://ktob.invalid' ||
      ['auth', 'sign-up', 'sign-in'].includes(firstSegment)
    ) {
      return '/library';
    }
    return url.pathname + url.search + url.hash;
  } catch {
    return '/library';
  }
}

export function authErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }
  return '';
}

/** Provider messages may contain implementation details; present useful, bounded copy. */
export function authFailure(error: unknown): string {
  const code = authErrorCode(error);
  if (code === 'email_not_confirmed')
    return 'Please confirm your email before signing in. You can request a new confirmation link below.';
  if (code === 'invalid_credentials')
    return 'The email and password do not match. Check your details and try again.';
  if (code === 'user_already_exists' || code === 'email_exists')
    return 'An account may already use this email. Try signing in instead.';
  if (code === 'weak_password')
    return 'Please choose a stronger password. A longer phrase with a mix of characters works well.';
  if (code === 'email_address_invalid') return 'Please enter a valid email address.';
  if (code === 'signup_disabled')
    return 'Account creation is temporarily unavailable. Please try again later.';
  if (code === 'email_address_not_authorized')
    return 'We could not send a confirmation email to this address. Please try again later.';
  if (
    code.includes('rate_limit') ||
    (error && typeof error === 'object' && 'status' in error && error.status === 429)
  ) {
    return 'Too many attempts in a short time. Please wait a little before trying again.';
  }
  return 'We could not complete that request. Check your connection and try again.';
}
