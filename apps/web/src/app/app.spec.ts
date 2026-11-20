import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { App } from './app';
import { HealthService, HealthState } from './core/health/health.service';
import { routes } from './app.routes';

describe('KTOB app shell', () => {
  const state = signal<HealthState>('online');
  const check = vi.fn();

  beforeEach(async () => {
    state.set('online');
    check.mockClear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), { provide: HealthService, useValue: { state, check } }],
    }).compileComponents();
  });

  it('renders the KTOB brand and accessible navigation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const html = fixture.nativeElement as HTMLElement;
    expect(html.querySelector('a[aria-label="KTOB home"]')).not.toBeNull();
    expect(html.querySelector('nav[aria-label="Main navigation"]')).not.toBeNull();
    expect(html.textContent).toContain('Java API connected');
    expect(check).toHaveBeenCalledOnce();
  });

  it('toggles and closes mobile navigation', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const app = fixture.componentInstance;
    app.toggleMenu();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('nav[aria-label="Mobile navigation"]')).not.toBeNull();
    app.closeMenu();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('nav[aria-label="Mobile navigation"]')).toBeNull();
  });

  it('displays truthful backend outage and retry', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    state.set('offline');
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Java API unavailable');
    const button = Array.from(html.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Retry');
    expect(button).toBeDefined();
    button!.click();
    expect(check).toHaveBeenCalledTimes(2);
  });
});
