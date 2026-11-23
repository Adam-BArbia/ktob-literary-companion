import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DiaryPage, DiaryReading, readingStatistics } from './diary.page';
import { KtobApiService, LibraryEntry } from '../core/api/ktob-api.service';

const entry: LibraryEntry = {
  id: 'book',
  workId: 'work',
  preferredEditionId: null,
  shelfStatus: 'FINISHED',
  favorite: false,
  acquisitionIntention: false,
  archivedAt: null,
  createdAt: '2026-01-01T00:00:00Z',
};
const row = (id: string, rating: number | null, finishedOn: string | null): DiaryReading => ({
  entry,
  work: null,
  reading: { id, libraryEntryId: 'book', status: 'FINISHED', rating, finishedOn },
});

describe('Reading diary', () => {
  it('counts finished books once while keeping reread ratings and real calendar dates', () => {
    const rows = [
      row('first', 4, '2025-12-31'),
      row('again', 5, '2026-01-01'),
      row('undated', null, null),
    ];
    expect(readingStatistics([entry], rows, 2026)).toEqual({
      library: 1,
      finished: 1,
      reading: 0,
      rated: 2,
      average: '4.5',
      thisYear: 1,
    });
    expect(readingStatistics([], [], 2026)).toEqual({
      library: 0,
      finished: 0,
      reading: 0,
      rated: 0,
      average: '—',
      thisYear: 0,
    });
  });

  it('keeps undated experiences explicit and sorts recorded dates chronologically', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: KtobApiService, useValue: {} }],
    });
    const page = TestBed.createComponent(DiaryPage).componentInstance;
    page.rows.set([
      row('undated', null, null),
      row('earlier', 4, '2026-01-01'),
      row('latest', 5, '2026-11-01'),
    ]);
    expect(page.groups().map((g) => g.key)).toEqual(['2026-11', '2026-01', 'undated']);
    expect(page.groups()[2].label).toBe('Dates not recorded');
    page.filter.set('PAUSED');
    expect(page.groups()).toEqual([]);
  });

  it('discloses partial pagination rather than presenting incomplete lifetime totals', async () => {
    const api = {
      listLibrary: vi.fn().mockResolvedValue({ data: [entry], meta: { nextCursor: 'next-books' } }),
      experiences: vi.fn().mockResolvedValue({ data: [], meta: { nextCursor: null } }),
    };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: KtobApiService, useValue: api }],
    });
    const page = TestBed.createComponent(DiaryPage).componentInstance;
    await page.load();
    expect(page.partial()).toBe(true);
    expect(page.stats().library).toBe(1);
  });
});
