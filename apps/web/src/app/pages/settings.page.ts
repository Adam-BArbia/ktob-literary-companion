import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { KtobApiService, isAuthFailure } from '../core/api/ktob-api.service';
import { AuthService } from '../core/auth/auth.service';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-settings-page',
  imports: [FormsModule, RouterLink, IconComponent],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.css',
})
export class SettingsPage implements OnInit {
  private readonly api = inject(KtobApiService);
  readonly auth = inject(AuthService);
  private readonly errorSummary = viewChild<ElementRef<HTMLElement>>('errorSummary');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly loaded = signal(false);
  readonly error = signal('');
  readonly fieldError = signal('');
  readonly notice = signal('');
  readonly needsSignIn = signal(false);
  readonly savedName = signal('');
  readonly displayName = signal('');
  readonly hasChanges = computed(() => this.displayName().trim() !== this.savedName());
  readonly initials = computed(
    () =>
      this.savedName()
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join('')
        .toUpperCase() || 'R',
  );

  constructor() {
    effect(() => {
      const summary = this.errorSummary();
      if (this.error() && summary) summary.nativeElement.focus();
    });
  }

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    if (this.saving()) return;
    this.loading.set(true);
    this.error.set('');
    this.needsSignIn.set(false);
    try {
      const { data } = await this.api.profile();
      this.savedName.set(data.displayName);
      this.displayName.set(data.displayName);
      this.loaded.set(true);
    } catch (error) {
      this.setRequestError(error, 'We couldn’t load your profile. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  editName(value: string): void {
    this.displayName.set(value);
    this.notice.set('');
    if (this.fieldError()) {
      this.fieldError.set('');
      this.error.set('');
    }
  }

  discardChanges(): void {
    this.displayName.set(this.savedName());
    this.fieldError.set('');
    this.error.set('');
    this.notice.set('');
  }

  async save(): Promise<void> {
    if (this.saving() || this.loading() || !this.loaded()) return;
    this.error.set('');
    this.notice.set('');
    this.needsSignIn.set(false);
    const name = this.displayName().trim();
    if (!name || name.length > 100) {
      const message = !name
        ? 'Enter a display name.'
        : 'Use 100 characters or fewer for your display name.';
      this.fieldError.set(message);
      this.error.set('Please check your display name before saving.');
      return;
    }
    this.fieldError.set('');
    if (!this.hasChanges()) return;
    this.saving.set(true);
    try {
      const { data } = await this.api.updateProfile(name);
      this.savedName.set(data.displayName);
      this.displayName.set(data.displayName);
      this.notice.set('Your display name has been saved.');
    } catch (error) {
      this.setRequestError(
        error,
        'We couldn’t save your changes. Your previous display name is still safe. Please try again.',
      );
    } finally {
      this.saving.set(false);
    }
  }

  private setRequestError(error: unknown, fallback: string): void {
    if (isAuthFailure(error)) {
      this.needsSignIn.set(true);
      this.error.set('Your session has expired. Sign in again to continue.');
    } else if (error instanceof HttpErrorResponse && error.status === 429) {
      this.error.set('That was a little too quick. Please wait a moment, then try again.');
    } else if (error instanceof HttpErrorResponse && (error.status === 0 || error.status === 503)) {
      this.error.set(
        this.loaded()
          ? 'We’re having trouble connecting. Your changes haven’t been saved. Please try again in a moment.'
          : 'We’re having trouble connecting. Please try again in a moment.',
      );
    } else {
      this.error.set(fallback);
    }
  }
}
