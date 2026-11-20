import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService configuration boundaries', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('stays unconfigured without a dedicated KTOB Supabase project', async () => {
    const ready = service.ensureReady();
    http.expectOne('/ktob-config.json').flush({
      apiBaseUrl: 'http://localhost:8080/api/v1',
      supabaseUrl: '', supabasePublishableKey: ''
    });
    await ready;
    expect(service.status()).toBe('unconfigured');
    expect(service.user()).toBeNull();
    await expect(service.accessToken()).rejects.toThrow('not been configured');
  });

  it('rejects invalid API base configuration', async () => {
    const ready = service.ensureReady();
    http.expectOne('/ktob-config.json').flush({
      apiBaseUrl: 'javascript:alert(1)'
    });
    await ready;
    expect(service.status()).toBe('error');
  });
});
