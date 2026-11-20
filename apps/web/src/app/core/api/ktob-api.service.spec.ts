import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { KtobApiService } from './ktob-api.service';
import { AuthService } from '../auth/auth.service';

describe('KtobApiService secure requests', () => {
  let api: KtobApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: AuthService, useValue: {
          accessToken: async () => 'test-token-only',
          apiBaseUrl: () => 'http://localhost:8080/api/v1'
        }}
      ]
    });
    api = TestBed.inject(KtobApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('sends a token only to the configured Java API', async () => {
    const pending = api.listLibrary();
    await Promise.resolve();
    await Promise.resolve();
    const req = http.expectOne(
      'http://localhost:8080/api/v1/library?includeArchived=false');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token-only');
    req.flush({ data: [], meta: { nextCursor: null } });
    expect((await pending).data).toEqual([]);
  });

  it('restores using the explicit restore endpoint', async () => {
    const pending=api.restoreEntry('6d35bdde-6cf5-4107-92e6-32e312e5025b');
    await Promise.resolve();
    await Promise.resolve();
    const req=http.expectOne('http://localhost:8080/api/v1/library/6d35bdde-6cf5-4107-92e6-32e312e5025b/restore');
    expect(req.request.method).toBe('POST');
    req.flush({data:{id:'ok'}});
    expect((await pending).data.id).toBe('ok');
  });
});
