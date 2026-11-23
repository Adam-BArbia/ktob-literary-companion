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
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { authFailure, authReturnUrl } from '../core/auth/auth-ui';
import { AuthFrameComponent } from './auth-frame.component';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmation = control.get('confirmation')?.value;
  return confirmation && password !== confirmation ? { passwordsMismatch: true } : null;
}

@Component({
  selector: 'app-sign-up-page',
  imports: [ReactiveFormsModule, RouterLink, AuthFrameComponent],
  templateUrl: './sign-up.page.html',
  styleUrl: './auth-form.css',
})
export class SignUpPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly errorSummary = viewChild<ElementRef<HTMLElement>>('errorSummary');
  private readonly confirmationTitle = viewChild<ElementRef<HTMLElement>>('confirmationTitle');
  private readonly emailInput = viewChild<ElementRef<HTMLInputElement>>('emailInput');
  readonly returnUrl = authReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly submitted = signal(false);
  readonly showPassword = signal(false);
  readonly showConfirmation = signal(false);
  readonly awaitingConfirmation = signal(false);
  readonly confirmationEmail = signal('');
  readonly cooldown = signal(0);
  private cooldownTimer?: ReturnType<typeof setInterval>;
  readonly form = inject(FormBuilder).nonNullable.group(
    {
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmation: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  constructor() {
    this.destroyRef.onDestroy(() => clearInterval(this.cooldownTimer));
    effect(() => {
      if (this.auth.status() === 'ready' && this.auth.user() && !this.busy()) {
        void this.router.navigateByUrl(this.returnUrl);
      }
    });
  }

  async ngOnInit(): Promise<void> {
    await this.auth.ensureReady();
  }

  invalid(field: 'email' | 'password' | 'confirmation'): boolean {
    const control = this.form.controls[field];
    const invalid =
      control.invalid || (field === 'confirmation' && this.form.hasError('passwordsMismatch'));
    return invalid && (control.touched || this.submitted());
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
      const mustConfirm = await this.auth.signUp(email.trim(), password);
      if (this.destroyRef.destroyed) return;
      this.form.controls.password.reset();
      this.form.controls.confirmation.reset();
      if (mustConfirm) {
        this.confirmationEmail.set(email.trim());
        this.awaitingConfirmation.set(true);
        this.startCooldown();
        this.cdr.detectChanges();
        this.confirmationTitle()?.nativeElement.focus();
      } else {
        await this.router.navigateByUrl(this.returnUrl);
      }
    } catch (error) {
      this.showError(authFailure(error));
    } finally {
      this.busy.set(false);
    }
  }

  async resend(): Promise<void> {
    if (this.busy() || this.cooldown()) return;
    this.error.set('');
    this.notice.set('');
    this.busy.set(true);
    try {
      await this.auth.resendConfirmation(this.confirmationEmail());
      if (this.destroyRef.destroyed) return;
      this.notice.set(
        'If your account is awaiting confirmation, a fresh link is on its way. Check your inbox and spam folder.',
      );
      this.startCooldown();
    } catch (error) {
      this.showError(authFailure(error));
    } finally {
      this.busy.set(false);
    }
  }

  changeEmail(): void {
    this.awaitingConfirmation.set(false);
    this.error.set('');
    this.notice.set('');
    this.submitted.set(false);
    this.cdr.detectChanges();
    this.emailInput()?.nativeElement.focus();
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
