import {
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  BookWork,
  ExperiencePatch,
  JournalEntry,
  JournalKind,
  KtobApiService,
  LibraryEntry,
  ReadingExperience,
  ReadingStatus,
  apiFailure,
  isAuthFailure,
} from '../core/api/ktob-api.service';
import {
  isOpenReading,
  readingDate,
  readingStatusLabel,
  todayDate,
} from '../core/api/reading-helpers';
import { BookHeroComponent } from '../shared/book-hero.component';
import { ConfirmationDialogComponent } from '../shared/confirmation-dialog.component';
import { IconComponent } from '../shared/icon.component';
import { RatingComponent } from '../shared/rating.component';
import { JournalNoteComponent } from '../shared/journal-note.component';

@Component({
  selector: 'app-book-page',
  imports: [
    FormsModule,
    RouterLink,
    BookHeroComponent,
    JournalNoteComponent,
    ConfirmationDialogComponent,
    IconComponent,
    RatingComponent,
  ],
  templateUrl: './book.page.html',
  styleUrl: './book.page.css',
})
export class BookPage {
  private readonly api = inject(KtobApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  @ViewChild('confirmation') private confirmation?: ConfirmationDialogComponent;
  @ViewChild('noteBody') private noteBody?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('readingActions') private readingActions?: ElementRef<HTMLElement>;
  @ViewChild('finishedHeading') private finishedHeading?: ElementRef<HTMLElement>;
  private previousFocus: HTMLElement | null = null;
  private loadVersion = 0;
  private journalVersion = 0;
  private journalDraftExperienceId = '';
  entryId = '';
  readonly entry = signal<LibraryEntry | null>(null);
  readonly work = signal<BookWork | null>(null);
  readonly readings = signal<ReadingExperience[]>([]);
  readonly selectedId = signal('');
  readonly selected = computed(
    () => this.readings().find((r) => r.id === this.selectedId()) ?? null,
  );
  readonly active = computed(() => this.readings().find(isOpenReading) ?? null);
  readonly archived = computed(() => !!this.entry()?.archivedAt);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly needsSignIn = signal(false);
  readonly readingCursor = signal<string | null>(null);
  readonly journalEntries = signal<JournalEntry[]>([]);
  readonly journalLoading = signal(false);
  readonly journalError = signal('');
  readonly journalCursor = signal<string | null>(null);
  readonly editorOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly journalSaving = signal(false);
  readonly editorError = signal('');
  readonly finishMode = signal<'historical' | 'finish' | null>(null);
  readonly pendingAction = signal<'archive' | 'delete' | null>(null);
  readonly pendingNote = signal<JournalEntry | null>(null);
  readonly statusLabel = readingStatusLabel;
  readonly formatDate = readingDate;
  readonly kinds: { value: JournalKind; label: string }[] = [
    { value: 'REVIEW', label: 'Review' },
    { value: 'REFLECTION', label: 'Reflection' },
    { value: 'QUOTE', label: 'Quotation' },
    { value: 'NOTE', label: 'Note' },
    { value: 'EMOTION', label: 'Feeling' },
  ];
  ratingDraft: number | null = null;
  progressDraft: number | null = null;
  finishRating: number | null = null;
  startedOn = '';
  finishedOn = '';
  noteKind: JournalKind = 'REVIEW';
  noteText = '';
  emotionTags = '';
  allowForPersonalization = false;

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const nextId = params.get('entryId') ?? '';
      if (nextId !== this.entryId) {
        ++this.journalVersion;
        this.entry.set(null);
        this.work.set(null);
        this.readings.set([]);
        this.selectedId.set('');
        this.journalEntries.set([]);
        this.journalCursor.set(null);
        this.journalError.set('');
        this.editorOpen.set(false);
        this.noteText = '';
        this.editingId.set(null);
        this.journalDraftExperienceId = '';
        this.editorError.set('');
        this.finishMode.set(null);
        this.notice.set('');
      }
      this.entryId = nextId;
      void this.load();
    });
    this.destroyRef.onDestroy(() => {
      ++this.loadVersion;
      ++this.journalVersion;
    });
  }

  async load(): Promise<void> {
    const version = ++this.loadVersion;
    this.loading.set(true);
    this.error.set('');
    this.needsSignIn.set(false);
    try {
      const entry = (await this.api.libraryEntry(this.entryId)).data;
      const [work, readings] = await Promise.all([
        this.api.workById(entry.workId),
        this.api.experiences(entry.id),
      ]);
      if (version !== this.loadVersion) return;
      this.entry.set(entry);
      this.work.set(work.data);
      this.readings.set(readings.data);
      this.readingCursor.set(readings.meta?.nextCursor ?? null);
      const requested = this.route.snapshot.queryParamMap.get('reading') || this.selectedId();
      const selected =
        readings.data.find((r) => r.id === requested) ??
        readings.data.find(isOpenReading) ??
        readings.data[0];
      this.setSelected(selected?.id ?? '');
      await this.loadJournal();
    } catch (error) {
      if (version === this.loadVersion) this.setError(error);
    } finally {
      if (version === this.loadVersion) this.loading.set(false);
    }
  }

  async loadMoreReadings(): Promise<void> {
    const cursor = this.readingCursor();
    if (!cursor || this.busy()) return;
    this.busy.set(true);
    try {
      const result = await this.api.experiences(this.entryId, cursor);
      this.readings.update((items) => [
        ...items,
        ...result.data.filter((r) => !items.some((old) => old.id === r.id)),
      ]);
      this.readingCursor.set(result.meta?.nextCursor ?? null);
    } catch (error) {
      this.setError(error);
    } finally {
      this.busy.set(false);
    }
  }

  async selectReading(id: string): Promise<void> {
    if (id === this.selectedId()) return;
    if (this.hasUnsavedDraft()) {
      this.editorError.set('Save or cancel your draft before opening another reading.');
      this.noteBody?.nativeElement.focus();
      return;
    }
    this.closeEditor();
    this.finishMode.set(null);
    this.setSelected(id);
    await this.loadJournal();
  }

  private setSelected(id: string): void {
    this.selectedId.set(id);
    this.ratingDraft = this.selected()?.rating ?? null;
    this.progressDraft = this.selected()?.progressPercent ?? null;
  }

  async loadJournal(more = false): Promise<void> {
    const id = this.selectedId();
    const version = ++this.journalVersion;
    if (!id) {
      this.journalEntries.set([]);
      this.journalCursor.set(null);
      return;
    }
    this.journalLoading.set(true);
    this.journalError.set('');
    if (!more) this.journalEntries.set([]);
    try {
      const result = await this.api.journal(
        id,
        more ? (this.journalCursor() ?? undefined) : undefined,
      );
      if (version !== this.journalVersion) return;
      this.journalEntries.update((items) =>
        more
          ? [...items, ...result.data.filter((n) => !items.some((old) => old.id === n.id))]
          : result.data,
      );
      this.journalCursor.set(result.meta?.nextCursor ?? null);
    } catch (error) {
      if (version === this.journalVersion) {
        this.needsSignIn.set(isAuthFailure(error));
        this.journalError.set(apiFailure(error));
      }
    } finally {
      if (version === this.journalVersion) this.journalLoading.set(false);
    }
  }

  async startReading(): Promise<void> {
    if (this.busy() || this.archived() || this.active()) return;
    if (this.hasUnsavedDraft()) {
      this.editorError.set('Save or cancel your draft before starting a new reading.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const result = await this.api.createExperience(this.entryId, {
        status: 'CURRENTLY_READING',
        startedOn: todayDate(),
      });
      this.readings.update((items) => [result.data, ...items]);
      this.closeEditor();
      this.setSelected(result.data.id);
      this.finishMode.set(null);
      this.notice.set('A new reading has begun. Your earlier ratings and notes are kept.');
      await this.refreshEntry();
      await this.loadJournal();
    } catch (error) {
      this.setError(error);
    } finally {
      this.busy.set(false);
    }
  }

  showFinish(mode: 'historical' | 'finish'): void {
    if (this.archived() || this.busy()) return;
    this.finishMode.set(mode);
    this.finishedOn = mode === 'finish' ? todayDate() : '';
    this.startedOn = mode === 'finish' ? (this.active()?.startedOn ?? '') : '';
    this.finishRating = mode === 'finish' ? (this.active()?.rating ?? null) : null;
    this.error.set('');
    setTimeout(() => this.finishedHeading?.nativeElement.focus(), 0);
  }

  async saveFinished(): Promise<void> {
    const mode = this.finishMode();
    if (!mode || this.busy() || this.archived()) return;
    if (this.startedOn && this.finishedOn && this.finishedOn < this.startedOn) {
      this.error.set('The finishing date must be on or after the starting date.');
      return;
    }
    if (
      this.hasUnsavedDraft() &&
      (mode === 'historical' || this.active()?.id !== this.journalDraftExperienceId)
    ) {
      this.editorError.set('Save or cancel your journal draft before logging another reading.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const body = {
        status: 'FINISHED' as const,
        startedOn: this.startedOn || null,
        finishedOn: this.finishedOn || null,
        rating: this.finishRating,
      };
      const active = this.active();
      if (mode === 'finish' && !active) {
        this.error.set('There is no open reading to finish. Refresh this page.');
        return;
      }
      const result =
        mode === 'historical'
          ? await this.api.createExperience(this.entryId, { ...body, historicalImport: true })
          : await this.api.updateExperience(active!.id, body);
      this.upsertReading(result.data);
      this.setSelected(result.data.id);
      this.finishMode.set(null);
      this.notice.set('Finished reading saved. Make a little room for what stayed with you.');
      await this.refreshEntry();
      await this.loadJournal();
    } catch (error) {
      this.setError(error);
    } finally {
      this.busy.set(false);
    }
  }

  async changeStatus(status: ReadingStatus): Promise<void> {
    const reading = this.active();
    if (!reading) return;
    await this.patchReading(
      reading.id,
      { status },
      `Reading marked ${readingStatusLabel(status).toLowerCase()}.`,
    );
  }

  async toggleRatingVisibility(reading: ReadingExperience): Promise<void> {
    await this.patchReading(reading.id, { ratingPublic: !reading.ratingPublic },
      reading.ratingPublic ? 'This reading rating is private.' :
        'This reading rating is shared when your profile is discoverable.');
  }

  async toggleNoteVisibility(note: JournalEntry): Promise<void> {
    if (this.journalSaving() || this.busy() || this.archived()) return;
    if (!note.isPublic && !window.confirm(
      'Publish this specific note? Other signed-in readers may see its full text on your public profile once you enable discoverability. Private notes remain private.'
    )) return;
    this.journalSaving.set(true);
    this.error.set('');
    try {
      const { data } = await this.api.updateJournal(note.id, { isPublic: !note.isPublic });
      this.journalEntries.update(items => items.map(item => item.id === note.id ? data : item));
      this.notice.set(data.isPublic ? 'This note is now published individually.' : 'This note is private again.');
    } catch (error) {
      this.setError(error);
    } finally {
      this.journalSaving.set(false);
    }
  }

  async saveRating(): Promise<void> {
    const reading = this.selected();
    if (reading)
      await this.patchReading(reading.id, { rating: this.ratingDraft }, 'Your rating is saved.');
  }

  async saveProgress(): Promise<void> {
    if (
      this.progressDraft !== null &&
      (!Number.isInteger(this.progressDraft) || this.progressDraft < 0 || this.progressDraft > 100)
    ) {
      this.error.set('Progress must be a whole number between 0 and 100, or left blank.');
      return;
    }
    const reading = this.selected();
    if (reading)
      await this.patchReading(
        reading.id,
        { progressPercent: this.progressDraft },
        'Progress saved. Your reading status has not changed.',
      );
  }

  private async patchReading(id: string, body: ExperiencePatch, message: string): Promise<void> {
    if (this.busy() || this.archived()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const result = await this.api.updateExperience(id, body);
      this.upsertReading(result.data);
      if (this.selectedId() === id) {
        this.ratingDraft = result.data.rating ?? null;
        this.progressDraft = result.data.progressPercent ?? null;
      }
      this.notice.set(message);
      if (body.status || body.startedOn !== undefined || body.finishedOn !== undefined)
        await this.refreshEntry();
    } catch (error) {
      this.setError(error);
    } finally {
      this.busy.set(false);
    }
  }

  private upsertReading(reading: ReadingExperience): void {
    this.readings.update((items) =>
      items.some((r) => r.id === reading.id)
        ? items.map((r) => (r.id === reading.id ? reading : r))
        : [reading, ...items],
    );
  }

  private async refreshEntry(): Promise<void> {
    try {
      this.entry.set((await this.api.libraryEntry(this.entryId)).data);
    } catch (error) {
      this.error.set(
        'Your change was saved, but the shelf status could not be refreshed. Reload this page to see the latest status.',
      );
      this.needsSignIn.set(isAuthFailure(error));
    }
  }

  openEditor(kind: JournalKind = 'REVIEW', note?: JournalEntry): void {
    if (!this.selected() || this.archived() || this.journalSaving()) return;
    if (this.hasUnsavedDraft()) {
      this.editorError.set('Save or cancel your current draft first.');
      return;
    }
    this.editingId.set(note?.id ?? null);
    this.journalDraftExperienceId = note?.experienceId ?? this.selectedId();
    this.noteKind = note?.kind ?? kind;
    this.noteText = note?.body ?? '';
    this.emotionTags = note?.emotionTags?.join(', ') ?? '';
    this.allowForPersonalization = note?.allowForPersonalization ?? false;
    this.editorError.set('');
    this.editorOpen.set(true);
    setTimeout(() => this.noteBody?.nativeElement.focus(), 0);
  }

  closeEditor(): void {
    if (this.journalSaving()) return;
    this.editorOpen.set(false);
    this.editingId.set(null);
    this.journalDraftExperienceId = '';
    this.noteText = '';
    this.emotionTags = '';
    this.allowForPersonalization = false;
    this.editorError.set('');
  }

  hasUnsavedDraft(): boolean {
    return this.editorOpen() && !!this.noteText.trim();
  }

  async saveJournal(): Promise<void> {
    if (this.journalSaving() || this.busy() || this.archived() || !this.selectedId()) return;
    const tags = [
      ...new Set(
        this.emotionTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      ),
    ];
    if (!this.noteText.trim()) {
      this.editorError.set('Write a few words before saving.');
      this.noteBody?.nativeElement.focus();
      return;
    }
    if (this.noteText.length > 20000) {
      this.editorError.set('Keep each journal entry within 20,000 characters.');
      return;
    }
    if (tags.length > 12 || tags.some((t) => t.length > 40)) {
      this.editorError.set('Use up to 12 emotion tags, with at most 40 characters each.');
      return;
    }
    this.journalSaving.set(true);
    this.editorError.set('');
    const editing = this.editingId();
    const version = this.loadVersion;
    const experienceId = this.journalDraftExperienceId;
    try {
      const body = {
        kind: this.noteKind,
        body: this.noteText,
        emotionTags: tags,
        allowForPersonalization: this.allowForPersonalization,
      };
      const result = editing
        ? await this.api.updateJournal(editing, body)
        : await this.api.createJournal(experienceId, body);
      if (version !== this.loadVersion) return;
      this.journalEntries.update((items) =>
        editing ? items.map((n) => (n.id === editing ? result.data : n)) : [result.data, ...items],
      );
      this.notice.set(
        editing
          ? 'Your journal entry has been updated.'
          : 'Your words are saved in your private journal.',
      );
      this.journalSaving.set(false);
      this.closeEditor();
    } catch (error) {
      if (version === this.loadVersion) {
        this.editorError.set(apiFailure(error));
        this.needsSignIn.set(isAuthFailure(error));
      }
    } finally {
      this.journalSaving.set(false);
    }
  }

  kindLabel(kind: JournalKind): string {
    return this.kinds.find((k) => k.value === kind)?.label ?? kind;
  }

  async favorite(): Promise<void> {
    const entry = this.entry();
    if (!entry || this.busy() || this.archived()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      this.entry.set((await this.api.setFavorite(entry.id, !entry.favorite)).data);
      this.notice.set(entry.favorite ? 'Removed from favorites.' : 'Added to your favorites.');
    } catch (error) {
      this.setError(error);
    } finally {
      this.busy.set(false);
    }
  }

  confirm(action: 'archive' | 'delete', trigger: EventTarget | null, note?: JournalEntry): void {
    if (this.busy() || this.journalSaving()) return;
    if (action === 'archive' && this.hasUnsavedDraft()) {
      this.editorError.set('Save or cancel your journal draft before archiving this book.');
      this.noteBody?.nativeElement.focus();
      return;
    }
    this.previousFocus = trigger instanceof HTMLElement ? trigger : null;
    this.pendingAction.set(action);
    this.pendingNote.set(note ?? null);
    this.confirmation?.open(trigger);
  }

  cancelConfirmation(event?: Event): void {
    if (this.busy()) {
      event?.preventDefault();
      return;
    }
    this.confirmation?.close();
  }

  confirmationClosed(): void {
    this.pendingAction.set(null);
    this.pendingNote.set(null);
    if (this.previousFocus?.isConnected) this.previousFocus.focus();
    else this.readingActions?.nativeElement.focus();
    this.previousFocus = null;
  }

  async executeConfirmed(): Promise<void> {
    if (this.busy()) return;
    const action = this.pendingAction();
    const note = this.pendingNote();
    if (!action) return;
    this.busy.set(true);
    this.error.set('');
    try {
      if (action === 'archive') {
        await this.api.archiveEntry(this.entryId);
        this.entry.update((e) => (e ? { ...e, archivedAt: new Date().toISOString() } : e));
        this.finishMode.set(null);
        this.notice.set('Book archived. Your reading history and journal are safely kept.');
      } else if (note) {
        await this.api.deleteJournal(note.id);
        this.journalEntries.update((items) => items.filter((n) => n.id !== note.id));
        if (this.editingId() === note.id) this.closeEditor();
        this.notice.set('Journal entry deleted. Your reading and rating are unchanged.');
      }
      this.confirmation?.close();
    } catch (error) {
      this.setError(error);
      this.confirmation?.close();
    } finally {
      this.busy.set(false);
    }
  }

  async restore(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      this.entry.set((await this.api.restoreEntry(this.entryId)).data);
      this.notice.set('Back on your shelf. You can continue your reading and journal.');
    } catch (error) {
      this.setError(error);
    } finally {
      this.busy.set(false);
    }
  }

  private setError(error: unknown): void {
    this.needsSignIn.set(isAuthFailure(error));
    this.error.set(apiFailure(error));
  }
}
