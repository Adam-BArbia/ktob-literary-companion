import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { AuthRequiredError } from '../auth/auth-required.error';

export interface BookWork {
  id: string;
  title: string;
  authors: string[];
  origin: 'OPEN_LIBRARY' | 'MANUAL';
  language: string | null;
  catalogReference: string | null;
  metadataStatus: 'PARTIAL' | 'AVAILABLE' | 'UNKNOWN';
  ownerReaderId: string | null;
}
export interface LibraryEntry {
  id: string;
  workId: string;
  preferredEditionId: string | null;
  shelfStatus: string;
  favorite: boolean;
  acquisitionIntention: boolean;
  createdAt: string;
  archivedAt: string | null;
}
export interface ReaderProfile {
  id: string;
  displayName: string;
}
export type ReadingStatus = 'CURRENTLY_READING' | 'PAUSED' | 'FINISHED' | 'DID_NOT_FINISH';
export interface ReadingExperience {
  id: string;
  libraryEntryId: string;
  editionId?: string | null;
  status: ReadingStatus;
  startedOn?: string | null;
  finishedOn?: string | null;
  rating?: number | null;
  progressPercent?: number | null;
}
export interface ExperienceWrite {
  status: ReadingStatus;
  historicalImport?: boolean;
  startedOn?: string | null;
  finishedOn?: string | null;
  rating?: number | null;
  progressPercent?: number | null;
}
export type ExperiencePatch = Partial<Omit<ExperienceWrite, 'historicalImport'>>;
export type JournalKind = 'REVIEW' | 'REFLECTION' | 'QUOTE' | 'NOTE' | 'EMOTION';
export interface JournalWrite {
  kind: JournalKind;
  body: string;
  emotionTags: string[];
  allowForPersonalization: boolean;
}
export interface JournalEntry extends JournalWrite {
  id: string;
  experienceId: string;
  createdAt: string;
}
export interface ApiData<T> {
  data: T;
}
export interface ApiPage<T> {
  data: T[];
  meta?: { nextCursor?: string | null };
}

export function isAuthFailure(error: unknown): boolean {
  return (
    error instanceof AuthRequiredError ||
    (error instanceof HttpErrorResponse && error.status === 401)
  );
}

export function apiFailure(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body: unknown = error.error;
    if (body && typeof body === 'object' && 'detail' in body && typeof body.detail === 'string')
      return body.detail;
    if (error.status === 401) return 'Your session has expired. Please sign in again.';
    if (error.status === 503) return 'This service is temporarily unavailable.';
    if (error.status === 429) return 'A few too many requests. Please wait a moment and try again.';
    if (error.status === 0) return 'We could not connect. Check your connection and try again.';
  }
  if (error instanceof Error && error.name === 'TimeoutError')
    return 'The service is taking longer to respond. Please try again in a moment.';
  return error instanceof Error ? error.message : 'Unexpected request error.';
}

@Injectable({ providedIn: 'root' })
export class KtobApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private async request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    params?: HttpParams,
    body?: object,
  ): Promise<T> {
    const token = await this.auth.accessToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return firstValueFrom(
      this.http
        .request<T>(method, this.auth.apiBaseUrl() + path, { headers, params, body })
        .pipe(timeout(75000)),
    );
  }

  profile(): Promise<ApiData<ReaderProfile>> {
    return this.request('GET', '/me');
  }

  updateProfile(displayName: string): Promise<ApiData<ReaderProfile>> {
    return this.request('PATCH', '/me', undefined, { displayName: displayName.trim() });
  }

  workById(id: string): Promise<ApiData<BookWork>> {
    return this.request('GET', '/catalog/works/' + encodeURIComponent(id));
  }

  searchWorks(query: string): Promise<ApiPage<BookWork>> {
    return this.request(
      'GET',
      '/catalog/works',
      new HttpParams().set('q', query.trim()).set('limit', 20),
    );
  }

  createManualWork(title: string, authors: string[]): Promise<ApiData<BookWork>> {
    return this.request('POST', '/catalog/manual-works', undefined, { title, authors });
  }

  listLibrary(
    includeArchived = false,
    cursor?: string,
    limit?: number,
  ): Promise<ApiPage<LibraryEntry>> {
    let params = new HttpParams().set('includeArchived', String(includeArchived));
    if (cursor) params = params.set('cursor', cursor);
    if (limit) params = params.set('limit', limit);
    return this.request('GET', '/library', params);
  }

  addToLibrary(workId: string): Promise<ApiData<LibraryEntry>> {
    return this.request('POST', '/library', undefined, { workId });
  }

  archiveEntry(id: string): Promise<void> {
    return this.request('DELETE', '/library/' + encodeURIComponent(id));
  }

  restoreEntry(id: string): Promise<ApiData<LibraryEntry>> {
    return this.request('POST', '/library/' + encodeURIComponent(id) + '/restore');
  }

  libraryEntry(id: string): Promise<ApiData<LibraryEntry>> {
    return this.request('GET', '/library/' + encodeURIComponent(id));
  }

  setFavorite(id: string, favorite: boolean): Promise<ApiData<LibraryEntry>> {
    return this.request('PATCH', '/library/' + encodeURIComponent(id), undefined, { favorite });
  }

  experiences(entryId: string, cursor?: string): Promise<ApiPage<ReadingExperience>> {
    return this.request(
      'GET',
      '/library/' + encodeURIComponent(entryId) + '/experiences',
      this.pageParams(cursor),
    );
  }

  experience(id: string): Promise<ApiData<ReadingExperience>> {
    return this.request('GET', '/experiences/' + encodeURIComponent(id));
  }

  createExperience(entryId: string, body: ExperienceWrite): Promise<ApiData<ReadingExperience>> {
    return this.request(
      'POST',
      '/library/' + encodeURIComponent(entryId) + '/experiences',
      undefined,
      body,
    );
  }

  updateExperience(id: string, body: ExperiencePatch): Promise<ApiData<ReadingExperience>> {
    return this.request('PATCH', '/experiences/' + encodeURIComponent(id), undefined, body);
  }

  journal(experienceId: string, cursor?: string): Promise<ApiPage<JournalEntry>> {
    return this.request(
      'GET',
      '/experiences/' + encodeURIComponent(experienceId) + '/journal',
      this.pageParams(cursor),
    );
  }

  createJournal(experienceId: string, body: JournalWrite): Promise<ApiData<JournalEntry>> {
    return this.request(
      'POST',
      '/experiences/' + encodeURIComponent(experienceId) + '/journal',
      undefined,
      body,
    );
  }

  updateJournal(id: string, body: Partial<JournalWrite>): Promise<ApiData<JournalEntry>> {
    return this.request('PATCH', '/journal/' + encodeURIComponent(id), undefined, body);
  }

  deleteJournal(id: string): Promise<void> {
    return this.request('DELETE', '/journal/' + encodeURIComponent(id));
  }

  private pageParams(cursor?: string): HttpParams {
    let params = new HttpParams().set('limit', 100);
    if (cursor) params = params.set('cursor', cursor);
    return params;
  }
}
