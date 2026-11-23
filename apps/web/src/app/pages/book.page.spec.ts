import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, ParamMap, convertToParamMap, provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { BookPage } from './book.page';
import {
  BookWork,
  JournalEntry,
  KtobApiService,
  LibraryEntry,
  ReadingExperience,
} from '../core/api/ktob-api.service';

const entry: LibraryEntry = {
  id: 'entry',
  workId: 'work',
  preferredEditionId: null,
  shelfStatus: 'FINISHED',
  favorite: false,
  acquisitionIntention: false,
  createdAt: '2026-01-01T00:00:00Z',
  archivedAt: null,
};
const work: BookWork = {
  id: 'work',
  title: 'Persuasion',
  authors: ['Jane Austen'],
  origin: 'OPEN_LIBRARY',
  language: null,
  catalogReference: '/works/OL1W',
  metadataStatus: 'PARTIAL',
  ownerReaderId: null,
};
const reading: ReadingExperience = {
  id: 'reading',
  libraryEntryId: 'entry',
  status: 'FINISHED',
  startedOn: null,
  finishedOn: '2026-11-01',
  rating: 4.5,
  progressPercent: null,
};
const note: JournalEntry = {
  id: 'note',
  experienceId: 'reading',
  kind: 'REVIEW',
  body: 'A quiet, moving novel.',
  emotionTags: ['Moved'],
  allowForPersonalization: false,
  createdAt: '2026-11-02T12:00:00Z',
};

describe('Private book reading and journal', () => {
  let page: BookPage;
  let params: Subject<ParamMap>;
  const api = {
    libraryEntry: vi.fn(),
    workById: vi.fn(),
    experiences: vi.fn(),
    journal: vi.fn(),
    createExperience: vi.fn(),
    updateExperience: vi.fn(),
    createJournal: vi.fn(),
    updateJournal: vi.fn(),
    deleteJournal: vi.fn(),
    archiveEntry: vi.fn(),
    restoreEntry: vi.fn(),
    setFavorite: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    params = new Subject<ParamMap>();
    api.libraryEntry.mockResolvedValue({ data: { ...entry } });
    api.workById.mockResolvedValue({ data: work });
    api.experiences.mockResolvedValue({ data: [{ ...reading }], meta: { nextCursor: null } });
    api.journal.mockResolvedValue({ data: [{ ...note }], meta: { nextCursor: null } });
    api.updateExperience.mockImplementation(async (_id: string, patch: object) => ({
      data: { ...reading, ...patch },
    }));
    TestBed.configureTestingModule({
      imports: [BookPage],
      providers: [
        provideRouter([]),
        { provide: KtobApiService, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: params, snapshot: { queryParamMap: convertToParamMap({}) } },
        },
      ],
    });
    page = TestBed.createComponent(BookPage).componentInstance;
    page.entryId = 'entry';
    await page.load();
  });

  it('logs an explicitly finished historical reading with the chosen half-star rating', async () => {
    api.createExperience.mockResolvedValue({ data: { ...reading, id: 'past', finishedOn: null } });
    page.showFinish('historical');
    page.finishRating = 4.5;
    await page.saveFinished();
    expect(api.createExperience).toHaveBeenCalledWith('entry', {
      status: 'FINISHED',
      historicalImport: true,
      startedOn: null,
      finishedOn: null,
      rating: 4.5,
    });
    expect(page.selectedId()).toBe('past');
    expect(page.readings().find((r) => r.id === 'reading')?.rating).toBe(4.5);
  });

  it('changes and clears a per-reading rating without modifying status or journal', async () => {
    page.ratingDraft = 5;
    await page.saveRating();
    expect(api.updateExperience).toHaveBeenLastCalledWith('reading', { rating: 5 });
    expect(page.selected()?.rating).toBe(5);
    page.ratingDraft = null;
    await page.saveRating();
    expect(api.updateExperience).toHaveBeenLastCalledWith('reading', { rating: null });
    expect(page.journalEntries()[0].body).toBe(note.body);
    expect(api.updateJournal).not.toHaveBeenCalled();
  });

  it('keeps a selected rating draft if saving fails', async () => {
    api.updateExperience.mockRejectedValue(new HttpErrorResponse({ status: 503 }));
    page.ratingDraft = 5;
    await page.saveRating();
    expect(page.ratingDraft).toBe(5);
    expect(page.selected()?.rating).toBe(4.5);
    expect(page.error()).toBeTruthy();
  });

  it('saves private note contents with personalization excluded by default', async () => {
    api.createJournal.mockResolvedValue({
      data: { ...note, id: 'quote', kind: 'QUOTE', body: '  Words I want to keep.  ' },
    });
    page.openEditor('QUOTE');
    page.noteText = '  Words I want to keep.  ';
    page.emotionTags = 'Hopeful, curious, Hopeful';
    await page.saveJournal();
    expect(api.createJournal).toHaveBeenCalledWith('reading', {
      kind: 'QUOTE',
      body: '  Words I want to keep.  ',
      emotionTags: ['Hopeful', 'curious'],
      allowForPersonalization: false,
    });
    expect(page.journalEntries()).toHaveLength(2);
    expect(page.editorOpen()).toBe(false);
    expect(api.updateExperience).not.toHaveBeenCalled();
  });

  it('preserves all journal draft fields when a network save fails', async () => {
    api.createJournal.mockRejectedValue(new HttpErrorResponse({ status: 0 }));
    page.openEditor('REFLECTION');
    page.noteText = 'My unsaved thought';
    page.emotionTags = 'Moved';
    await page.saveJournal();
    expect(page.editorOpen()).toBe(true);
    expect(page.noteText).toBe('My unsaved thought');
    expect(page.noteKind).toBe('REFLECTION');
    expect(page.emotionTags).toBe('Moved');
    expect(page.editorError()).toBeTruthy();
    expect(page.journalEntries()).toHaveLength(1);
  });

  it('edits a review independently from its rating and deletes only the chosen note', async () => {
    api.updateJournal.mockResolvedValue({ data: { ...note, body: 'Revised review' } });
    page.openEditor('REVIEW', note);
    page.noteText = 'Revised review';
    await page.saveJournal();
    expect(api.updateJournal).toHaveBeenCalledWith(
      'note',
      expect.objectContaining({ body: 'Revised review' }),
    );
    expect(page.selected()?.rating).toBe(4.5);
    page.pendingAction.set('delete');
    page.pendingNote.set(note);
    await page.executeConfirmed();
    expect(api.deleteJournal).toHaveBeenCalledWith('note');
    expect(page.journalEntries()).toEqual([]);
    expect(page.readings()).toHaveLength(1);
    expect(api.updateExperience).not.toHaveBeenCalled();
  });

  it('validates empty text, tag limits, dates, and integer progress before dispatch', async () => {
    page.openEditor('NOTE');
    page.noteText = '   ';
    await page.saveJournal();
    expect(api.createJournal).not.toHaveBeenCalled();
    page.noteText = 'A note';
    page.emotionTags = 'x'.repeat(41);
    await page.saveJournal();
    expect(api.createJournal).not.toHaveBeenCalled();
    page.closeEditor();
    page.showFinish('historical');
    page.startedOn = '2026-11-03';
    page.finishedOn = '2026-11-01';
    await page.saveFinished();
    expect(api.createExperience).not.toHaveBeenCalled();
    page.progressDraft = 32.5;
    await page.saveProgress();
    expect(api.updateExperience).not.toHaveBeenCalled();
  });

  it('does not move an unsaved draft to another reading, including finishing an active reread', async () => {
    const active = { ...reading, id: 'reread', status: 'CURRENTLY_READING' as const, rating: null };
    page.readings.update((items) => [...items, active]);
    page.openEditor('REVIEW');
    page.noteText = 'Draft about the first read';
    await page.selectReading('reread');
    expect(page.selectedId()).toBe('reading');
    page.showFinish('finish');
    await page.saveFinished();
    expect(api.updateExperience).not.toHaveBeenCalled();
    expect(page.noteText).toBe('Draft about the first read');
  });

  it('preserves all prior readings and notes when starting a reread', async () => {
    api.createExperience.mockResolvedValue({
      data: { ...reading, id: 'new', status: 'CURRENTLY_READING', rating: null, finishedOn: null },
    });
    api.journal.mockResolvedValue({ data: [] });
    await page.startReading();
    expect(api.createExperience).toHaveBeenCalledWith(
      'entry',
      expect.objectContaining({ status: 'CURRENTLY_READING' }),
    );
    expect(page.readings()).toHaveLength(2);
    expect(page.readings().find((r) => r.id === 'reading')?.rating).toBe(4.5);
    expect(page.selectedId()).toBe('new');
    expect(api.deleteJournal).not.toHaveBeenCalled();
  });

  it('leaves progress independent when a current reading is finished', async () => {
    page.readings.set([
      { ...reading, status: 'CURRENTLY_READING', finishedOn: null, progressPercent: 68 },
    ]);
    api.updateExperience.mockResolvedValue({ data: { ...reading, progressPercent: 68 } });
    page.showFinish('finish');
    await page.saveFinished();
    expect(api.updateExperience.mock.calls[0][1]).not.toHaveProperty('progressPercent');
    expect(page.selected()?.progressPercent).toBe(68);
  });

  it('refreshes the server-derived shelf status after an older historical import', async () => {
    api.createExperience.mockResolvedValue({
      data: { ...reading, id: 'older', finishedOn: '2020-01-01' },
    });
    api.libraryEntry.mockResolvedValue({ data: { ...entry, shelfStatus: 'DID_NOT_FINISH' } });
    page.showFinish('historical');
    page.finishedOn = '2020-01-01';
    await page.saveFinished();
    expect(page.entry()?.shelfStatus).toBe('DID_NOT_FINISH');
  });

  it('keeps archived history readable and blocks all child editing controls', async () => {
    page.entry.set({ ...entry, archivedAt: '2026-11-03T00:00:00Z' });
    page.openEditor();
    page.ratingDraft = 5;
    await page.saveRating();
    await page.startReading();
    await page.favorite();
    expect(page.readings()).toHaveLength(1);
    expect(page.journalEntries()).toHaveLength(1);
    expect(page.editorOpen()).toBe(false);
    expect(api.createExperience).not.toHaveBeenCalled();
    expect(api.updateExperience).not.toHaveBeenCalled();
    expect(api.setFavorite).not.toHaveBeenCalled();
  });

  it('reports journal loading errors instead of showing an empty successful journal', async () => {
    api.journal.mockRejectedValue(new HttpErrorResponse({ status: 503 }));
    await page.loadJournal();
    expect(page.journalError()).toBeTruthy();
    expect(page.journalLoading()).toBe(false);
  });

  it('does not carry a prior book draft into a reused route', async () => {
    page.openEditor();
    page.noteText = 'Belongs to first book';
    params.next(convertToParamMap({ entryId: 'second' }));
    expect(page.editorOpen()).toBe(false);
    expect(page.noteText).toBe('');
    expect(page.selectedId()).toBe('');
    expect(page.entryId).toBe('second');
  });

  it('renders the real journal and exposes the historical form and half-star choice through the UI', async () => {
    const fixture = TestBed.createComponent(BookPage);
    fixture.componentInstance.entryId = 'entry';
    await fixture.componentInstance.load();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('A quiet, moving novel.');
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    buttons.find((button) => button.textContent?.trim() === 'Log a finished read')!.click();
    fixture.detectChanges();
    const form: HTMLFormElement = fixture.nativeElement.querySelector('.finished-form');
    expect(form).toBeTruthy();
    const halfStar = form.querySelector<HTMLInputElement>(
      'input[aria-label="Rate 4.5 out of 5 stars"]',
    )!;
    halfStar.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(fixture.componentInstance.finishRating).toBe(4.5);
    expect(halfStar.checked).toBe(true);
    fixture.componentInstance.openEditor('NOTE');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input[name=allowForPersonalization]').checked).toBe(
      false,
    );
    expect(fixture.nativeElement.querySelector('textarea').getAttribute('maxlength')).toBe('20000');
  });
});
