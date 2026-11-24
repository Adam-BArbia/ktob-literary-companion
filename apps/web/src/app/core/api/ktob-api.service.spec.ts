import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { KtobApiService, isAuthFailure } from './ktob-api.service';
import { AuthService } from '../auth/auth.service';
import { AuthRequiredError } from '../auth/auth-required.error';
import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import type { User } from '@supabase/supabase-js';

describe('KtobApiService secure requests', () => {
  let api: KtobApiService;
  let http: HttpTestingController;
  const user = signal<User | null>({ id: 'reader-a' } as User);
  const sessionRevision = signal(0);
  let sessionInvalidated: Subject<void>;
  beforeEach(() => {
    user.set({ id: 'reader-a' } as User);
    sessionRevision.set(0);
    sessionInvalidated = new Subject<void>();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            user,
            sessionRevision,
            sessionInvalidated,
            accessToken: async () => 'test-token-only',
            apiBaseUrl: () => 'http://localhost:8080/api/v1',
          },
        },
      ],
    });
    api = TestBed.inject(KtobApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  function changeReader(id: string | null): void {
    user.set(id ? ({ id } as User) : null);
    sessionRevision.update((value) => value + 1);
    sessionInvalidated.next();
  }

  it('sends a token only to the configured Java API', async () => {
    const pending = api.listLibrary();
    await Promise.resolve();
    await Promise.resolve();
    const req = http.expectOne('http://localhost:8080/api/v1/library?includeArchived=false');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token-only');
    req.flush({ data: [], meta: { nextCursor: null } });
    expect((await pending).data).toEqual([]);
  });

  it('restores using the explicit restore endpoint', async () => {
    const pending = api.restoreEntry('6d35bdde-6cf5-4107-92e6-32e312e5025b');
    await Promise.resolve();
    await Promise.resolve();
    const req = http.expectOne(
      'http://localhost:8080/api/v1/library/6d35bdde-6cf5-4107-92e6-32e312e5025b/restore',
    );
    expect(req.request.method).toBe('POST');
    req.flush({ data: { id: 'ok' } });
    expect((await pending).data.id).toBe('ok');
  });

  it('sends the trimmed profile name to the authenticated profile endpoint', async () => {
    const pending = api.updateProfile('  Adam  ');
    await Promise.resolve();
    await Promise.resolve();
    const req = http.expectOne('http://localhost:8080/api/v1/me');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ displayName: 'Adam' });
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token-only');
    req.flush({ data: { id: 'reader', displayName: 'Adam' } });
    expect((await pending).data.displayName).toBe('Adam');
  });

  it('recognizes a missing local session without sending a backend request', async () => {
    vi.spyOn(TestBed.inject(AuthService), 'accessToken').mockRejectedValue(new AuthRequiredError());
    try {
      await api.listLibrary();
      throw new Error('Expected authentication failure');
    } catch (error) {
      expect(isAuthFailure(error)).toBe(true);
    }
    http.expectNone((request) => request.url.includes('/library'));
  });

  it('clears a reading rating with explicit null and sends no unrelated status change', async () => {
    const pending = api.updateExperience('reading', { rating: null });
    await Promise.resolve();
    await Promise.resolve();
    const req = http.expectOne('http://localhost:8080/api/v1/experiences/reading');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ rating: null });
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token-only');
    req.flush({ data: { id: 'reading', rating: null } });
    expect((await pending).data.rating).toBeNull();
  });

  it('keeps a private note in the authenticated Java service with its explicit exclusion flag', async () => {
    const body = {
      kind: 'QUOTE' as const,
      body: 'Private quotation',
      emotionTags: [],
      allowForPersonalization: false,
    };
    const pending = api.createJournal('reading', body);
    await Promise.resolve();
    await Promise.resolve();
    const req = http.expectOne('http://localhost:8080/api/v1/experiences/reading/journal');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({
      data: { ...body, id: 'note', experienceId: 'reading', createdAt: '2026-01-01T00:00:00Z' },
    });
    expect((await pending).data.allowForPersonalization).toBe(false);
  });

  it('patches favorite independently and reads bounded cursor pages', async () => {
    const favorite = api.setFavorite('entry', true);
    await Promise.resolve();
    await Promise.resolve();
    const patch = http.expectOne('http://localhost:8080/api/v1/library/entry');
    expect(patch.request.body).toEqual({ favorite: true });
    patch.flush({ data: { id: 'entry', favorite: true } });
    await favorite;
    const page = api.journal('reading', 'opaque+cursor');
    await Promise.resolve();
    await Promise.resolve();
    const req = http.expectOne((r) => r.url.endsWith('/experiences/reading/journal'));
    expect(req.request.params.get('limit')).toBe('100');
    expect(req.request.params.get('cursor')).toBe('opaque+cursor');
    req.flush({ data: [], meta: { nextCursor: null } });
    await page;
  });

  it('keeps AI processing permission separate from personalization in the authenticated Java API', async () => {
    const pending = api.updatePrivacy({ aiProcessingOptIn: true });
    await Promise.resolve();
    await Promise.resolve();
    const req = http.expectOne('http://localhost:8080/api/v1/me/privacy');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ aiProcessingOptIn: true });
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token-only');
    req.flush({ data: { aiProcessingOptIn: true, personalizationOptIn: false } });
    expect((await pending).data.personalizationOptIn).toBe(false);
  });

  it('sends a stable turn key and exact spoiler request to Java, never directly to the model provider', async () => {
    const body = {
      body: 'A literary question.',
      spoilerLevel: 'NO_SPOILERS' as const,
      fullBookSpoilersConfirmed: false,
    };
    const key = 'bd6b0b0e-26be-4ea4-a930-ef4bdc55e4c6';
    const pending = api.sendMessage('conversation/id', body, key);
    await Promise.resolve();
    await Promise.resolve();
    const req = http.expectOne(
      'http://localhost:8080/api/v1/conversations/conversation%2Fid/messages',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Idempotency-Key')).toBe(key);
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token-only');
    expect(req.request.body).toEqual(body);
    expect(req.request.body).not.toHaveProperty('usePersonalContext');
    req.flush({
      data: {
        userMessage: { id: 'reader' },
        assistantMessage: { id: 'assistant' },
        proposalIds: [],
        spoilerLevel: 'NO_SPOILERS',
      },
    });
    expect((await pending).data.assistantMessage.id).toBe('assistant');
    http.expectNone((request) => request.url.includes('groq.com'));
  });

  it('never sends a previous reader’s conversation title or privacy change using a new reader’s token', async () => {
    let tokenReady!: (token: string) => void;
    const token = new Promise<string>((resolve) => (tokenReady = resolve));
    vi.spyOn(TestBed.inject(AuthService), 'accessToken').mockReturnValue(token);
    const conversation = api.createConversation({ kind: 'GENERAL', title: 'Private draft title' });
    const privacy = api.updatePrivacy({ aiProcessingOptIn: true });
    changeReader('reader-b');
    tokenReady('new-reader-token');
    await expect(conversation).rejects.toBeInstanceOf(AuthRequiredError);
    await expect(privacy).rejects.toBeInstanceOf(AuthRequiredError);
    http.expectNone(() => true);
  });

  it('invalidates a queued mutation even if sign-out is followed by the same reader', async () => {
    let tokenReady!: (token: string) => void;
    vi.spyOn(TestBed.inject(AuthService), 'accessToken').mockReturnValue(
      new Promise((resolve) => (tokenReady = resolve)),
    );
    const pending = api.updateProfile('Private unsaved name');
    changeReader(null);
    user.set({ id: 'reader-a' } as User);
    tokenReady('new-session-for-the-same-reader');
    await expect(pending).rejects.toBeInstanceOf(AuthRequiredError);
    http.expectNone(() => true);
  });

  it('cancels an in-flight private history read as soon as the reader changes', async () => {
    const pending = api.conversations();
    await Promise.resolve();
    await Promise.resolve();
    const req = http.expectOne('http://localhost:8080/api/v1/conversations?limit=100');
    changeReader('reader-b');
    expect(req.cancelled).toBe(true);
    await expect(pending).rejects.toBeInstanceOf(AuthRequiredError);
    expect(() => req.flush({ data: [{ title: 'Previous reader private title' }] })).toThrow();
  });

  it('rejects an already received private response if its delivery races with account change', async () => {
    const pending = api.privacy();
    await Promise.resolve();
    await Promise.resolve();
    http.expectOne('http://localhost:8080/api/v1/me/privacy').flush({
      data: { aiProcessingOptIn: true },
    });
    changeReader('reader-b');
    await expect(pending).rejects.toBeInstanceOf(AuthRequiredError);
  });

  it('allows a refreshed token for the same reader without losing their pending work', async () => {
    let tokenReady!: (token: string) => void;
    vi.spyOn(TestBed.inject(AuthService), 'accessToken').mockReturnValue(
      new Promise((resolve) => (tokenReady = resolve)),
    );
    const pending = api.updateProfile('Still the same reader');
    user.set({ id: 'reader-a', email: 'reader@example.com' } as User);
    tokenReady('refreshed-reader-a-token');
    await Promise.resolve();
    await Promise.resolve();
    const req = http.expectOne('http://localhost:8080/api/v1/me');
    expect(req.request.headers.get('Authorization')).toBe('Bearer refreshed-reader-a-token');
    req.flush({ data: { id: 'reader-a', displayName: 'Still the same reader' } });
    expect((await pending).data.displayName).toBe('Still the same reader');
  });
});
