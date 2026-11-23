import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { App } from './app';
import { HealthService, HealthState } from './core/health/health.service';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';

describe('KTOB app shell', () => {
  const state = signal<HealthState>('online');
  const check = vi.fn();
  const user = signal(null);
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
        { provide: AuthService, useValue: { user, ensureReady, status: signal('unconfigured') } },
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
