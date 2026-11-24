import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { KtobApiService } from '../core/api/ktob-api.service';
import { AuthService } from '../core/auth/auth.service';
import { SettingsPage } from './settings.page';

describe('Account and privacy settings', () => {
  const api = {
    profile: vi.fn(),
    updateProfile: vi.fn(),
    privacy: vi.fn(),
    updatePrivacy: vi.fn(),
  };
  let fixture: ComponentFixture<SettingsPage>;

  beforeEach(async () => {
    api.profile.mockReset().mockResolvedValue({ data: { id: 'reader-1', displayName: 'Reader' } });
    api.updateProfile.mockReset().mockImplementation(async (displayName: string) => ({
      data: { id: 'reader-1', displayName },
    }));
    api.privacy
      .mockReset()
      .mockResolvedValue({
        data: {
          aiProcessingOptIn: false,
          personalizationOptIn: false,
          useReadingHistory: false,
          useAllowedJournal: false,
          useExplicitPreferences: false,
          useApprovedMemories: false,
        },
      });
    api.updatePrivacy.mockReset();
    await TestBed.configureTestingModule({
      imports: [SettingsPage],
      providers: [
        provideRouter([]),
        { provide: KtobApiService, useValue: api },
        { provide: AuthService, useValue: { user: signal({ email: 'reader@example.test' }) } },
      ],
    }).compileComponents();
  });

  async function render(): Promise<SettingsPage> {
    fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('loads the persisted profile and real unchecked AI permission without an editable email', async () => {
    await render();
    const element = fixture.nativeElement as HTMLElement;
    expect((element.querySelector('#display-name') as HTMLInputElement).value).toBe('Reader');
    expect(element.textContent).toContain('reader@example.test');
    expect(element.querySelector('input[type="email"]')).toBeNull();
    expect(
      (element.querySelector('input[name="aiProcessingConsent"]') as HTMLInputElement).checked,
    ).toBe(false);
    expect(api.updatePrivacy).not.toHaveBeenCalled();
    expect((element.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('submits the edited, trimmed display name and confirms the actual returned profile', async () => {
    await render();
    const element = fixture.nativeElement as HTMLElement;
    const input = element.querySelector('#display-name') as HTMLInputElement;
    input.value = '  Leila  ';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    element
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.updateProfile).toHaveBeenCalledExactlyOnceWith('Leila');
    expect(input.value).toBe('Leila');
    expect(element.querySelector('[role="status"]')?.textContent).toContain('has been saved');
    expect((element.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('links validation errors to the name field and refuses blank or overlong names', async () => {
    const page = await render();
    page.editName('   ');
    await page.save();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(api.updateProfile).not.toHaveBeenCalled();
    expect(element.querySelector('#display-name')?.getAttribute('aria-invalid')).toBe('true');
    expect(element.querySelector('#display-name')?.getAttribute('aria-describedby')).toContain(
      'name-error',
    );
    expect(element.querySelector('#name-error')?.textContent).toContain('Enter a display name');
    expect(element.querySelector('[role="alert"] a')?.getAttribute('href')).toBe('#display-name');
    page.editName('a'.repeat(101));
    await page.save();
    fixture.detectChanges();
    expect(api.updateProfile).not.toHaveBeenCalled();
    expect(element.querySelector('#name-error')?.textContent).toContain('100 characters or fewer');
  });

  it('keeps the edited input and persisted name separate when saving fails', async () => {
    const page = await render();
    api.updateProfile.mockRejectedValueOnce(new HttpErrorResponse({ status: 500 }));
    page.editName('Leila');
    await page.save();
    fixture.detectChanges();
    expect(page.savedName()).toBe('Reader');
    expect(page.displayName()).toBe('Leila');
    expect(page.hasChanges()).toBe(true);
    expect(page.notice()).toBe('');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent,
    ).toContain('couldn’t save');
  });

  it('offers reauthentication after a 401 and never renders a successful empty profile', async () => {
    api.profile.mockRejectedValueOnce(new HttpErrorResponse({ status: 401 }));
    await render();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.profile-panel form')).toBeNull();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('session has expired');
    expect(element.querySelector('[role="alert"] a')?.getAttribute('href')).toBe(
      '/auth?returnUrl=%2Fsettings',
    );
    expect(api.updateProfile).not.toHaveBeenCalled();
  });

  it('prevents a second save while the first request is pending', async () => {
    const page = await render();
    let resolveSave!: (value: { data: { id: string; displayName: string } }) => void;
    api.updateProfile.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        }),
    );
    page.editName('Leila');
    const first = page.save();
    await page.save();
    expect(api.updateProfile).toHaveBeenCalledTimes(1);
    expect(page.saving()).toBe(true);
    resolveSave({ data: { id: 'reader-1', displayName: 'Leila' } });
    await first;
    expect(page.saving()).toBe(false);
    expect(page.savedName()).toBe('Leila');
  });
});
