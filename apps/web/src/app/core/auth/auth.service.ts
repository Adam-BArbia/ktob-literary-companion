import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

export interface KtobRuntimeConfig {
  apiBaseUrl: string;
  supabaseUrl?: string;
  supabasePublishableKey?: string;
}

export type AuthStatus = 'loading' | 'ready' | 'unconfigured' | 'error';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private client?: SupabaseClient;
  private pending?: Promise<void>;
  private runtime?: KtobRuntimeConfig;
  readonly user = signal<User | null>(null);
  readonly status = signal<AuthStatus>('loading');

  ensureReady(): Promise<void> {
    this.pending ??= this.initialize();
    return this.pending;
  }

  private async initialize(): Promise<void> {
    try {
      const config = await firstValueFrom(
        this.http.get<KtobRuntimeConfig>('/ktob-config.json').pipe(timeout(8000))
      );
      if (!/^https:\/\/[^\s]+\/api\/v1$/.test(config.apiBaseUrl) &&
          !/^http:\/\/localhost:\d+\/api\/v1$/.test(config.apiBaseUrl)) {
        throw new Error('Invalid API configuration');
      }
      this.runtime = config;
      if (!config.supabaseUrl || !config.supabasePublishableKey ||
          !/^https:\/\/[^\s]+\.supabase\.co$/.test(config.supabaseUrl) ||
          !config.supabasePublishableKey.startsWith('sb_publishable_')) {
        this.status.set('unconfigured');
        return;
      }
      this.client = createClient(config.supabaseUrl, config.supabasePublishableKey, {
        auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
      });
      const { data, error } = await this.client.auth.getSession();
      if (error) throw error;
      this.user.set(data.session?.user ?? null);
      this.client.auth.onAuthStateChange((_event, session) => {
        this.user.set(session?.user ?? null);
      });
      this.status.set('ready');
    } catch {
      this.status.set('error');
    }
  }

  apiBaseUrl(): string {
    if (!this.runtime) throw new Error('KTOB runtime configuration unavailable');
    return this.runtime.apiBaseUrl.replace(/\/+$/, '');
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.ensureReady();
    if (!this.client) throw new Error('KTOB authentication has not been configured.');
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    this.user.set(data.user);
  }

  async signUp(email: string, password: string): Promise<boolean> {
    await this.ensureReady();
    if (!this.client) throw new Error('KTOB authentication has not been configured.');
    const { data, error } = await this.client.auth.signUp({ email, password });
    if (error) throw error;
    if (data.session) this.user.set(data.session.user);
    return data.session === null; // email verification may be required
  }

  async accessToken(): Promise<string> {
    await this.ensureReady();
    if (!this.client) throw new Error('KTOB authentication has not been configured.');
    const { data, error } = await this.client.auth.getSession();
    if (error || !data.session?.access_token) throw new Error('Please sign in to continue.');
    return data.session.access_token;
  }

  async signOut(): Promise<void> {
    if (!this.client) return;
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
    this.user.set(null);
  }
}
