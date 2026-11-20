import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth/auth.service';

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
export interface ApiData<T> { data: T }
export interface ApiPage<T> { data: T[]; meta?: { nextCursor?: string | null } }

export function apiFailure(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body: unknown = error.error;
    if (body && typeof body === 'object' && 'detail' in body &&
        typeof body.detail === 'string') return body.detail;
    if (error.status === 401) return 'Your session has expired. Please sign in again.';
    if (error.status === 503) return 'This service is temporarily unavailable.';
    if (error.status === 0) return 'Java API unreachable. Please try again.';
  }
  return error instanceof Error ? error.message : 'Unexpected request error.';
}

@Injectable({ providedIn: 'root' })
export class KtobApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private async request<T>(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string,
                           params?: HttpParams, body?: object): Promise<T> {
    const token = await this.auth.accessToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return firstValueFrom(this.http.request<T>(
      method, this.auth.apiBaseUrl() + path, { headers, params, body }
    ));
  }

  profile(): Promise<ApiData<ReaderProfile>> {
    return this.request('GET', '/me');
  }

  searchWorks(query: string): Promise<ApiPage<BookWork>> {
    return this.request('GET', '/catalog/works',
      new HttpParams().set('q', query.trim()).set('limit', 20));
  }

  createManualWork(title: string, authors: string[]): Promise<ApiData<BookWork>> {
    return this.request('POST', '/catalog/manual-works', undefined, { title, authors });
  }

  listLibrary(includeArchived = false): Promise<ApiPage<LibraryEntry>> {
    return this.request('GET', '/library',
      new HttpParams().set('includeArchived', String(includeArchived)));
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
}
