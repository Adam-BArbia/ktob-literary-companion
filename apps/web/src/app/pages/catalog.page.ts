import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BookWork, KtobApiService, apiFailure } from '../core/api/ktob-api.service';

@Component({
  selector: 'app-catalog-page',
  imports: [FormsModule, RouterLink],
  template: `
    <section class="mx-auto max-w-5xl py-8">
      <p class="text-xs font-bold tracking-[.2em] text-[#a16b49]">DISCOVER LITERATURE</p>
      <h1 class="mt-3 font-serif text-5xl text-[#392e2a]">Find your next read.</h1>
      <p class="mt-4 max-w-2xl leading-7 text-[#77695f]">Search book metadata through our Java service and Open Library, or create a private manual entry.</p>
      <form (ngSubmit)="search()" class="mt-9 flex flex-col gap-3 sm:flex-row">
        <label for="catalog-query" class="sr-only">Book title or author</label>
        <input id="catalog-query" name="query" [(ngModel)]="query" required maxlength="180"
          placeholder="Title, author or story…" class="min-h-12 flex-1 rounded-xl border border-[#d8c8ba] bg-white px-4 text-[#392e2a]" />
        <button type="submit" [disabled]="busy()" class="min-h-12 rounded-xl bg-[#704d3b] px-7 font-semibold text-white disabled:opacity-50">Search books</button>
      </form>
      @if (error()) {
        <p role="alert" class="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{{ error() }}</p>
      }
      @if (notice()) { <p role="status" class="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">{{ notice() }}</p> }
      @if (busy()) { <p role="status" class="mt-7 text-[#827368]">Searching books…</p> }
      <div class="mt-7 grid gap-3">
        @for (book of books(); track book.id) {
          <article class="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#e7ded5] bg-white px-5 py-4">
            <div>
              <p class="font-serif text-xl text-[#3e312a]">{{ book.title }}</p>
              <p class="mt-1 text-sm text-[#85756c]">{{ book.authors.join(', ') || 'Author unknown' }} · {{ book.origin === 'OPEN_LIBRARY' ? 'Open Library metadata' : 'Private manual entry' }}</p>
            </div>
            <button type="button" [disabled]="busy()" (click)="add(book)"
              class="rounded-lg border border-[#d1b8a5] px-4 py-2 text-sm font-semibold text-[#704d3b] disabled:opacity-50">
              Add to my library
            </button>
          </article>
        }
      </div>
      @if (!busy() && searched() && books().length === 0 && !error()) {
        <p class="mt-6 text-[#7c7066]">No works found. You can add a private manual entry below.</p>
      }
      <section class="mt-12 rounded-2xl border border-[#e2d5c8] bg-[#f8f1e8] p-6 sm:p-8">
        <h2 class="font-serif text-3xl text-[#3f3029]">Can't find the book?</h2>
        <p class="mt-2 text-sm leading-6 text-[#806e61]">Manual entries are visible only to you. They won't become public catalog records.</p>
        <form (ngSubmit)="createManual()" class="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label for="manual-title" class="text-sm font-semibold text-[#554235]">Book title</label>
            <input id="manual-title" name="title" [(ngModel)]="manualTitle" required maxlength="500"
              class="mt-2 w-full rounded-xl border border-[#d7c6b6] bg-white p-3" />
          </div>
          <div>
            <label for="manual-author" class="text-sm font-semibold text-[#554235]">Author (optional)</label>
            <input id="manual-author" name="author" [(ngModel)]="manualAuthor"
              class="mt-2 w-full rounded-xl border border-[#d7c6b6] bg-white p-3" />
          </div>
          <div class="sm:col-span-2">
            <button type="submit" [disabled]="busy() || !manualTitle.trim()"
              class="rounded-xl bg-[#704d3b] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50">
              Save private book to my library
            </button>
          </div>
        </form>
      </section>
      <a routerLink="/library" class="mt-8 inline-block text-sm font-bold text-[#7d5039] underline">Open my library →</a>
    </section>
  `
})
export class CatalogPage {
  private readonly api = inject(KtobApiService);
  readonly books = signal<BookWork[]>([]);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly searched = signal(false);
  query = '';
  manualTitle = '';
  manualAuthor = '';

  async search(): Promise<void> {
    if (!this.query.trim()) return;
    this.busy.set(true); this.error.set(''); this.notice.set(''); this.searched.set(true);
    try { this.books.set((await this.api.searchWorks(this.query)).data); }
    catch (e) { this.error.set(apiFailure(e)); this.books.set([]); }
    finally { this.busy.set(false); }
  }

  async add(book: BookWork): Promise<void> {
    this.busy.set(true); this.error.set(''); this.notice.set('');
    try {
      await this.api.addToLibrary(book.id);
      this.notice.set('“' + book.title + '” was added to your private library.');
    } catch (e) { this.error.set(apiFailure(e)); }
    finally { this.busy.set(false); }
  }

  async createManual(): Promise<void> {
    if (!this.manualTitle.trim()) return;
    this.busy.set(true); this.error.set(''); this.notice.set('');
    try {
      const work = (await this.api.createManualWork(this.manualTitle.trim(),
        this.manualAuthor.trim() ? [this.manualAuthor.trim()] : [])).data;
      await this.api.addToLibrary(work.id);
      this.manualTitle = ''; this.manualAuthor = '';
      this.notice.set('Private book saved to your library.');
    } catch (e) { this.error.set(apiFailure(e)); }
    finally { this.busy.set(false); }
  }
}
