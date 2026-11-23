import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { AuthRequiredError } from './auth-required.error';
import type { User } from '@supabase/supabase-js';

const sdk = vi.hoisted(() => ({
  createClient: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  resend: vi.fn(),
  signOut: vi.fn(),
  unsubscribe: vi.fn(),
  dispose: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({ createClient: sdk.createClient }));

describe('AuthService configuration boundaries', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.clearAllMocks();
    sdk.getSession.mockResolvedValue({ data: { session: null }, error: null });
    sdk.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: sdk.unsubscribe } },
    });
    sdk.dispose.mockResolvedValue(undefined);
    sdk.createClient.mockReturnValue({ auth: sdk });
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('stays unconfigured without a dedicated KTOB Supabase project', async () => {
    const ready = service.ensureReady();
    http.expectOne('/ktob-config.json').flush({
      apiBaseUrl: 'http://localhost:8080/api/v1',
      supabaseUrl: '',
      supabasePublishableKey: '',
    });
    await ready;
    expect(service.status()).toBe('unconfigured');
    expect(service.user()).toBeNull();
    expect(sdk.createClient).not.toHaveBeenCalled();
    await expect(service.accessToken()).rejects.toThrow('not been configured');
  });

  it('rejects invalid API base configuration', async () => {
    const ready = service.ensureReady();
    http.expectOne('/ktob-config.json').flush({
      apiBaseUrl: 'javascript:alert(1)',
    });
    await ready;
    expect(service.status()).toBe('error');
  });

  async function configure(): Promise<void> {
    const ready = service.ensureReady();
    http.expectOne('/ktob-config.json').flush({
      apiBaseUrl: 'https://ktob-api.onrender.com/api/v1',
      supabaseUrl: 'https://afavrsrffoyctyvvpxcv.supabase.co',
      supabasePublishableKey: 'sb_publishable_test-only',
    });
    await ready;
  }

  it('leaves sign-in available when the stored session has been revoked', async () => {
    sdk.getSession.mockResolvedValue({
      data: { session: null },
      error: { code: 'refresh_token_not_found', message: 'Private provider detail' },
    });
    await configure();
    expect(service.status()).toBe('ready');
    expect(service.user()).toBeNull();
    sdk.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'new-reader-id' } },
      error: null,
    });
    await service.signIn('reader@example.com', 'A reader password');
    expect(service.user()?.id).toBe('new-reader-id');
  });

  it('does not restore an older session after a cross-tab sign-out during startup', async () => {
    let complete!: (result: object) => void;
    sdk.getSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    const ready = configure();
    await vi.waitFor(() => expect(sdk.getSession).toHaveBeenCalledOnce());
    const onAuthChange = sdk.onAuthStateChange.mock.calls[0][0];
    onAuthChange('SIGNED_OUT', null);
    complete({ data: { session: { user: { id: 'old-reader-id' } } }, error: null });
    await ready;
    expect(service.status()).toBe('ready');
    expect(service.user()).toBeNull();
  });

  it('disposes a failed client before a retry can start another refresh loop', async () => {
    sdk.getSession.mockResolvedValue({
      data: { session: null },
      error: { name: 'AuthRetryableFetchError', status: 503 },
    });
    await configure();
    expect(service.status()).toBe('error');
    expect(sdk.unsubscribe).toHaveBeenCalledOnce();
    expect(sdk.dispose).toHaveBeenCalledOnce();
    const oldAuthChange = sdk.onAuthStateChange.mock.calls[0][0];
    oldAuthChange('SIGNED_IN', { user: { id: 'stale-reader-id' } });
    expect(service.user()).toBeNull();

    sdk.getSession.mockResolvedValue({ data: { session: null }, error: null });
    const retry = service.retry();
    http.expectOne('/ktob-config.json').flush({
      apiBaseUrl: 'https://ktob-api.onrender.com/api/v1',
      supabaseUrl: 'https://afavrsrffoyctyvvpxcv.supabase.co',
      supabasePublishableKey: 'sb_publishable_test-only',
    });
    await retry;
    expect(service.status()).toBe('ready');
  });

  it('stops background auth work when its Angular injector is destroyed', async () => {
    await configure();
    const onAuthChange = sdk.onAuthStateChange.mock.calls[0][0];
    TestBed.resetTestingModule();
    expect(sdk.unsubscribe).toHaveBeenCalledOnce();
    expect(sdk.dispose).toHaveBeenCalledOnce();
    onAuthChange('SIGNED_IN', { user: { id: 'stale-reader-id' } });
    expect(service.user()).toBeNull();
  });

  it('submits signup to Supabase with a same-origin confirmation destination', async () => {
    await configure();
    sdk.signUp.mockResolvedValue({
      data: { user: { id: 'reader-id' }, session: null },
      error: null,
    });
    expect(await service.signUp(' reader@example.com ', 'A long reader phrase')).toBe(true);
    expect(sdk.signUp).toHaveBeenCalledWith({
      email: 'reader@example.com',
      password: 'A long reader phrase',
      options: { emailRedirectTo: new URL('/auth', document.location.origin).href },
    });
    expect(service.user()).toBeNull();
  });

  it('uses the real signup session when confirmation is not required', async () => {
    await configure();
    const reader = { id: 'reader-id', email: 'reader@example.com' };
    sdk.signUp.mockResolvedValue({
      data: { user: reader, session: { user: reader } },
      error: null,
    });
    expect(await service.signUp('reader@example.com', 'A long reader phrase')).toBe(false);
    expect(service.user()).toEqual(reader);
  });

  it('propagates signup failures without creating a local signed-in user', async () => {
    await configure();
    const error = { code: 'weak_password', message: 'Provider detail' };
    sdk.signUp.mockResolvedValue({ data: { user: null, session: null }, error });
    await expect(service.signUp('reader@example.com', 'password')).rejects.toEqual(error);
    expect(service.user()).toBeNull();
  });

  it('resends only the existing signup confirmation through the provider', async () => {
    await configure();
    sdk.resend.mockResolvedValue({ error: null });
    await service.resendConfirmation(' reader@example.com ');
    expect(sdk.resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'reader@example.com',
      options: { emailRedirectTo: new URL('/auth', document.location.origin).href },
    });
  });

  it('can recover from a failed configuration request', async () => {
    const ready = service.ensureReady();
    http
      .expectOne('/ktob-config.json')
      .flush('Unavailable', { status: 503, statusText: 'Unavailable' });
    await ready;
    expect(service.status()).toBe('error');
    const retry = service.retry();
    http.expectOne('/ktob-config.json').flush({
      apiBaseUrl: 'https://ktob-api.onrender.com/api/v1',
      supabaseUrl: 'https://afavrsrffoyctyvvpxcv.supabase.co',
      supabasePublishableKey: 'sb_publishable_test-only',
    });
    await retry;
    expect(service.status()).toBe('ready');
  });

  it('reports a missing session with a typed error and clears stale signed-in UI', async () => {
    await configure();
    service.user.set({ id: 'reader-id' } as User);
    sdk.getSession.mockResolvedValue({ data: { session: null }, error: null });
    await expect(service.accessToken()).rejects.toBeInstanceOf(AuthRequiredError);
    expect(service.user()).toBeNull();
    http.expectNone((request) => request.url.includes('/api/v1'));
  });

  it('does not expose an expired token and requests a new sign-in', async () => {
    await configure();
    service.user.set({ id: 'reader-id' } as User);
    sdk.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'expired-token-that-must-not-escape',
          expires_at: Math.floor(Date.now() / 1000) - 30,
        },
      },
      error: null,
    });
    try {
      await service.accessToken();
      throw new Error('Expected a missing-session error');
    } catch (error) {
      expect(error).toBeInstanceOf(AuthRequiredError);
      expect(String(error)).not.toContain('expired-token-that-must-not-escape');
    }
    expect(service.user()).toBeNull();
    http.expectNone((request) => request.url.includes('/api/v1'));
  });

  it('recognizes a revoked refresh session without leaking provider details', async () => {
    await configure();
    service.user.set({ id: 'reader-id' } as User);
    sdk.getSession.mockResolvedValue({
      data: { session: null },
      error: {
        code: 'refresh_token_not_found',
        message: 'private refresh token detail',
      },
    });
    await expect(service.accessToken()).rejects.toBeInstanceOf(AuthRequiredError);
    expect(service.user()).toBeNull();
  });

  it('does not sign out a reader because of a temporary session-check failure', async () => {
    await configure();
    const reader = { id: 'reader-id' } as User;
    service.user.set(reader);
    sdk.getSession.mockResolvedValue({
      data: { session: null },
      error: {
        name: 'AuthRetryableFetchError',
        status: 503,
        message: 'private provider detail',
      },
    });
    try {
      await service.accessToken();
      throw new Error('Expected a retryable session-check error');
    } catch (error) {
      expect(error).not.toBeInstanceOf(AuthRequiredError);
      expect(String(error)).toContain('Check your connection');
      expect(String(error)).not.toContain('private provider detail');
    }
    expect(service.user()).toEqual(reader);
    http.expectNone((request) => request.url.includes('/api/v1'));
  });
});
