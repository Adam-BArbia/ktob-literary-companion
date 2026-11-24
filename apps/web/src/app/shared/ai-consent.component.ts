import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { KtobApiService, PrivacySettings, isAuthFailure } from '../core/api/ktob-api.service';
import { IconComponent } from './icon.component';

let nextConsentId = 0;

@Component({
  selector: 'ktob-ai-consent',
  imports: [FormsModule, RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ai-consent.component.html',
  styleUrl: './ai-consent.component.css',
})
export class AiConsentComponent implements OnInit, OnDestroy {
  private readonly api = inject(KtobApiService);
  private alive = true;
  private loadVersion = 0;
  readonly consentId = `ai-consent-${++nextConsentId}`;
  readonly returnUrl = input('/settings');
  readonly changed = output<PrivacySettings | null>();
  readonly saved = signal<PrivacySettings | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly needsSignIn = signal(false);
  readonly hasPersonalization = computed(() => {
    const settings = this.saved();
    return (
      !!settings &&
      (settings.personalizationOptIn ||
        settings.useReadingHistory ||
        settings.useAllowedJournal ||
        settings.useExplicitPreferences ||
        settings.useApprovedMemories)
    );
  });
  choice = false;

  ngOnInit(): void {
    void this.load();
  }
  ngOnDestroy(): void {
    this.alive = false;
    ++this.loadVersion;
  }

  async load(): Promise<void> {
    if (this.saving()) return;
    const version = ++this.loadVersion;
    this.loading.set(true);
    this.error.set('');
    this.notice.set('');
    this.needsSignIn.set(false);
    this.changed.emit(null);
    try {
      const { data } = await this.api.privacy();
      if (!this.alive || version !== this.loadVersion) return;
      this.saved.set(data);
      this.choice = data.aiProcessingOptIn;
      this.changed.emit(data);
    } catch (error) {
      if (!this.alive || version !== this.loadVersion) return;
      this.setError(error, 'We couldn’t check your AI permission. Please try again.');
    } finally {
      if (this.alive && version === this.loadVersion) this.loading.set(false);
    }
  }

  async save(): Promise<void> {
    const current = this.saved();
    if (!current || this.loading() || this.saving() || this.choice === current.aiProcessingOptIn)
      return;
    await this.patch({ aiProcessingOptIn: this.choice });
  }

  async revokePersonalization(): Promise<void> {
    if (!this.saved() || this.loading() || this.saving()) return;
    await this.patch({
      personalizationOptIn: false,
      useReadingHistory: false,
      useAllowedJournal: false,
      useExplicitPreferences: false,
      useApprovedMemories: false,
    });
  }

  private async patch(patch: Partial<PrivacySettings>): Promise<void> {
    this.saving.set(true);
    this.error.set('');
    this.notice.set('');
    this.needsSignIn.set(false);
    this.changed.emit(null);
    try {
      const { data } = await this.api.updatePrivacy(patch);
      if (!this.alive) return;
      this.saved.set(data);
      this.choice = data.aiProcessingOptIn;
      this.changed.emit(data);
      this.notice.set('Your permission has been saved. No conversation was sent by this action.');
    } catch (error) {
      if (!this.alive) return;
      this.setError(
        error,
        'Your permission change could not be confirmed. Please retry or reload it.',
      );
    } finally {
      if (this.alive) this.saving.set(false);
    }
  }

  private setError(error: unknown, fallback: string): void {
    if (isAuthFailure(error)) {
      this.needsSignIn.set(true);
      this.error.set('Sign in again to check or change your AI permission.');
    } else if (error instanceof HttpErrorResponse && error.status === 429) {
      this.error.set('Please wait a moment before trying to update your permission again.');
    } else this.error.set(fallback);
  }
}
