import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Component, OnDestroy, inject, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import type { User } from '@supabase/supabase-js';
import { App, REPLACE_SESSION_DOCUMENT } from './app';
import { HealthService, HealthState } from './core/health/health.service';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';

describe('KTOB app shell', () => {
  const state = signal<HealthState>('online');
  const check = vi.fn();
  const user = signal(null);
  const sessionInvalidated = new Subject<void>();
  const ensureReady = vi.fn(async () => undefined);

  beforeEach(async () => {
    state.set('online');
    check.mockClear();
    ensureReady.mockClear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        { provide: HealthService, useValue: { state, check } },
        {
          provide: AuthService,
          useValue: { user, ensureReady, sessionInvalidated, status: signal('unconfigured') },
        },
      ],
    }).compileComponents();
  });

  it('renders the KTOB brand and accessible navigation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const html = fixture.nativeElement as HTMLElement;
    expect(html.querySelector('a[aria-label="KTOB home"]')).not.toBeNull();
    expect(html.querySelector('nav[aria-label="Main navigation"]')).not.toBeNull();
    expect(html.textContent).toContain('Service connected');
    expect(check).toHaveBeenCalledOnce();
  });

  it('toggles and closes mobile navigation', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const app = fixture.componentInstance;
    app.toggleMenu();
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('nav[aria-label="Mobile navigation"]'),
    ).not.toBeNull();
    app.closeMenu();
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('nav[aria-label="Mobile navigation"]'),
    ).toBeNull();
  });

  it('displays truthful backend outage and retry', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    state.set('offline');
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Connection unavailable');
    const button = Array.from(html.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Retry',
    );
    expect(button).toBeDefined();
    button!.click();
    expect(check).toHaveBeenCalledTimes(2);
  });
});

@Component({
  template: '<p>Private history for {{ reader }}</p><textarea>{{ draft }}</textarea>',
})
class PrivateDraftPage implements OnDestroy {
  readonly reader = inject(AuthService).user()!.id;
  readonly draft = 'An unsaved private thought';
  destroyed = false;
  hasUnsavedDraft(): boolean {
    return true;
  }
  ngOnDestroy(): void {
    this.destroyed = true;
  }
}

@Component({ template: '<p>Sign in to KTOB</p>' })
class PublicSessionPage {}

describe('Reader session privacy boundary', () => {
  const user = signal<User | null>(null);
  const replaceDocument = vi.fn();
  let invalidated: Subject<void>;

  beforeEach(async () => {
    user.set({ id: 'reader-a', email: 'reader-a@example.com' } as User);
    invalidated = new Subject<void>();
    replaceDocument.mockReset();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([
          {
            path: 'advisor',
            component: PrivateDraftPage,
            canDeactivate: routes.find((route) => route.path === 'advisor')!.canDeactivate,
          },
          {
            path: 'books/:entryId',
            component: PrivateDraftPage,
            canDeactivate: routes.find((route) => route.path === 'books/:entryId')!.canDeactivate,
          },
          { path: 'auth', component: PublicSessionPage },
          { path: 'library', component: PrivateDraftPage },
        ]),
        {
          provide: AuthService,
          useValue: {
            user,
            sessionInvalidated: invalidated,
            status: signal('ready'),
            ensureReady: async () => undefined,
            signOut: async () => {
              user.set(null);
              invalidated.next();
            },
          },
        },
        { provide: HealthService, useValue: { state: signal('online'), check: vi.fn() } },
        { provide: REPLACE_SESSION_DOCUMENT, useValue: replaceDocument },
      ],
    }).compileComponents();
  });

  afterEach(() => vi.restoreAllMocks());

  async function openPrivatePage(path: string) {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl(path);
    await fixture.whenStable();
    const page = fixture.debugElement.query(By.directive(PrivateDraftPage))
      .componentInstance as PrivateDraftPage;
    return { fixture, page, html: fixture.nativeElement as HTMLElement };
  }

  it.each(['/advisor', '/books/entry-a'])(
    'clears %s on sign-out even when its ordinary draft guard would cancel leaving',
    async (path) => {
      const { fixture, page, html } = await openPrivatePage(path);
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
      expect(html.textContent).toContain('Private history for reader-a');
      expect(await TestBed.inject(Router).navigateByUrl('/auth')).toBe(false);
      expect(page.destroyed).toBe(false);
      expect(confirm).toHaveBeenCalledOnce();
      replaceDocument.mockImplementation(() => {
        expect(page.destroyed).toBe(true);
        expect(html.textContent).not.toContain('Private history for reader-a');
        expect(html.querySelector('textarea')).toBeNull();
      });

      await fixture.componentInstance.signOut();
      await fixture.whenStable();
      expect(replaceDocument).toHaveBeenCalledExactlyOnceWith('/auth');
      expect(confirm).toHaveBeenCalledOnce();
      expect(html.textContent).toContain('Your session changed');
    },
  );

  it('destroys the previous reader’s page before replacing the document for another account', async () => {
    const { fixture, page, html } = await openPrivatePage('/advisor');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    replaceDocument.mockImplementation(() => {
      expect(page.destroyed).toBe(true);
      expect(html.querySelector('textarea')).toBeNull();
    });
    user.set({ id: 'reader-b', email: 'reader-b@example.com' } as User);
    invalidated.next();
    await fixture.whenStable();
    expect(replaceDocument).toHaveBeenCalledExactlyOnceWith('/library');
    expect(confirm).not.toHaveBeenCalled();
    expect(html.textContent).not.toContain('Private history for reader-a');
  });

  it('keeps a reader’s open draft across their ordinary same-account token refresh', async () => {
    const { fixture, page, html } = await openPrivatePage('/advisor');
    user.set({ id: 'reader-a', email: 'reader-a@example.com' } as User);
    await fixture.whenStable();
    expect(page.destroyed).toBe(false);
    expect(html.querySelector('textarea')?.value).toBe('An unsaved private thought');
    expect(replaceDocument).not.toHaveBeenCalled();
  });
});
