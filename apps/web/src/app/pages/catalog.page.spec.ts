import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { CatalogPage } from './catalog.page';
import { BookWork, KtobApiService } from '../core/api/ktob-api.service';

const work: BookWork = {
  id: 'private-work',
  title: 'A Reader’s Notebook',
  authors: ['A. Reader'],
  origin: 'MANUAL',
  language: null,
  catalogReference: null,
  metadataStatus: 'UNKNOWN',
  ownerReaderId: 'reader-a',
};

describe('Catalog reader workflows', () => {
  const api = { searchWorks: vi.fn(), addToLibrary: vi.fn(), createManualWork: vi.fn() };

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      imports: [CatalogPage],
      providers: [provideRouter([]), { provide: KtobApiService, useValue: api }],
    });
  });

  it('opens a canonical preview with its search context without adding the book', async () => {
    const fixture = TestBed.createComponent(CatalogPage);
    const canonical = {
      ...work,
      id: '00000000-0000-4000-8000-000000000001',
      origin: 'OPEN_LIBRARY' as const,
      ownerReaderId: null,
    };
    fixture.componentInstance.books.set([canonical, work]);
    fixture.componentInstance.searched.set(true);
    fixture.componentInstance.lastQuery.set('Jane Austen & classics');
    fixture.detectChanges();
    await fixture.whenStable();

    const cards = fixture.nativeElement.querySelectorAll('.result-card') as NodeListOf<HTMLElement>;
    for (const link of cards[0].querySelectorAll('a')) {
      const url = new URL(link.href);
      expect(url.pathname).toBe('/discover/works/' + canonical.id);
      expect(url.searchParams.get('q')).toBe('Jane Austen & classics');
    }
    expect(cards[0].textContent).toContain('Explore book & community');
    expect(cards[1].textContent).toContain('Explore your book');
    expect(cards[1].textContent).not.toContain('Explore book & community');
    expect(api.addToLibrary).not.toHaveBeenCalled();
  });

  it('retries adding the existing manual work after a partial network failure', async () => {
    const page = TestBed.createComponent(CatalogPage).componentInstance;
    api.createManualWork.mockResolvedValue({ data: work });
    api.addToLibrary
      .mockRejectedValueOnce(new HttpErrorResponse({ status: 503 }))
      .mockResolvedValueOnce({ data: { id: 'entry' } });
    page.manualTitle = work.title;
    page.manualAuthor = work.authors[0];

    await page.createManual();
    expect(page.manualError()).toContain('entry was saved');
    expect(page.manualTitle).toBe(work.title);
    await page.createManual();

    expect(api.createManualWork).toHaveBeenCalledTimes(1);
    expect(api.addToLibrary).toHaveBeenNthCalledWith(2, work.id);
    expect(page.manualNotice()).toContain('saved to your private library');
    expect(page.manualTitle).toBe('');
  });

  it('shows the existing library path for a duplicate without claiming an addition', async () => {
    const fixture = TestBed.createComponent(CatalogPage);
    fixture.componentInstance.books.set([work]);
    fixture.componentInstance.searched.set(true);
    api.addToLibrary.mockRejectedValue(new HttpErrorResponse({ status: 409 }));
    await fixture.componentInstance.add(work);
    fixture.detectChanges();

    expect(fixture.componentInstance.notice()).toBe('');
    expect(fixture.componentInstance.added().has(work.id)).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('already in your library');
    expect(fixture.nativeElement.querySelector('a[href="/library"]').textContent).toContain(
      'Open my library',
    );
    expect(fixture.componentInstance.searching()).toBe(false);
  });

  it('keeps failed additions beside their book and allows retry without losing results', async () => {
    const fixture = TestBed.createComponent(CatalogPage);
    const page = fixture.componentInstance;
    page.books.set([work]);
    page.searched.set(true);
    api.addToLibrary
      .mockRejectedValueOnce(new HttpErrorResponse({ status: 503 }))
      .mockResolvedValueOnce({ data: { id: 'entry' } });
    await page.add(work);
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('.result-card') as HTMLElement;
    expect(card.querySelector('[role="alert"]')?.textContent).toContain('temporarily unavailable');
    expect(card.querySelector('button')?.getAttribute('aria-describedby')).toBe(
      'book-error-' + work.id,
    );
    expect(page.books()).toEqual([work]);
    await page.add(work);
    fixture.detectChanges();
    expect(card.querySelector('[role="alert"]')).toBeNull();
    expect(card.textContent).toContain('On your shelf');
  });

  it('focuses manual entry when opened and returns focus to its toggle when closed', async () => {
    const fixture = TestBed.createComponent(CatalogPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.openManual();
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('#manual-title'));
    fixture.componentInstance.toggleManual();
    fixture.detectChanges();
    expect(document.activeElement).toBe(
      fixture.nativeElement.querySelector('[aria-controls="manual-form-panel"]'),
    );
    expect(fixture.nativeElement.querySelector('#manual-form-panel').hidden).toBe(true);
  });

  it('does not create an empty manual book', async () => {
    const page = TestBed.createComponent(CatalogPage).componentInstance;
    page.manualTitle = '  ';
    await page.createManual();
    expect(api.createManualWork).not.toHaveBeenCalled();
    expect(page.manualAttempted()).toBe(true);
  });

  it('opens a linked manual form and responds to a changed query on a reused route', async () => {
    const params = new BehaviorSubject(convertToParamMap({ manual: 'true', q: 'Jane Austen' }));
    const route = TestBed.inject(ActivatedRoute);
    vi.spyOn(route, 'queryParamMap', 'get').mockReturnValue(params.asObservable());
    api.searchWorks.mockResolvedValue({ data: [] });
    const fixture = TestBed.createComponent(CatalogPage);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.manualOpen()).toBe(true);
    expect(api.searchWorks).toHaveBeenCalledWith('Jane Austen');
    params.next(convertToParamMap({ q: 'Poetry' }));
    await fixture.whenStable();
    expect(api.searchWorks).toHaveBeenLastCalledWith('Poetry');
    expect(fixture.componentInstance.lastQuery()).toBe('Poetry');
  });

  it('focuses the first invalid manual field and resets its touched state after saving', async () => {
    const fixture = TestBed.createComponent(CatalogPage);
    const page = fixture.componentInstance;
    page.manualOpen.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#manual-title');
    await page.createManual();
    fixture.detectChanges();
    expect(document.activeElement).toBe(input);
    expect(fixture.nativeElement.textContent).toContain('Check the highlighted fields');

    api.createManualWork.mockResolvedValue({ data: work });
    api.addToLibrary.mockResolvedValue({ data: { id: 'entry' } });
    page.manualTitle = work.title;
    input.dispatchEvent(new Event('blur'));
    await page.createManual();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(input.getAttribute('aria-invalid')).toBe('false');
    expect(fixture.nativeElement.querySelector('#manual-title-error').textContent.trim()).toBe('');
  });
});
