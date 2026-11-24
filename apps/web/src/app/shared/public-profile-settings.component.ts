import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { KtobApiService, apiFailure } from '../core/api/ktob-api.service';

/** Readers explicitly choose a public handle; no account is searchable by default. */
@Component({
  selector: 'ktob-public-profile-settings',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="reader-sharing" aria-labelledby="sharing-title">
      <p class="eyebrow">CONNECT WITH OTHER READERS</p>
      <h2 id="sharing-title">Your public reading profile.</h2>
      <p class="description">
        Your account, email and private journal remain yours. Other signed-in KTOB
        readers can find you only after you choose a username and enable discovery.
        New ratings are shared by default once you're discoverable; older ratings stay
        private. Publish notes individually from each book.
      </p>
      @if (loading()) {
        <p role="status">Loading your sharing preferences…</p>
      } @else {
        <form (ngSubmit)="save()" novalidate>
          <label class="field-label" for="public-handle">Choose a public username</label>
          <div class="username-field">
            <span aria-hidden="true">@</span>
            <input id="public-handle" name="username" class="field-input"
              [ngModel]="username()" (ngModelChange)="username.set($event)"
              autocapitalize="none" autocomplete="off" spellcheck="false"
              maxlength="24" placeholder="your_reading_name" [disabled]="saving()" />
          </div>
          <p class="field-hint">3–24 lowercase letters, numbers and underscores; start with a letter.</p>
          <label class="sharing-toggle">
            <input name="discoverable" type="checkbox" [ngModel]="discoverable()"
              (ngModelChange)="discoverable.set($event)" [disabled]="saving()" />
            <span>
              <strong>Let other signed-in readers find my profile</strong>
              <small>Shows your chosen name, publicly shared ratings and only notes you publish individually. Turn it off to hide your profile.</small>
            </span>
          </label>
          @if (error()) { <p role="alert" class="notice notice-error">{{ error() }}</p> }
          @if (notice()) { <p role="status" class="notice notice-success">{{ notice() }}</p> }
          <div class="sharing-actions">
            <button type="submit" class="btn btn-primary" [disabled]="saving()">
              {{ saving() ? 'Saving…' : 'Save sharing preferences' }}
            </button>
            @if (savedHandle() && savedDiscoverable()) {
              <a class="text-link" [routerLink]="['/readers',savedHandle()]">View my public profile</a>
            }
          </div>
        </form>
      }
    </section>
  `,
  styleUrl: './public-profile-settings.component.css',
})
export class PublicProfileSettingsComponent implements OnInit {
  private readonly api = inject(KtobApiService);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly username = signal('');
  readonly discoverable = signal(false);
  readonly savedHandle = signal('');
  readonly savedDiscoverable = signal(false);
  readonly error = signal('');
  readonly notice = signal('');

  ngOnInit(): void { void this.load(); }
  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const {data}=await this.api.ownPublicProfile();
      this.username.set(data.username ?? '');
      this.discoverable.set(data.discoverable);
      this.savedHandle.set(data.username ?? '');
      this.savedDiscoverable.set(data.discoverable);
    } catch(e) { this.error.set(apiFailure(e)); }
    finally { this.loading.set(false); }
  }
  async save(): Promise<void> {
    if(this.saving())return;
    const handle=this.username().trim().toLowerCase();
    if(handle && !/^[a-z][a-z0-9_]{2,23}$/.test(handle)) {
      this.error.set('Use 3–24 lowercase letters, numbers or underscores, starting with a letter.');
      return;
    }
    if(this.discoverable() && !handle) {
      this.error.set('Choose a username before enabling reader discovery.');
      return;
    }
    this.saving.set(true);this.error.set('');this.notice.set('');
    try {
      const {data}=await this.api.updatePublicProfile({
        username: handle || null, discoverable: this.discoverable(),
      });
      this.username.set(data.username ?? '');
      this.discoverable.set(data.discoverable);
      this.savedHandle.set(data.username ?? '');
      this.savedDiscoverable.set(data.discoverable);
      this.notice.set(data.discoverable ?
        'Your reader profile is now discoverable. You control each public note separately.' :
        'Your profile is hidden from other readers.');
    } catch(e) { this.error.set(apiFailure(e)); }
    finally { this.saving.set(false); }
  }
}
