import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { AuthPage } from './auth.page';
import { SignUpPage } from './sign-up.page';
import type { User } from '@supabase/supabase-js';

describe('Real account forms', () => {
  const auth = {
    user: signal<User | null>(null),
    status: signal('ready'),
    ensureReady: vi.fn(async () => undefined),
    signUp: vi.fn(),
    signIn: vi.fn(),
    resendConfirmation: vi.fn(),
    retry: vi.fn(),
  };
  let fixture: ComponentFixture<AuthPage | SignUpPage>;
  let router: Router;

  beforeEach(async () => {
    vi.clearAllMocks();
    auth.user.set(null);
    auth.status.set('ready');
    await TestBed.configureTestingModule({
      imports: [AuthPage, SignUpPage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({ returnUrl: '/catalog/search' }) },
          },
        },
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => fixture?.destroy());

  async function signup(): Promise<SignUpPage> {
    fixture = TestBed.createComponent(SignUpPage);
    await fixture.whenStable();
    return fixture.componentInstance as SignUpPage;
  }

  it('keeps invalid signup local and connects validation feedback to its fields', async () => {
    const page = await signup();
    page.form.setValue({ email: 'not-an-email', password: 'short', confirmation: 'different' });
    await page.submit();
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;
    expect(auth.signUp).not.toHaveBeenCalled();
    expect(html.querySelector('#signup-email')?.getAttribute('aria-invalid')).toBe('true');
    expect(html.querySelector('#signup-password')?.getAttribute('aria-describedby')).toContain(
      'signup-password-error',
    );
    expect(html.querySelector('#signup-confirmation-error')?.textContent).toContain('do not match');
    expect(document.activeElement).toBe(html.querySelector('[role="alert"]'));
  });

  it('shows the confirmation step only after Supabase requests verification and clears passwords', async () => {
    const page = await signup();
    auth.signUp.mockResolvedValue(true);
    page.form.setValue({
      email: ' reader@example.com ',
      password: 'A better reading phrase',
      confirmation: 'A better reading phrase',
    });
    await page.submit();
    fixture.detectChanges();
    expect(auth.signUp).toHaveBeenCalledWith('reader@example.com', 'A better reading phrase');
    expect(page.awaitingConfirmation()).toBe(true);
    expect(page.form.controls.password.value).toBe('');
    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toContain(
      'Check your inbox',
    );
    expect(page.cooldown()).toBe(60);
    await page.resend();
    expect(auth.resendConfirmation).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('does not silently present a failed signup as an account creation success', async () => {
    const page = await signup();
    auth.signUp.mockRejectedValue({ code: 'user_already_exists', message: 'private details' });
    page.form.setValue({
      email: 'reader@example.com',
      password: 'A better reading phrase',
      confirmation: 'A better reading phrase',
    });
    await page.submit();
    expect(page.awaitingConfirmation()).toBe(false);
    expect(page.error()).toContain('Try signing in');
    expect(page.error()).not.toContain('private details');
    expect(page.busy()).toBe(false);
  });

  it('navigates to the preserved internal destination when signup returns a session', async () => {
    const page = await signup();
    auth.signUp.mockResolvedValue(false);
    page.form.setValue({
      email: 'reader@example.com',
      password: 'A better reading phrase',
      confirmation: 'A better reading phrase',
    });
    await page.submit();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/catalog/search');
  });

  it('prevents double submit and signs in through the actual auth service', async () => {
    fixture = TestBed.createComponent(AuthPage);
    await fixture.whenStable();
    const page = fixture.componentInstance as AuthPage;
    let complete!: () => void;
    auth.signIn.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          complete = resolve;
        }),
    );
    page.form.setValue({ email: 'reader@example.com', password: 'reader-password' });
    const pending = page.submit();
    await page.submit();
    expect(auth.signIn).toHaveBeenCalledOnce();
    complete();
    await pending;
    expect(router.navigateByUrl).toHaveBeenCalledWith('/catalog/search');
  });

  it('lets users reveal a password without submitting their form', async () => {
    await signup();
    const html = fixture.nativeElement as HTMLElement;
    (html.querySelector('[aria-label="Show password"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(html.querySelector('#signup-password')?.getAttribute('type')).toBe('text');
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it.each([AuthPage, SignUpPage])(
    'continues after a session arrives from another tab',
    async (component) => {
      fixture = TestBed.createComponent<AuthPage | SignUpPage>(component);
      await fixture.whenStable();
      expect(router.navigateByUrl).not.toHaveBeenCalled();
      auth.user.set({ id: 'reader-a', email: 'reader@example.com' } as User);
      await fixture.whenStable();
      expect(router.navigateByUrl).toHaveBeenCalledWith('/catalog/search');
    },
  );

  it('does not focus or start a resend timer after leaving a pending signup', async () => {
    const page = await signup();
    let complete!: (mustConfirm: boolean) => void;
    auth.signUp.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          complete = resolve;
        }),
    );
    page.form.setValue({
      email: 'reader@example.com',
      password: 'A better reading phrase',
      confirmation: 'A better reading phrase',
    });
    const pending = page.submit();
    fixture.destroy();
    complete(true);
    await expect(pending).resolves.toBeUndefined();
    expect(page.awaitingConfirmation()).toBe(false);
    expect(page.cooldown()).toBe(0);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
