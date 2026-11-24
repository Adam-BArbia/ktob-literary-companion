import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of } from 'rxjs';
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
  notes: [{
    username: 'reader_one',
    displayName: 'Reader One',
    kind: 'REVIEW',
    body: '**Contains spoilers!** <script>alert(1)</script>',
    createdAt: '2026-11-24T06:00:00Z',
  }],
};

describe('Book preview before saving to a library', () => {
  const api = {
    workById: vi.fn(),
    bookCommunity: vi.fn(),
    addToLibrary: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    api.workById.mockResolvedValue({ data: book });
    api.bookCommunity.mockResolvedValue({ data: shared });
    TestBed.configureTestingModule({
      imports: [BookPreviewPage],
      providers: [
        provideRouter([]),
        { provide: KtobApiService, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ workId: book.id })) },
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
    fixture.componentInstance.toggleSpoiler(0);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('**Contains spoilers!**');
    expect(fixture.nativeElement.querySelector('script')).toBeNull();
    fixture.componentInstance.toggleSpoiler(0);
    fixture.detectChanges();
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
});
