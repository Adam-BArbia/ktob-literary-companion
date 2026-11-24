import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { KtobApiService, PrivacySettings } from '../core/api/ktob-api.service';
import { AiConsentComponent } from './ai-consent.component';

const off: PrivacySettings = {
  aiProcessingOptIn: false,
  personalizationOptIn: false,
  useReadingHistory: false,
  useAllowedJournal: false,
  useExplicitPreferences: false,
  useApprovedMemories: false,
};

describe('Explicit AI processing permission', () => {
  const api = { privacy: vi.fn(), updatePrivacy: vi.fn() };
  let fixture: ComponentFixture<AiConsentComponent>;
  beforeEach(async () => {
    vi.resetAllMocks();
    api.privacy.mockResolvedValue({ data: { ...off } });
    api.updatePrivacy.mockImplementation(async (patch: Partial<PrivacySettings>) => ({
      data: { ...off, ...patch },
    }));
    await TestBed.configureTestingModule({
      imports: [AiConsentComponent],
      providers: [provideRouter([]), { provide: KtobApiService, useValue: api }],
    }).compileComponents();
  });
  async function render(): Promise<AiConsentComponent> {
    fixture = TestBed.createComponent(AiConsentComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('loads an unchecked permission and never grants consent by opening the panel', async () => {
    await render();
    const element = fixture.nativeElement as HTMLElement;
    expect((element.querySelector('input[type=checkbox]') as HTMLInputElement).checked).toBe(false);
    expect(api.updatePrivacy).not.toHaveBeenCalled();
    expect(element.textContent).toContain(
      'Your saved journal, reading history and account details are not automatically added.',
    );
    expect(element.textContent).toContain('saved privately in KTOB');
  });

  it('changes only processing consent after explicit save and reports the actual persisted response', async () => {
    const page = await render();
    const changes = vi.fn();
    page.changed.subscribe(changes);
    page.choice = true;
    expect(api.updatePrivacy).not.toHaveBeenCalled();
    await page.save();
    expect(api.updatePrivacy).toHaveBeenCalledExactlyOnceWith({ aiProcessingOptIn: true });
    expect(page.saved()?.personalizationOptIn).toBe(false);
    expect(changes).toHaveBeenNthCalledWith(1, null);
    expect(changes).toHaveBeenLastCalledWith({ ...off, aiProcessingOptIn: true });
  });

  it('can revoke processing and does not claim that a failed revocation succeeded', async () => {
    api.privacy.mockResolvedValue({ data: { ...off, aiProcessingOptIn: true } });
    api.updatePrivacy.mockRejectedValueOnce(new HttpErrorResponse({ status: 503 }));
    const page = await render();
    const changes = vi.fn();
    page.changed.subscribe(changes);
    page.choice = false;
    await page.save();
    expect(api.updatePrivacy).toHaveBeenCalledWith({ aiProcessingOptIn: false });
    expect(page.saved()?.aiProcessingOptIn).toBe(true);
    expect(page.notice()).toBe('');
    expect(page.error()).toContain('could not be confirmed');
    expect(changes).toHaveBeenLastCalledWith(null);
    api.updatePrivacy.mockResolvedValueOnce({ data: off });
    await page.save();
    expect(page.saved()?.aiProcessingOptIn).toBe(false);
  });

  it('revokes old personalization scopes separately without implicitly changing AI processing', async () => {
    api.privacy.mockResolvedValue({
      data: {
        ...off,
        aiProcessingOptIn: true,
        personalizationOptIn: true,
        useAllowedJournal: true,
      },
    });
    const page = await render();
    expect(page.hasPersonalization()).toBe(true);
    await page.revokePersonalization();
    expect(api.updatePrivacy).toHaveBeenCalledWith({
      personalizationOptIn: false,
      useReadingHistory: false,
      useAllowedJournal: false,
      useExplicitPreferences: false,
      useApprovedMemories: false,
    });
    expect(api.updatePrivacy.mock.calls[0][0]).not.toHaveProperty('aiProcessingOptIn');
  });
});
