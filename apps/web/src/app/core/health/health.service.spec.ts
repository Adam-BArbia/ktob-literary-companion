import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HealthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('marks backend online only for actual status ok from configured endpoint', () => {
    service.check();
    http.expectOne('/ktob-config.json').flush({ apiBaseUrl: 'http://localhost:8080/api/v1/' });
    http.expectOne('http://localhost:8080/api/v1/health').flush({ status: 'ok' });
    expect(service.state()).toBe('online');
  });

  it('marks backend offline on server error without showing a false green state', () => {
    service.check();
    http.expectOne('/ktob-config.json').flush({ apiBaseUrl: '/api/v1' });
    http
      .expectOne('/api/v1/health')
      .flush({ message: 'unavailable' }, { status: 503, statusText: 'Unavailable' });
    expect(service.state()).toBe('offline');
  });

  it('does not send a request to an invalid configured URL', () => {
    service.check();
    http.expectOne('/ktob-config.json').flush({ apiBaseUrl: 'javascript:alert(1)' });
    expect(service.state()).toBe('offline');
    http.expectNone('/health');
  });
});
