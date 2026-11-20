import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { KtobApiService, LibraryEntry, apiFailure } from '../core/api/ktob-api.service';

@Component({
  selector: 'app-library-page',
  imports: [RouterLink],
  template: `
    <section class="mx-auto max-w-5xl py-8">
      <p class="text-xs font-bold tracking-[.2em] text-[#a16b49]">YOUR SHELVES</p>
      <div class="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="font-serif text-5xl text-[#392e2a]">My library</h1>
          <p class="mt-4 text-[#77695f]">Your private books and reading intentions.</p>
        </div>
        <a routerLink="/catalog/search" class="rounded-xl bg-[#704d3b] px-5 py-3 text-sm font-semibold text-white">+ Add a book</a>
      </div>
      <label class="mt-8 inline-flex cursor-pointer items-center gap-3 text-sm font-medium text-[#574639]">
        <input type="checkbox" [checked]="showArchived()" (change)="toggleArchived()"
          class="size-4 accent-[#704d3b]" /> Include archived books
      </label>
      @if (busy()) { <p role="status" class="mt-8 text-[#817067]">Loading your library…</p> }
      @if (error()) { <p role="alert" class="mt-6 rounded-xl bg-rose-50 p-4 text-rose-800">{{ error() }}</p> }
      @if (!busy() && !error() && entries().length === 0) {
        <div class="mt-9 rounded-2xl border border-dashed border-[#d7c9bb] bg-white p-10 text-center">
          <h2 class="font-serif text-3xl text-[#3b2e28]">Every library begins with a book.</h2>
          <p class="mt-3 text-[#817167]">Discover a work or add a private manual entry to begin.</p>
          <a routerLink="/catalog/search" class="mt-6 inline-block font-semibold text-[#704d3b] underline">Find a book →</a>
        </div>
      }
      <div class="mt-7 grid gap-3">
        @for (entry of entries(); track entry.id) {
          <article class="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#e7ded5] bg-white p-5">
            <div>
              <h2 class="font-serif text-xl text-[#3e3029]">{{ workTitles()[entry.workId] || 'Book metadata unavailable' }}</h2>
              <p class="mt-1 text-sm text-[#826e5e]">{{ entry.shelfStatus.replaceAll('_', ' ') }}</p>
              <p class="mt-1 text-xs text-[#86776c]">{{ entry.archivedAt ? 'Archived and read-only' : 'In your library' }}</p>
            </div>
            @if (entry.archivedAt) {
              <button type="button" [disabled]="busy()" (click)="restore(entry)"
                class="rounded-lg border border-[#c9b8a8] px-4 py-2 text-sm font-semibold text-[#704d3b]">Restore</button>
            } @else {
              <button type="button" [disabled]="busy()" (click)="archive(entry)"
                class="rounded-lg border border-[#c9b8a8] px-4 py-2 text-sm font-semibold text-[#704d3b]">Archive</button>
            }
          </article>
        }
      </div>
      <p class="mt-8 text-xs leading-6 text-[#8e8075]">Reading sessions, ratings and journal notes arrive in Sprint 2. Archiving retains your history.</p>
    </section>
  `
})
export class LibraryPage implements OnInit {
  private readonly api = inject(KtobApiService);
  readonly entries = signal<LibraryEntry[]>([]);
  readonly workTitles = signal<Record<string, string>>({});
  readonly busy = signal(false);
  readonly error = signal('');
  readonly showArchived = signal(false);

  ngOnInit(): void { void this.load(); }

  async load(): Promise<void> {
    this.busy.set(true); this.error.set('');
    try {
      const entries = (await this.api.listLibrary(this.showArchived())).data;
      this.entries.set(entries);
      const titles: Record<string,string> = {};
      const ids = [...new Set(entries.map(e => e.workId))];
      await Promise.all(ids.map(async id => {
        try { titles[id] = (await this.api.workById(id)).data.title; }
        catch { titles[id] = 'Book metadata unavailable'; }
      }));
      this.workTitles.set(titles);
    }
    catch (error) { this.entries.set([]); this.error.set(apiFailure(error)); }
    finally { this.busy.set(false); }
  }

  toggleArchived(): void { this.showArchived.update(x => !x); void this.load(); }

  async archive(entry: LibraryEntry): Promise<void> {
    this.busy.set(true);
    try { await this.api.archiveEntry(entry.id); await this.load(); }
    catch (e) { this.error.set(apiFailure(e)); }
    finally { this.busy.set(false); }
  }

  async restore(entry: LibraryEntry): Promise<void> {
    this.busy.set(true);
    try { await this.api.restoreEntry(entry.id); await this.load(); }
    catch (e) { this.error.set(apiFailure(e)); }
    finally { this.busy.set(false); }
  }
}
