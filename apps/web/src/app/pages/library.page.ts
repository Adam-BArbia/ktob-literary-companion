import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  BookWork,
  KtobApiService,
  LibraryEntry,
  apiFailure,
  isAuthFailure,
} from '../core/api/ktob-api.service';
import { IconComponent } from '../shared/icon.component';
import { BookCoverComponent } from '../shared/book-cover.component';
import { mapInBatches, readingStatusLabel } from '../core/api/reading-helpers';
import { ConfirmationDialogComponent } from '../shared/confirmation-dialog.component';

@Component({
  selector: 'app-library-page',
  imports: [
    FormsModule,
    RouterLink,
    IconComponent,
    BookCoverComponent,
    ConfirmationDialogComponent,
  ],
  templateUrl: './library.page.html',
  styleUrl: './library.page.css',
})
export class LibraryPage implements OnInit {
  private readonly api = inject(KtobApiService);
  @ViewChild('archiveDialog') private archiveDialog?: ConfirmationDialogComponent;
  @ViewChild('shelfFilter') private shelfFilter?: ElementRef<HTMLButtonElement>;
  private previousFocus: HTMLElement | null = null;
  readonly entries = signal<LibraryEntry[]>([]);
  readonly works = signal<Record<string, BookWork>>({});
  readonly loading = signal(true);
  readonly changing = signal<string | null>(null);
  readonly error = signal('');
  readonly notice = signal('');
  readonly needsSignIn = signal(false);
  readonly shelf = signal<'active' | 'favorites' | 'archived'>('active');
  readonly status = signal('');
  readonly hasMore = signal(false);
  readonly view = signal<'grid' | 'list'>('grid');
  readonly query = signal('');
  readonly pendingArchive = signal<LibraryEntry | null>(null);
  readonly lastArchived = signal<LibraryEntry | null>(null);
  readonly skeletons = [0, 1, 2, 3];
  readonly activeCount = computed(() => this.entries().filter((entry) => !entry.archivedAt).length);
  readonly favoriteCount = computed(
    () => this.entries().filter((entry) => !entry.archivedAt && entry.favorite).length,
  );
  readonly archivedCount = computed(
    () => this.entries().filter((entry) => !!entry.archivedAt).length,
  );
  readonly visibleEntries = computed(() => {
    const query = this.query().trim().toLocaleLowerCase();
    const works = this.works();
    return this.entries().filter((entry) => {
      if ((this.shelf() === 'archived') !== !!entry.archivedAt) return false;
      if (this.shelf() === 'favorites' && !entry.favorite) return false;
      if (this.status() && entry.shelfStatus !== this.status()) return false;
      if (!query) return true;
      const work = works[entry.workId];
      return [work?.title ?? '', ...(work?.authors ?? [])]
        .join(' ')
        .toLocaleLowerCase()
        .includes(query);
    });
  });

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    if (this.changing()) return;
    this.loading.set(true);
    this.error.set('');
    this.needsSignIn.set(false);
    try {
      const entries: LibraryEntry[] = [];
      let cursor: string | undefined;
      for (let page = 0; page < 5; page++) {
        const result = await this.api.listLibrary(true, cursor, 100);
        entries.push(...result.data.filter((item) => !entries.some((old) => old.id === item.id)));
        cursor = result.meta?.nextCursor ?? undefined;
        if (!cursor) break;
      }
      this.hasMore.set(!!cursor);
      const works: Record<string, BookWork> = {};
      await mapInBatches([...new Set(entries.map((entry) => entry.workId))], async (id) => {
        try {
          works[id] = (await this.api.workById(id)).data;
        } catch {
          /* A missing title must not prevent access to the rest of the library. */
        }
      });
      this.works.set(works);
      this.entries.set(entries);
    } catch (error) {
      this.setError(error);
    } finally {
      this.loading.set(false);
    }
  }

  title(entry: LibraryEntry): string {
    return this.works()[entry.workId]?.title ?? 'Title unavailable';
  }
  authors(entry: LibraryEntry): string {
    return this.works()[entry.workId]?.authors.join(', ') || 'Author not listed';
  }
  shelfLabel(entry: LibraryEntry): string {
    return readingStatusLabel(entry.shelfStatus);
  }

  setShelf(value: 'active' | 'favorites' | 'archived'): void {
    this.shelf.set(value);
  }

  async favorite(entry: LibraryEntry): Promise<void> {
    if (this.changing() || entry.archivedAt) return;
    this.changing.set(entry.id);
    this.error.set('');
    try {
      const updated = (await this.api.setFavorite(entry.id, !entry.favorite)).data;
      this.entries.update((items) => items.map((item) => (item.id === entry.id ? updated : item)));
      this.notice.set(
        updated.favorite
          ? `“${this.title(entry)}” is a favorite.`
          : `“${this.title(entry)}” was removed from favorites.`,
      );
      this.lastArchived.set(null);
    } catch (error) {
      this.setError(error);
    } finally {
      this.changing.set(null);
    }
  }

  requestArchive(entry: LibraryEntry, trigger: EventTarget | null): void {
    if (this.changing()) return;
    this.previousFocus = trigger instanceof HTMLElement ? trigger : null;
    this.pendingArchive.set(entry);
    this.archiveDialog?.open(trigger);
  }

  cancelArchive(event?: Event): void {
    if (this.changing()) {
      event?.preventDefault();
      return;
    }
    this.archiveDialog?.close();
    this.pendingArchive.set(null);
  }

  onDialogClosed(): void {
    this.pendingArchive.set(null);
    if (this.previousFocus?.isConnected) this.previousFocus.focus();
    else this.shelfFilter?.nativeElement.focus();
    this.previousFocus = null;
  }

  async confirmArchive(): Promise<void> {
    const entry = this.pendingArchive();
    if (!entry || this.changing()) return;
    this.changing.set(entry.id);
    this.error.set('');
    try {
      await this.api.archiveEntry(entry.id);
      this.entries.update((entries) =>
        entries.map((item) =>
          item.id === entry.id ? { ...item, archivedAt: new Date().toISOString() } : item,
        ),
      );
      this.lastArchived.set(entry);
      this.notice.set(`“${this.title(entry)}” was moved to your archive.`);
      this.archiveDialog?.close();
    } catch (error) {
      this.setError(error);
      this.archiveDialog?.close();
    } finally {
      this.changing.set(null);
    }
  }

  async restore(entry: LibraryEntry): Promise<void> {
    if (this.changing()) return;
    this.changing.set(entry.id);
    this.error.set('');
    try {
      const restored = (await this.api.restoreEntry(entry.id)).data;
      this.entries.update((entries) =>
        entries.map((item) => (item.id === entry.id ? restored : item)),
      );
      this.lastArchived.set(null);
      this.notice.set(`“${this.title(entry)}” is back on your shelf.`);
    } catch (error) {
      this.setError(error);
    } finally {
      this.changing.set(null);
    }
  }

  async undoArchive(): Promise<void> {
    const entry = this.lastArchived();
    if (entry) await this.restore(entry);
  }

  private setError(error: unknown): void {
    this.needsSignIn.set(isAuthFailure(error));
    this.error.set(apiFailure(error));
  }
}
