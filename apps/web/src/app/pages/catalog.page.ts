import {
  Component,
  ChangeDetectorRef,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BookWork, KtobApiService, apiFailure, isAuthFailure } from '../core/api/ktob-api.service';
import { IconComponent } from '../shared/icon.component';
import { BookCoverComponent } from '../shared/book-cover.component';

@Component({
  selector: 'app-catalog-page',
  imports: [FormsModule, RouterLink, IconComponent, BookCoverComponent],
  templateUrl: './catalog.page.html',
  styleUrl: './catalog.page.css',
})
export class CatalogPage implements OnInit {
  private readonly api = inject(KtobApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  @ViewChild('manualForm') private manualForm?: NgForm;
  @ViewChild('manualTitleInput') private manualTitleInput?: ElementRef<HTMLInputElement>;
  @ViewChild('manualAuthorInput') private manualAuthorInput?: ElementRef<HTMLInputElement>;
  @ViewChild('manualToggle') private manualToggle?: ElementRef<HTMLButtonElement>;
  private searchVersion = 0;
  readonly books = signal<BookWork[]>([]);
  readonly searching = signal(false);
  readonly adding = signal<Set<string>>(new Set());
  readonly added = signal<Set<string>>(new Set());
  readonly addErrors = signal<
    Record<string, { message: string; duplicate: boolean; signIn: boolean }>
  >({});
  readonly error = signal('');
  readonly notice = signal('');
  readonly needsSignIn = signal(false);
  readonly searched = signal(false);
  readonly lastQuery = signal('');
  readonly manualOpen = signal(false);
  readonly manualBusy = signal(false);
  readonly manualAttempted = signal(false);
  readonly manualError = signal('');
  readonly manualNotice = signal('');
  readonly suggestions = ['The Little Prince', 'Jane Austen', 'Science fiction', 'Poetry'];
  readonly skeletons = [0, 1, 2, 3];
  query = '';
  manualTitle = '';
  manualAuthor = '';
  private pendingManual: { key: string; work: BookWork } | null = null;

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      if (params.get('manual') === 'true') this.manualOpen.set(true);
      const requested = params.get('q')?.trim().slice(0, 180);
      if (requested && requested !== this.lastQuery()) {
        this.query = requested;
        void this.search();
      }
    });
  }

  async search(): Promise<void> {
    const query = this.query.trim();
    if (!query || (this.searching() && query === this.lastQuery())) return;
    const version = ++this.searchVersion;
    this.searching.set(true);
    this.error.set('');
    this.notice.set('');
    this.needsSignIn.set(false);
    this.searched.set(true);
    this.lastQuery.set(query);
    try {
      const result = await this.api.searchWorks(query);
      if (version === this.searchVersion) this.books.set(result.data);
    } catch (error) {
      if (version === this.searchVersion) {
        this.books.set([]);
        this.setError(error);
      }
    } finally {
      if (version === this.searchVersion) this.searching.set(false);
    }
  }

  async chooseSuggestion(value: string): Promise<void> {
    this.query = value;
    await this.search();
  }

  async add(book: BookWork): Promise<void> {
    if (this.adding().has(book.id) || this.added().has(book.id)) return;
    this.adding.update((ids) => new Set(ids).add(book.id));
    this.addErrors.update((errors) => {
      const next = { ...errors };
      delete next[book.id];
      return next;
    });
    this.error.set('');
    this.notice.set('');
    this.needsSignIn.set(false);
    try {
      await this.api.addToLibrary(book.id);
      this.added.update((ids) => new Set(ids).add(book.id));
      this.notice.set(`“${book.title}” is now on your shelf.`);
    } catch (error) {
      const duplicate = error instanceof HttpErrorResponse && error.status === 409;
      this.addErrors.update((errors) => ({
        ...errors,
        [book.id]: {
          message: duplicate
            ? 'This book is already in your library. If you archived it, you can restore it there.'
            : apiFailure(error),
          duplicate,
          signIn: isAuthFailure(error),
        },
      }));
    } finally {
      this.adding.update((ids) => {
        const next = new Set(ids);
        next.delete(book.id);
        return next;
      });
    }
  }

  toggleManual(): void {
    if (this.manualOpen()) {
      this.manualOpen.set(false);
      this.manualToggle?.nativeElement.focus();
    } else {
      this.openManual();
    }
  }

  openManual(): void {
    this.manualOpen.set(true);
    this.cdr.detectChanges();
    this.manualTitleInput?.nativeElement.focus();
  }

  async createManual(): Promise<void> {
    if (this.manualBusy()) return;
    this.manualAttempted.set(true);
    if (!this.manualTitle.trim() || this.manualTitle.trim().length > 500) {
      this.manualTitleInput?.nativeElement.focus();
      return;
    }
    if (this.manualAuthor.trim().length > 200) {
      this.manualAuthorInput?.nativeElement.focus();
      return;
    }
    this.manualBusy.set(true);
    this.needsSignIn.set(false);
    this.manualError.set('');
    this.manualNotice.set('');
    const title = this.manualTitle.trim();
    const author = this.manualAuthor.trim();
    const key = JSON.stringify([title, author]);
    let workCreated = false;
    try {
      // Retain the created work if adding it fails, so a retry cannot duplicate it.
      if (this.pendingManual?.key !== key) {
        const work = (await this.api.createManualWork(title, author ? [author] : [])).data;
        this.pendingManual = { key, work };
      }
      workCreated = true;
      await this.api.addToLibrary(this.pendingManual.work.id);
      this.pendingManual = null;
      this.manualTitle = '';
      this.manualAuthor = '';
      this.manualAttempted.set(false);
      this.manualForm?.resetForm({ title: '', author: '' });
      this.manualNotice.set(`“${title}” was saved to your private library.`);
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 409 && workCreated) {
        this.pendingManual = null;
        this.manualTitle = '';
        this.manualAuthor = '';
        this.manualAttempted.set(false);
        this.manualForm?.resetForm({ title: '', author: '' });
        this.manualNotice.set(
          'This book is already saved in your library. Open your library to view or restore it.',
        );
      } else {
        this.manualError.set(
          workCreated
            ? 'Your book entry was saved, but we could not add it to your shelf. Try again to finish adding it. ' +
                apiFailure(error)
            : apiFailure(error),
        );
      }
      if (isAuthFailure(error)) this.needsSignIn.set(true);
    } finally {
      this.manualBusy.set(false);
    }
  }

  private setError(error: unknown): void {
    this.needsSignIn.set(isAuthFailure(error));
    this.error.set(apiFailure(error));
  }
}
