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

@Component({
  selector: 'app-library-page',
  imports: [FormsModule, RouterLink, IconComponent, BookCoverComponent],
  templateUrl: './library.page.html',
  styleUrl: './library.page.css',
})
export class LibraryPage implements OnInit {
  private readonly api = inject(KtobApiService);
  @ViewChild('archiveDialog') private archiveDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild('shelfFilter') private shelfFilter?: ElementRef<HTMLButtonElement>;
  private previousFocus: HTMLElement | null = null;
  readonly entries = signal<LibraryEntry[]>([]);
  readonly works = signal<Record<string, BookWork>>({});
  readonly loading = signal(true);
  readonly changing = signal<string | null>(null);
  readonly error = signal('');
  readonly notice = signal('');
  readonly needsSignIn = signal(false);
  readonly shelf = signal<'active' | 'archived'>('active');
  readonly view = signal<'grid' | 'list'>('grid');
  readonly query = signal('');
  readonly pendingArchive = signal<LibraryEntry | null>(null);
  readonly lastArchived = signal<LibraryEntry | null>(null);
  readonly skeletons = [0, 1, 2, 3];
  readonly activeCount = computed(() => this.entries().filter((entry) => !entry.archivedAt).length);
  readonly archivedCount = computed(
    () => this.entries().filter((entry) => !!entry.archivedAt).length,
  );
  readonly visibleEntries = computed(() => {
    const query = this.query().trim().toLocaleLowerCase();
    const works = this.works();
    return this.entries().filter((entry) => {
      if ((this.shelf() === 'archived') !== !!entry.archivedAt) return false;
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
      const entries = (await this.api.listLibrary(true)).data;
      const works: Record<string, BookWork> = {};
      await Promise.all(
        [...new Set(entries.map((entry) => entry.workId))].map(async (id) => {
          try {
            works[id] = (await this.api.workById(id)).data;
          } catch {
            /* A missing title must not prevent access to the rest of the library. */
          }
        }),
      );
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
    const labels: Record<string, string> = {
      WANT_TO_READ: 'Want to read',
      READING: 'Reading',
      FINISHED: 'Finished',
      PAUSED: 'Paused',
      ABANDONED: 'Set aside',
    };
    return labels[entry.shelfStatus] ?? 'On your shelf';
  }

  setShelf(value: 'active' | 'archived'): void {
    this.shelf.set(value);
  }

  requestArchive(entry: LibraryEntry, trigger: EventTarget | null): void {
    if (this.changing()) return;
    this.previousFocus = trigger instanceof HTMLElement ? trigger : null;
    this.pendingArchive.set(entry);
    this.archiveDialog?.nativeElement.showModal();
  }

  cancelArchive(event?: Event): void {
    if (this.changing()) {
      event?.preventDefault();
      return;
    }
    this.archiveDialog?.nativeElement.close();
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
      this.archiveDialog?.nativeElement.close();
    } catch (error) {
      this.setError(error);
      this.archiveDialog?.nativeElement.close();
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
