import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  BookWork,
  KtobApiService,
  LibraryEntry,
  ReadingExperience,
  apiFailure,
  isAuthFailure,
} from '../core/api/ktob-api.service';
import { mapInBatches, readingDate, readingStatusLabel } from '../core/api/reading-helpers';
import { IconComponent } from '../shared/icon.component';
import { BookCoverComponent } from '../shared/book-cover.component';
import { RatingComponent } from '../shared/rating.component';

export interface DiaryReading {
  reading: ReadingExperience;
  entry: LibraryEntry;
  work: BookWork | null;
}

export function readingStatistics(entries: LibraryEntry[], rows: DiaryReading[], year: number) {
  const finished = rows.filter((row) => row.reading.status === 'FINISHED');
  const rated = rows.filter((row) => row.reading.rating != null);
  const average = rated.length
    ? rated.reduce((sum, row) => sum + row.reading.rating!, 0) / rated.length
    : null;
  return {
    library: entries.filter((entry) => !entry.archivedAt).length,
    finished: new Set(finished.map((row) => row.entry.id)).size,
    reading: entries.filter(
      (entry) => !entry.archivedAt && entry.shelfStatus === 'CURRENTLY_READING',
    ).length,
    rated: rated.length,
    average: average === null ? '—' : average.toFixed(1),
    thisYear: finished.filter((row) => row.reading.finishedOn?.startsWith(`${year}-`)).length,
  };
}

@Component({
  selector: 'app-diary-page',
  imports: [RouterLink, IconComponent, BookCoverComponent, RatingComponent],
  templateUrl: './diary.page.html',
  styleUrl: './diary.page.css',
})
export class DiaryPage implements OnInit {
  private readonly api = inject(KtobApiService);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly needsSignIn = signal(false);
  readonly entries = signal<LibraryEntry[]>([]);
  readonly rows = signal<DiaryReading[]>([]);
  readonly partial = signal(false);
  readonly metadataMissing = signal(false);
  readonly filter = signal('ALL');
  readonly year = new Date().getFullYear();
  readonly formatDate = readingDate;
  readonly statusLabel = readingStatusLabel;
  readonly stats = computed(() => readingStatistics(this.entries(), this.rows(), this.year));
  readonly filters = [
    { value: 'ALL', label: 'All readings' },
    { value: 'FINISHED', label: 'Finished' },
    { value: 'CURRENTLY_READING', label: 'Reading now' },
    { value: 'PAUSED', label: 'Paused' },
    { value: 'DID_NOT_FINISH', label: 'Did not finish' },
  ];
  readonly groups = computed(() => {
    const filtered = this.rows().filter(
      (row) => this.filter() === 'ALL' || row.reading.status === this.filter(),
    );
    const sorted = [...filtered].sort((a, b) =>
      (b.reading.finishedOn || b.reading.startedOn || '').localeCompare(
        a.reading.finishedOn || a.reading.startedOn || '',
      ),
    );
    const groups = new Map<string, { key: string; label: string; rows: DiaryReading[] }>();
    for (const row of sorted) {
      const date = row.reading.finishedOn || row.reading.startedOn;
      const key = date?.slice(0, 7) ?? 'undated';
      if (!groups.has(key))
        groups.set(key, {
          key,
          label: date
            ? new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(
                new Date(date + 'T12:00:00'),
              )
            : 'Dates not recorded',
          rows: [],
        });
      groups.get(key)!.rows.push(row);
    }
    return [...groups.values()];
  });

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    if (this.loading() && this.entries().length) return;
    this.loading.set(true);
    this.error.set('');
    this.needsSignIn.set(false);
    this.partial.set(false);
    this.metadataMissing.set(false);
    try {
      // Keep this aggregation bounded; no totals are presented as complete when a page remains.
      const library = await this.api.listLibrary(true, undefined, 100);
      let incomplete = !!library.meta?.nextCursor;
      let missingMetadata = false;
      const rows = await mapInBatches(library.data, async (entry) => {
        const experiences = await this.api.experiences(entry.id);
        if (experiences.meta?.nextCursor) incomplete = true;
        if (!experiences.data.length) return [];
        let work: BookWork | null = null;
        try {
          work = (await this.api.workById(entry.workId)).data;
        } catch (error) {
          if (isAuthFailure(error)) throw error;
          missingMetadata = true;
        }
        return experiences.data.map((reading) => ({ entry, reading, work }));
      });
      this.entries.set(library.data);
      this.rows.set(rows.flat());
      this.partial.set(incomplete);
      this.metadataMissing.set(missingMetadata);
    } catch (error) {
      this.error.set(apiFailure(error));
      this.needsSignIn.set(isAuthFailure(error));
    } finally {
      this.loading.set(false);
    }
  }
}
