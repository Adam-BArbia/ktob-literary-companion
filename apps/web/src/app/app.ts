import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  InjectionToken,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { HealthService } from './core/health/health.service';
import { AuthService } from './core/auth/auth.service';
import { IconComponent } from './shared/icon.component';

export const REPLACE_SESSION_DOCUMENT = new InjectionToken<(path: '/auth' | '/library') => void>(
  'Replace the document after a reader session changes',
  {
    providedIn: 'root',
    factory: () => {
      const document = inject(DOCUMENT);
      return (path) => document.location.replace(path);
    },
  },
);

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements OnInit {
  readonly health = inject(HealthService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly replaceSessionDocument = inject(REPLACE_SESSION_DOCUMENT);
  @ViewChild(RouterOutlet) private outlet?: RouterOutlet;
  readonly sessionResetting = signal(false);
  readonly menuOpen = signal(false);
  readonly signOutBusy = signal(false);
  readonly signOutError = signal('');
  readonly currentUrl = signal(this.router.url);
  readonly authLayout = computed(() =>
    /^\/(auth|sign-up|sign-in)(\/|\?|$)/.test(this.currentUrl()),
  );
  readonly discoverActive = computed(() =>
    /^\/(catalog\/search|discover\/works)(\/|\?|$)/.test(this.currentUrl()),
  );
  readonly accountInitial = computed(() =>
    (this.auth.user()?.email?.charAt(0) || 'R').toUpperCase(),
  );

  constructor() {
    this.auth.sessionInvalidated.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.sessionResetting()) return;
      this.sessionResetting.set(true);
      this.closeMenu();
      this.signOutError.set('');
      // Destroy private view state before navigation, including a pending draft.
      // A document replacement clears every page cache and bypasses SPA draft guards.
      this.outlet?.deactivate();
      this.replaceSessionDocument(this.auth.user() ? '/library' : '/auth');
    });
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
        this.closeMenu();
        this.signOutError.set('');
        this.document.defaultView?.requestAnimationFrame(() => {
          this.document.getElementById('main-content')?.focus({ preventScroll: true });
        });
      });
  }

  ngOnInit(): void {
    this.health.check();
    void this.auth.ensureReady();
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }
  toggleMenu(): void {
    this.menuOpen.update((value) => !value);
  }

  closeMenuWithEscape(): void {
    if (!this.menuOpen()) return;
    this.closeMenu();
    this.document.getElementById('menu-toggle')?.focus();
  }

  async signOut(): Promise<void> {
    if (this.signOutBusy()) return;
    this.signOutBusy.set(true);
    this.signOutError.set('');
    try {
      await this.auth.signOut();
      this.closeMenu();
    } catch {
      this.signOutError.set('We could not sign you out. Please try again.');
    } finally {
      this.signOutBusy.set(false);
    }
  }
}
