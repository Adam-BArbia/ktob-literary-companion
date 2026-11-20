import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, map, of, switchMap, timeout } from 'rxjs';

export type HealthState = 'checking' | 'online' | 'offline';

interface RuntimeConfig {
  apiBaseUrl: string;
}

interface HealthResponse {
  status: 'ok';
}

/**
 * The only integrated backend capability in Sprint 0.
 * No fake business data or hidden credentials.
 */
@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly http = inject(HttpClient);
  readonly state = signal<HealthState>('checking');

  check(): void {
    this.state.set('checking');
    this.http.get<RuntimeConfig>('/ktob-config.json', { headers: { 'Cache-Control': 'no-cache' } }).pipe(
      timeout(8000),
      switchMap(config => {
        if (!/^https?:\/\//.test(config.apiBaseUrl) && !config.apiBaseUrl.startsWith('/')) {
          throw new Error('Invalid KTOB API URL');
        }
        const base = config.apiBaseUrl.replace(/\/+$/, '');
        return this.http.get<HealthResponse>(`${base}/health`).pipe(timeout(8000));
      }),
      map(response => response.status === 'ok' ? 'online' as const : 'offline' as const),
      catchError(() => of('offline' as const))
    ).subscribe(status => this.state.set(status));
  }
}
