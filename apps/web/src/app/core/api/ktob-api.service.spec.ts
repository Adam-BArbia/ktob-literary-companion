import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { KtobApiService, isAuthFailure } from './ktob-api.service';
import { AuthService } from '../auth/auth.service';
import { AuthRequiredError } from '../auth/auth-required.error';

describe('KtobApiService secure requests', () => {
  let api: KtobApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
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
});
