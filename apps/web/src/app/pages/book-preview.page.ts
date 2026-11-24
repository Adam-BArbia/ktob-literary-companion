import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BookWork,
  BookCommunityPreview,
  KtobApiService,
  apiFailure,
  isAuthFailure,
} from '../core/api/ktob-api.service';
import { BookCoverComponent } from '../shared/book-cover.component';
import { IconComponent } from '../shared/icon.component';

/** Signed-in preview of a canonical catalog work before adding it to a private shelf. */
@Component({
  selector: 'app-book-preview',
  imports: [RouterLink, BookCoverComponent, IconComponent],
  templateUrl: './book-preview.page.html',
  styleUrl: './book-preview.page.css',
})
export class BookPreviewPage {
  private readonly api = inject(KtobApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private generation = 0;
  private workId = '';
  readonly book = signal<BookWork | null>(null);
  readonly community = signal<BookCommunityPreview | null>(null);
  readonly loading = signal(true);
  readonly communityLoading = signal(false);
  readonly error = signal('');
  readonly socialError = signal('');
  readonly adding = signal(false);
  readonly added = signal(false);
  readonly addError = signal('');
  readonly duplicate = signal(false);
  readonly authExpired = signal(false);
  readonly spoilers = signal<Set<number>>(new Set());
  readonly searchQuery = signal('');

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.searchQuery.set(params.get('q')?.trim().slice(0, 180) ?? '');
    });
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const id = params.get('workId');
      if (id) void this.load(id);
    });
    this.destroyRef.onDestroy(() => ++this.generation);
  }

  async load(id: string): Promise<void> {
    const version = ++this.generation;
    this.workId = id;
    this.loading.set(true);
    this.communityLoading.set(false);
    this.book.set(null);
    this.community.set(null);
    this.error.set('');
    this.socialError.set('');
    this.adding.set(false);
    this.added.set(false);
    this.addError.set('');
    this.duplicate.set(false);
    this.authExpired.set(false);
    this.spoilers.set(new Set());
    try {
      const work = (await this.api.workById(id)).data;
      if (version !== this.generation) return;
      this.book.set(work);
      // Metadata and the private shelf action remain usable while community data loads.
      this.loading.set(false);
      if (work.origin !== 'OPEN_LIBRARY') return;
      await this.loadCommunity(id, version);
    } catch (cause) {
      if (version === this.generation) this.error.set(apiFailure(cause));
    } finally {
      if (version === this.generation) this.loading.set(false);
    }
  }

  async retryBook(): Promise<void> {
    if (this.workId && !this.loading()) await this.load(this.workId);
  }

  async retryCommunity(): Promise<void> {
    const work = this.book();
    if (work?.origin === 'OPEN_LIBRARY' && !this.communityLoading()) {
      await this.loadCommunity(work.id, this.generation);
    }
  }

  private async loadCommunity(id: string, version: number): Promise<void> {
    this.communityLoading.set(true);
    this.community.set(null);
    this.socialError.set('');
    this.spoilers.set(new Set());
    try {
      const community = (await this.api.bookCommunity(id)).data;
      if (version === this.generation) this.community.set(community);
    } catch (cause) {
      if (version === this.generation) this.socialError.set(apiFailure(cause));
    } finally {
      if (version === this.generation) this.communityLoading.set(false);
    }
  }

  async add(): Promise<void> {
    const work = this.book();
    if (!work || this.adding() || this.added()) return;
    const version = this.generation;
    this.adding.set(true);
    this.addError.set('');
    this.duplicate.set(false);
    this.authExpired.set(false);
    try {
      await this.api.addToLibrary(work.id);
      if (version !== this.generation) return;
      this.added.set(true);
    } catch (cause) {
      if (version !== this.generation) return;
      this.duplicate.set(cause instanceof HttpErrorResponse && cause.status === 409);
      this.authExpired.set(isAuthFailure(cause));
      this.addError.set(
        this.duplicate()
          ? 'Already on your shelf. Open My library to view it or restore it.'
          : apiFailure(cause),
      );
    } finally {
      if (version === this.generation) this.adding.set(false);
    }
  }

  toggleSpoiler(index: number): void {
    this.spoilers.update((existing) => {
      const next = new Set(existing);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  }
}
