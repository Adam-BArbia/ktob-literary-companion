import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-auth-page',
  imports: [FormsModule, RouterLink],
  template: `
    <section class="mx-auto max-w-lg py-10 sm:py-16">
      <p class="text-xs font-bold uppercase tracking-[.2em] text-[#a16b49]">YOUR READING SPACE</p>
      <h1 class="mt-3 font-serif text-5xl text-[#3d332e]">{{ signingUp() ? 'Create your account' : 'Welcome back' }}</h1>
      <p class="mt-5 leading-7 text-[#7b6d63]">Your reading life stays private. AI processing is off unless you explicitly opt in later.</p>
      @if (auth.status() === 'loading') {
        <p class="mt-7" role="status">Checking authentication settings…</p>
      } @else if (auth.status() === 'unconfigured') {
        <div role="status" class="mt-7 rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-900">
          KTOB authentication is not configured for this environment yet. A dedicated KTOB Supabase project is needed.
        </div>
      } @else if (auth.status() === 'error') {
        <p role="alert" class="mt-7 rounded-xl bg-rose-50 p-4 text-rose-800">Could not load authentication configuration.</p>
      } @else {
        <form (ngSubmit)="submit()" #credentials="ngForm" class="mt-8 space-y-5 rounded-2xl border border-[#e7dcd2] bg-white p-6 sm:p-8">
          <div>
            <label for="reader-email" class="block text-sm font-semibold text-[#584739]">Email address</label>
            <input id="reader-email" type="email" name="email" [(ngModel)]="email" required email autocomplete="email"
              class="mt-2 w-full rounded-xl border border-[#d8c8ba] px-4 py-3 focus-visible:outline-2 focus-visible:outline-[#704d3b]" />
          </div>
          <div>
            <label for="reader-password" class="block text-sm font-semibold text-[#584739]">Password</label>
            <input id="reader-password" type="password" name="password" [(ngModel)]="password" required minlength="8"
              [autocomplete]="signingUp() ? 'new-password' : 'current-password'"
              class="mt-2 w-full rounded-xl border border-[#d8c8ba] px-4 py-3 focus-visible:outline-2 focus-visible:outline-[#704d3b]" />
          </div>
          @if (error()) { <p role="alert" class="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{{ error() }}</p> }
          @if (notice()) { <p role="status" class="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{{ notice() }}</p> }
          <button [disabled]="busy() || credentials.invalid" type="submit"
            class="w-full rounded-xl bg-[#704d3b] px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
            {{ busy() ? 'Please wait…' : signingUp() ? 'Create account' : 'Sign in' }}
          </button>
          <button type="button" class="block w-full text-center text-sm font-semibold text-[#704d3b] underline"
            (click)="toggleMode()">{{ signingUp() ? 'I already have an account' : 'Create an account instead' }}</button>
        </form>
      }
      <a routerLink="/" class="mt-8 inline-block text-sm text-[#765c4d] underline">← Back to home</a>
    </section>
  `
})
export class AuthPage {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly signingUp = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  email = '';
  password = '';

  constructor() { void this.auth.ensureReady(); }

  toggleMode(): void {
    this.signingUp.update(value => !value);
    this.error.set('');
    this.notice.set('');
  }

  async submit(): Promise<void> {
    this.error.set('');
    this.notice.set('');
    this.busy.set(true);
    try {
      if (this.signingUp()) {
        const mustConfirm = await this.auth.signUp(this.email.trim(), this.password);
        if (mustConfirm) {
          this.notice.set('Check your email for a confirmation link, then sign in.');
          return;
        }
      } else {
        await this.auth.signIn(this.email.trim(), this.password);
      }
      const requested = this.route.snapshot.queryParamMap.get('returnUrl');
      const target = requested && requested.startsWith('/') && !requested.startsWith('//')
        ? requested : '/library';
      await this.router.navigateByUrl(target);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Authentication failed.');
    } finally { this.busy.set(false); }
  }
}
