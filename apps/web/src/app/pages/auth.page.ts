import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  inject,
  effect,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { authErrorCode, authFailure, authReturnUrl } from '../core/auth/auth-ui';
import { AuthFrameComponent } from './auth-frame.component';

@Component({
  selector: 'app-auth-page',
  imports: [ReactiveFormsModule, RouterLink, AuthFrameComponent],
  templateUrl: './auth.page.html',
  styleUrl: './auth-form.css',
})
export class AuthPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly errorSummary = viewChild<ElementRef<HTMLElement>>('errorSummary');
  readonly returnUrl = authReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));
  readonly busy = signal(false);
  readonly resending = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly submitted = signal(false);
  readonly showPassword = signal(false);
  readonly needsConfirmation = signal(false);
  readonly cooldown = signal(0);
  private cooldownTimer?: ReturnType<typeof setInterval>;
  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  constructor() {
    this.destroyRef.onDestroy(() => clearInterval(this.cooldownTimer));
    effect(() => {
      if (this.auth.status() === 'ready' && this.auth.user() && !this.busy()) {
        void this.router.navigateByUrl(this.returnUrl);
      }
    });
  }

  async ngOnInit(): Promise<void> {
    const callback = new URLSearchParams(this.document.location.hash.replace(/^#/, ''));
    if (callback.get('error_code') || this.route.snapshot.queryParamMap.get('error_code')) {
      this.error.set(
        'This confirmation link has expired or could not be used. Enter your email below to request a new one.',
      );
      this.needsConfirmation.set(true);
    }
    await this.auth.ensureReady();
  }

  invalid(field: 'email' | 'password'): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitted());
  }

  async submit(): Promise<void> {
    if (this.busy()) return;
    this.submitted.set(true);
    this.notice.set('');
    this.form.controls.email.setValue(this.form.controls.email.value.trim());
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.showError('Please check the highlighted fields.');
      return;
    }
    this.error.set('');
    this.busy.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.signIn(email.trim(), password);
      if (this.destroyRef.destroyed) return;
      await this.router.navigateByUrl(this.returnUrl);
    } catch (error) {
      this.needsConfirmation.set(authErrorCode(error) === 'email_not_confirmed');
      this.showError(authFailure(error));
    } finally {
      this.busy.set(false);
    }
  }

  async resend(): Promise<void> {
    if (this.busy() || this.cooldown()) return;
    this.form.controls.email.markAsTouched();
    if (this.form.controls.email.invalid) {
      this.showError('Enter your email address to request a confirmation link.');
      return;
    }
    this.busy.set(true);
    this.resending.set(true);
    this.error.set('');
    try {
      await this.auth.resendConfirmation(this.form.controls.email.value);
      if (this.destroyRef.destroyed) return;
      this.notice.set(
        'If this email has an account awaiting confirmation, a new link is on its way. Check your inbox and spam folder.',
      );
      this.startCooldown();
    } catch (error) {
      this.showError(authFailure(error));
    } finally {
      this.busy.set(false);
      this.resending.set(false);
    }
  }

  private showError(message: string): void {
    if (this.destroyRef.destroyed) return;
    this.error.set(message);
    this.cdr.detectChanges();
    this.errorSummary()?.nativeElement.focus();
  }

  private startCooldown(): void {
    if (this.destroyRef.destroyed) return;
    this.cooldown.set(60);
    clearInterval(this.cooldownTimer);
    this.cooldownTimer = setInterval(() => {
      this.cooldown.update((value) => Math.max(0, value - 1));
      if (!this.cooldown()) clearInterval(this.cooldownTimer);
    }, 1000);
  }
}
