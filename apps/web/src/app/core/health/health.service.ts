import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Subscription, catchError, map, of, switchMap, timeout } from 'rxjs';

export type HealthState = 'checking' | 'online' | 'offline';

interface RuntimeConfig {
  apiBaseUrl: string;
}

interface HealthResponse {
  status: 'ok';
}

/** A bounded liveness check; it does not claim database or provider readiness. */
@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly http = inject(HttpClient);
  readonly state = signal<HealthState>('checking');
  private pending?: Subscription;

  check(): void {
    this.pending?.unsubscribe();
    this.state.set('checking');
    this.pending = this.http
      .get<RuntimeConfig>('/ktob-config.json', { headers: { 'Cache-Control': 'no-cache' } })
      .pipe(
        timeout(8000),
        switchMap((config) => {
          if (!/^https?:\/\//.test(config.apiBaseUrl) && !config.apiBaseUrl.startsWith('/')) {
            throw new Error('Invalid KTOB API URL');
          }
          const base = config.apiBaseUrl.replace(/\/+$/, '');
          return this.http.get<HealthResponse>(`${base}/health`).pipe(timeout(75000));
        }),
        map((response) => (response.status === 'ok' ? ('online' as const) : ('offline' as const))),
        catchError(() => of('offline' as const)),
      )
      .subscribe((status) => this.state.set(status));
  }
}
