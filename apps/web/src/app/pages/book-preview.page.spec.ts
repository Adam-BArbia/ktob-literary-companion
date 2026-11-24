import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, of } from 'rxjs';
import { BookPreviewPage } from './book-preview.page';
import { BookCommunityPreview, BookWork, KtobApiService } from '../core/api/ktob-api.service';

const book: BookWork = {
  id: '12345678-1234-4123-8123-123456789abc',
  title: 'An Open Library Novel',
  authors: ['A. Novelist'],
  origin: 'OPEN_LIBRARY',
  language: 'eng',
  catalogReference: '/works/OL99999W',
  metadataStatus: 'AVAILABLE',
  ownerReaderId: null,
};

const shared: BookCommunityPreview = {
  workId: book.id,
  averageRating: 4.5,
  ratingCount: 1,
  ratings: [{ username: 'reader_one', displayName: 'Reader One', rating: 4.5 }],
  notes: [
    {
      username: 'reader_one',
      displayName: 'Reader One',
      kind: 'REVIEW',
      body: '**Contains spoilers!** <script>alert(1)</script>',
      createdAt: '2026-11-24T06:00:00Z',
    },
  ],
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('Book preview before saving to a library', () => {
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  const api = {
    workById: vi.fn(),
    bookCommunity: vi.fn(),
    addToLibrary: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    params = new BehaviorSubject(convertToParamMap({ workId: book.id }));
    api.workById.mockResolvedValue({ data: book });
    api.bookCommunity.mockResolvedValue({ data: shared });
    TestBed.configureTestingModule({
      imports: [BookPreviewPage],
      providers: [
        provideRouter([]),
        { provide: KtobApiService, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: params,
            queryParamMap: of(convertToParamMap({ q: 'A literary search' })),
          },
        },
      ],
    });
  });

  it('shows book metadata, community average and real private-to-reader add action', async () => {
    const fixture = TestBed.createComponent(BookPreviewPage);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('An Open Library Novel');
    expect(fixture.nativeElement.textContent).toContain('4.5');
    expect(fixture.nativeElement.textContent).toContain('1 reader');
    expect(fixture.nativeElement.textContent).toContain('Add to my library');
    expect(fixture.nativeElement.querySelector('.back-link').getAttribute('href')).toBe(
      '/catalog/search?q=A%20literary%20search',
    );
    api.addToLibrary.mockResolvedValue({ data: { id: 'entry' } });
    await fixture.componentInstance.add();
    fixture.detectChanges();
    expect(api.addToLibrary).toHaveBeenCalledWith(book.id);
    expect(fixture.nativeElement.textContent).toContain('Added to your shelf');
  });

  it('never displays a published note until revealed and keeps script inert', async () => {
    const fixture = TestBed.createComponent(BookPreviewPage);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Contains spoilers!');
    expect(fixture.nativeElement.querySelector('script')).toBeNull();
    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[aria-controls="community-note-0"]',
    );
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.textContent).toContain('**Contains spoilers!**');
    expect(fixture.nativeElement.querySelector('script')).toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-controls="community-note-0"]')).toBe(toggle);
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.textContent).not.toContain('Contains spoilers!');
  });

  it('never requests community reviews for private manual works', async () => {
    api.workById.mockResolvedValue({
      data: { ...book, origin: 'MANUAL', ownerReaderId: 'reader-one', catalogReference: null },
    });
    const fixture = TestBed.createComponent(BookPreviewPage);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.bookCommunity).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Private manual books');
    expect(fixture.nativeElement.textContent).toContain('entered by you');
    expect(fixture.nativeElement.textContent).not.toContain(
      'Book information comes from Open Library',
    );
  });

  it('retains book and add action when only social data is unavailable', async () => {
    api.bookCommunity.mockRejectedValue(new HttpErrorResponse({ status: 503 }));
    const fixture = TestBed.createComponent(BookPreviewPage);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('An Open Library Novel');
    expect(fixture.nativeElement.textContent).toContain('temporarily unavailable');
    expect(fixture.nativeElement.textContent).toContain('Add to my library');
  });

  it('does not claim duplicate private shelf additions succeeded', async () => {
    api.addToLibrary.mockRejectedValue(new HttpErrorResponse({ status: 409 }));
    const fixture = TestBed.createComponent(BookPreviewPage);
    await fixture.whenStable();
    await fixture.componentInstance.add();
    fixture.detectChanges();
    expect(fixture.componentInstance.added()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Already on your shelf');
    expect(fixture.nativeElement.textContent).toContain('Open my library');
  });

  it('shows metadata and allows saving while community data is still loading', async () => {
    const pendingCommunity = deferred<{ data: BookCommunityPreview }>();
    api.bookCommunity.mockReturnValue(pendingCommunity.promise);
    api.addToLibrary.mockResolvedValue({ data: { id: 'entry' } });
    const fixture = TestBed.createComponent(BookPreviewPage);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(book.title);
    expect(fixture.nativeElement.textContent).toContain("Loading readers' ratings and notes");
    expect(fixture.componentInstance.loading()).toBe(false);
    await fixture.componentInstance.add();
    expect(fixture.componentInstance.added()).toBe(true);
    pendingCommunity.resolve({ data: shared });
    await fixture.whenStable();
    expect(fixture.componentInstance.communityLoading()).toBe(false);
  });

  it('preserves a successful shelf addition when retrying community data', async () => {
    api.bookCommunity.mockRejectedValueOnce(new HttpErrorResponse({ status: 503 }));
    api.addToLibrary.mockResolvedValue({ data: { id: 'entry' } });
    const fixture = TestBed.createComponent(BookPreviewPage);
    await fixture.whenStable();
    await fixture.componentInstance.add();
    await fixture.componentInstance.retryCommunity();
    fixture.detectChanges();
    expect(api.workById).toHaveBeenCalledTimes(1);
    expect(api.bookCommunity).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.added()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Added to your shelf');
    expect(fixture.componentInstance.socialError()).toBe('');
    expect(fixture.componentInstance.community()).toEqual(shared);
  });

  it('cannot mark the next book as saved or clear its pending save from an older response', async () => {
    const firstSave = deferred<unknown>();
    const nextSave = deferred<unknown>();
    api.addToLibrary.mockReturnValueOnce(firstSave.promise).mockReturnValueOnce(nextSave.promise);
    const fixture = TestBed.createComponent(BookPreviewPage);
    await fixture.whenStable();
    const firstRequest = fixture.componentInstance.add();
    const nextBook = { ...book, id: 'next-work', title: 'The Next Book' };
    api.workById.mockResolvedValue({ data: nextBook });
    params.next(convertToParamMap({ workId: nextBook.id }));
    await fixture.whenStable();
    expect(fixture.componentInstance.adding()).toBe(false);
    expect(fixture.componentInstance.added()).toBe(false);
    const nextRequest = fixture.componentInstance.add();
    firstSave.resolve({ data: { id: 'first-entry' } });
    await firstRequest;
    expect(fixture.componentInstance.added()).toBe(false);
    expect(fixture.componentInstance.adding()).toBe(true);
    nextSave.resolve({ data: { id: 'next-entry' } });
    await nextRequest;
    expect(api.addToLibrary).toHaveBeenNthCalledWith(2, nextBook.id);
    expect(fixture.componentInstance.added()).toBe(true);
    expect(fixture.componentInstance.adding()).toBe(false);
  });

  it('ignores errors from an old book addition after navigation', async () => {
    const pendingSave = deferred<unknown>();
    api.addToLibrary.mockReturnValue(pendingSave.promise);
    const fixture = TestBed.createComponent(BookPreviewPage);
    await fixture.whenStable();
    const pendingRequest = fixture.componentInstance.add();
    api.workById.mockResolvedValue({ data: { ...book, id: 'next-work' } });
    params.next(convertToParamMap({ workId: 'next-work' }));
    await fixture.whenStable();
    pendingSave.reject(new HttpErrorResponse({ status: 409 }));
    await pendingRequest;
    expect(fixture.componentInstance.addError()).toBe('');
    expect(fixture.componentInstance.duplicate()).toBe(false);
    expect(fixture.componentInstance.authExpired()).toBe(false);
  });

  it("never displays another work's delayed community response after navigation", async () => {
    const pendingCommunity = deferred<{ data: BookCommunityPreview }>();
    api.bookCommunity.mockReturnValueOnce(pendingCommunity.promise);
    const fixture = TestBed.createComponent(BookPreviewPage);
    await fixture.whenStable();
    const nextBook = { ...book, id: 'next-work', title: 'The Next Book' };
    const nextCommunity = {
      ...shared,
      workId: nextBook.id,
      averageRating: null,
      ratingCount: 0,
      ratings: [],
      notes: [],
    };
    api.workById.mockResolvedValue({ data: nextBook });
    api.bookCommunity.mockResolvedValue({ data: nextCommunity });
    params.next(convertToParamMap({ workId: nextBook.id }));
    await fixture.whenStable();
    pendingCommunity.resolve({ data: shared });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.community()).toEqual(nextCommunity);
    expect(fixture.nativeElement.textContent).toContain('No published reviews or notes');
    expect(fixture.nativeElement.textContent).not.toContain('Reader One');
  });

  it('shows honest empty states and exposes preview limits when lists are capped', async () => {
    api.bookCommunity.mockResolvedValueOnce({
      data: { ...shared, averageRating: null, ratingCount: 0, ratings: [], notes: [] },
    });
    const fixture = TestBed.createComponent(BookPreviewPage);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Not rated publicly yet');
    expect(fixture.nativeElement.textContent).toContain('There are no public ratings yet');
    expect(fixture.nativeElement.querySelector('.community-score')).toBeNull();
    api.bookCommunity.mockResolvedValue({
      data: {
        ...shared,
        ratingCount: 201,
        notes: Array.from({ length: 30 }, () => shared.notes[0]),
      },
    });
    await fixture.componentInstance.retryCommunity();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Latest 30 shared notes');
    expect(fixture.nativeElement.textContent).toContain('Showing 1 of 201 public ratings');
  });
});
