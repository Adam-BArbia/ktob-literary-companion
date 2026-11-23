import { HttpClient } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { AuthRequiredError } from './auth-required.error';

export interface KtobRuntimeConfig {
  apiBaseUrl: string;
  supabaseUrl?: string;
  supabasePublishableKey?: string;
}

export type AuthStatus = 'loading' | 'ready' | 'unconfigured' | 'error';

function isMissingSession(error: { name?: string; code?: string }): boolean {
  return (
    error.name === 'AuthSessionMissingError' ||
    [
      'session_not_found',
      'session_expired',
      'refresh_token_not_found',
      'refresh_token_already_used',
    ].includes(error.code ?? '')
  );
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private client?: SupabaseClient;
  private authSubscription?: { unsubscribe(): void };
  private pending?: Promise<void>;
  private runtime?: KtobRuntimeConfig;
  readonly user = signal<User | null>(null);
  readonly status = signal<AuthStatus>('loading');

  constructor() {
    this.destroyRef.onDestroy(() => void this.disposeClient());
  }

  ensureReady(): Promise<void> {
    this.pending ??= this.initialize();
    return this.pending;
  }

  retry(): Promise<void> {
    if (this.status() === 'loading' || this.status() === 'ready') return this.ensureReady();
    this.status.set('loading');
    this.pending = this.initialize();
    return this.pending;
  }

  private async initialize(): Promise<void> {
    try {
      const config = await firstValueFrom(
        this.http.get<KtobRuntimeConfig>('/ktob-config.json').pipe(timeout(8000)),
      );
      if (this.destroyRef.destroyed) return;
      if (
        !/^https:\/\/[^\s]+\/api\/v1$/.test(config.apiBaseUrl) &&
        !/^http:\/\/localhost:\d+\/api\/v1$/.test(config.apiBaseUrl)
      ) {
        throw new Error('Invalid API configuration');
      }
      this.runtime = config;
      if (
        !config.supabaseUrl ||
        !config.supabasePublishableKey ||
        !/^https:\/\/[^\s]+\.supabase\.co$/.test(config.supabaseUrl) ||
        !config.supabasePublishableKey.startsWith('sb_publishable_')
      ) {
        this.status.set('unconfigured');
        return;
      }
      const { createClient } = await import('@supabase/supabase-js');
      if (this.destroyRef.destroyed) return;
      const client = createClient(config.supabaseUrl, config.supabasePublishableKey, {
        auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
      });
      this.client = client;
      let receivedAuthEvent = false;
      const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
        if (this.destroyRef.destroyed || this.client !== client) return;
        receivedAuthEvent = true;
        this.user.set(session?.user ?? null);
      });
      this.authSubscription = listener.subscription;
      const { data, error } = await client.auth.getSession();
      if (this.destroyRef.destroyed || this.client !== client) return;
      // An expired or revoked stored session should leave sign-in available.
      if (error && !isMissingSession(error)) throw error;
      // A newer cross-tab event must win over an older in-flight session read.
      if (!receivedAuthEvent) this.user.set(error ? null : (data.session?.user ?? null));
      this.status.set('ready');
    } catch {
      await this.disposeClient();
      this.user.set(null);
      this.status.set('error');
    }
  }

  private async disposeClient(): Promise<void> {
    this.authSubscription?.unsubscribe();
    this.authSubscription = undefined;
    const client = this.client;
    this.client = undefined;
    // Stop refresh timers and cross-tab listeners without signing the reader out.
    await client?.auth.dispose();
  }

  apiBaseUrl(): string {
    if (!this.runtime) throw new Error('KTOB runtime configuration unavailable');
    return this.runtime.apiBaseUrl.replace(/\/+$/, '');
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.ensureReady();
    if (!this.client) throw new Error('KTOB authentication has not been configured.');
    const { data, error } = await this.client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
    this.user.set(data.user);
  }

  async signUp(email: string, password: string): Promise<boolean> {
    await this.ensureReady();
    if (!this.client) throw new Error('KTOB authentication has not been configured.');
    const { data, error } = await this.client.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: this.confirmationRedirect() },
    });
    if (error) throw error;
    if (data.session) this.user.set(data.session.user);
    return data.session === null; // email verification may be required
  }

  async resendConfirmation(email: string): Promise<void> {
    await this.ensureReady();
    if (!this.client) throw new Error('KTOB authentication has not been configured.');
    const { error } = await this.client.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: this.confirmationRedirect() },
    });
    if (error) throw error;
  }

  private confirmationRedirect(): string {
    return new URL('/auth', this.document.location.origin).href;
  }

  async accessToken(): Promise<string> {
    await this.ensureReady();
    if (!this.client) throw new Error('KTOB authentication has not been configured.');
    const { data, error } = await this.client.auth.getSession();
    if (error) {
      if (isMissingSession(error)) {
        this.user.set(null);
        throw new AuthRequiredError();
      }
      throw new Error('We could not check your session. Check your connection and try again.');
    }
    if (
      !data.session?.access_token ||
      (data.session.expires_at !== undefined &&
        data.session.expires_at <= Math.floor(Date.now() / 1000))
    ) {
      this.user.set(null);
      throw new AuthRequiredError();
    }
    return data.session.access_token;
  }

  async signOut(): Promise<void> {
    if (!this.client) return;
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
    this.user.set(null);
  }
}
