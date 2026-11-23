import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
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
  readonly menuOpen = signal(false);
  readonly signOutBusy = signal(false);
  readonly signOutError = signal('');
  readonly currentUrl = signal(this.router.url);
  readonly authLayout = computed(() =>
    /^\/(auth|sign-up|sign-in)(\/|\?|$)/.test(this.currentUrl()),
  );
  readonly accountInitial = computed(() =>
    (this.auth.user()?.email?.charAt(0) || 'R').toUpperCase(),
  );

  constructor() {
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
      await this.router.navigateByUrl('/auth');
    } catch {
      this.signOutError.set('We could not sign you out. Please try again.');
    } finally {
      this.signOutBusy.set(false);
    }
  }
}
