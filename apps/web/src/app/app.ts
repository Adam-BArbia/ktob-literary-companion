import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HealthService } from './core/health/health.service';
import { AuthService } from './core/auth/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements OnInit {
  readonly health = inject(HealthService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly menuOpen = signal(false);

  ngOnInit(): void {
    this.health.check();
    void this.auth.ensureReady();
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
    this.closeMenu();
    await this.router.navigateByUrl('/auth');
  }

  toggleMenu(): void {
    this.menuOpen.update(value => !value);
  }
}
