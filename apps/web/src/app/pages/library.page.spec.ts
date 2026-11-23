import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { LibraryPage } from './library.page';
import { BookWork, KtobApiService, LibraryEntry } from '../core/api/ktob-api.service';

const entry = (id: string, archivedAt: string | null = null): LibraryEntry => ({
  id,
  workId: 'work-' + id,
  preferredEditionId: null,
  shelfStatus: 'WANT_TO_READ',
  favorite: false,
  acquisitionIntention: false,
  createdAt: '2026-01-01T00:00:00Z',
  archivedAt,
});
const first = entry('first');
const archived = entry('archived', '2026-01-02T00:00:00Z');
const works: Record<string, BookWork> = {
  'work-first': {
    id: 'work-first',
    title: 'Persuasion',
    authors: ['Jane Austen'],
    origin: 'OPEN_LIBRARY',
    language: null,
    catalogReference: '/works/OL1W',
    metadataStatus: 'PARTIAL',
    ownerReaderId: null,
  },
  'work-archived': {
    id: 'work-archived',
    title: 'The Odyssey',
    authors: ['Homer'],
    origin: 'OPEN_LIBRARY',
    language: null,
    catalogReference: '/works/OL2W',
    metadataStatus: 'PARTIAL',
    ownerReaderId: null,
  },
};

describe('Library shelf workflows', () => {
  const api = {
    listLibrary: vi.fn(),
    workById: vi.fn(),
    archiveEntry: vi.fn(),
    restoreEntry: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    api.listLibrary.mockResolvedValue({ data: [first, archived] });
    api.workById.mockImplementation(async (id: string) => ({ data: works[id] }));
    TestBed.configureTestingModule({
      imports: [LibraryPage],
      providers: [provideRouter([]), { provide: KtobApiService, useValue: api }],
    });
  });

  it('filters reader books by author and by archive state without fabricated records', async () => {
    const page = TestBed.createComponent(LibraryPage).componentInstance;
    await page.load();
    page.query.set('austen');
    expect(page.visibleEntries().map((item) => item.id)).toEqual(['first']);
    page.setShelf('archived');
    expect(page.visibleEntries()).toEqual([]);
    page.query.set('homer');
    expect(page.visibleEntries().map((item) => item.id)).toEqual(['archived']);
    expect(page.activeCount()).toBe(1);
    expect(page.archivedCount()).toBe(1);
  });

  it('requires archive confirmation and can undo through the restore endpoint', async () => {
    const fixture = TestBed.createComponent(LibraryPage);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    await page.load();
    await fixture.whenStable();
    const dialog: HTMLDialogElement = fixture.nativeElement.querySelector('dialog');
    dialog.showModal = vi.fn();
    dialog.close = vi.fn();
    api.archiveEntry.mockResolvedValue(undefined);
    api.restoreEntry.mockResolvedValue({ data: first });

    page.requestArchive(first, null);
    expect(api.archiveEntry).not.toHaveBeenCalled();
    expect(dialog.showModal).toHaveBeenCalled();
    await page.confirmArchive();
    expect(page.visibleEntries()).toEqual([]);
    expect(page.archivedCount()).toBe(2);
    await page.undoArchive();
    expect(api.restoreEntry).toHaveBeenCalledWith(first.id);
    expect(page.visibleEntries().map((item) => item.id)).toEqual(['first']);
  });

  it('preserves the shelf when the archive request fails', async () => {
    const page = TestBed.createComponent(LibraryPage).componentInstance;
    await page.load();
    page.pendingArchive.set(first);
    api.archiveEntry.mockRejectedValue(new HttpErrorResponse({ status: 503 }));
    await page.confirmArchive();
    expect(page.entries().find((item) => item.id === first.id)?.archivedAt).toBeNull();
    expect(page.lastArchived()).toBeNull();
    expect(page.error()).toBeTruthy();
  });
});
