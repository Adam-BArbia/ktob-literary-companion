import { authFailure, authReturnUrl } from './auth-ui';

describe('Authentication presentation boundaries', () => {
  it('preserves a useful internal destination but rejects external and auth-loop targets', () => {
    expect(authReturnUrl('/catalog/search?q=Virginia%20Woolf')).toBe(
      '/catalog/search?q=Virginia%20Woolf',
    );
    for (const value of [
      null,
      '',
      'https://example.com',
      '//example.com',
      '/\\example.com',
      '/auth',
      '/auth/sign-up?returnUrl=/auth',
      '/sign-up',
      '/sign-in',
      '/path\n',
    ]) {
      expect(authReturnUrl(value)).toBe('/library');
    }
  });

  it('provides actionable provider errors without exposing internal messages', () => {
    expect(authFailure({ code: 'email_not_confirmed' })).toContain('confirm your email');
    expect(authFailure({ code: 'invalid_credentials' })).toContain('do not match');
    expect(authFailure({ status: 429 })).toContain('wait');
    expect(authFailure(new Error('private provider detail'))).not.toContain(
      'private provider detail',
    );
  });
});
