import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  ParamMap,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import {
  BookWork,
  Conversation,
  ConversationMessage,
  ConversationTurn,
  KtobApiService,
  PrivacySettings,
} from '../core/api/ktob-api.service';
import { AdvisorPage } from './advisor.page';

const permitted: PrivacySettings = {
  aiProcessingOptIn: true,
  personalizationOptIn: false,
  useReadingHistory: false,
  useAllowedJournal: false,
  useExplicitPreferences: false,
  useApprovedMemories: false,
};
const conversation: Conversation = {
  id: 'conversation-1',
  kind: 'GENERAL',
  title: 'Reading perspectives',
  createdAt: '2026-11-24T00:00:00Z',
};
const work: BookWork = {
  id: 'work-1',
  title: 'Persuasion',
  authors: ['Jane Austen'],
  origin: 'OPEN_LIBRARY',
  language: 'eng',
  catalogReference: '/works/OL1W',
  metadataStatus: 'AVAILABLE',
  ownerReaderId: null,
};
const reader: ConversationMessage = {
  id: 'reader-message',
  conversationId: conversation.id,
  role: 'READER',
  body: 'Explain perspective.',
  createdAt: '2026-11-24T00:00:01Z',
  spoilerLevel: 'NO_SPOILERS',
  fullBookSpoilersConfirmed: false,
};
const assistant: ConversationMessage = {
  id: 'assistant-message',
  conversationId: conversation.id,
  role: 'ASSISTANT',
  body: 'A narrator shapes how we see a story.',
  createdAt: '2026-11-24T00:00:02Z',
  spoilerLevel: 'NO_SPOILERS',
};
const turn: ConversationTurn = {
  userMessage: reader,
  assistantMessage: assistant,
  proposalIds: [],
  spoilerLevel: 'NO_SPOILERS',
};

describe('Real literary companion flow', () => {
  const api = {
    privacy: vi.fn(),
    updatePrivacy: vi.fn(),
    conversations: vi.fn(),
    createConversation: vi.fn(),
    conversationMessages: vi.fn(),
    sendMessage: vi.fn(),
    workById: vi.fn(),
  };
  let fixture: ComponentFixture<AdvisorPage>;
  let params: BehaviorSubject<ParamMap>;
  let snapshot: { queryParamMap: ParamMap };
  beforeEach(async () => {
    vi.resetAllMocks();
    params = new BehaviorSubject(convertToParamMap({}));
    snapshot = { queryParamMap: convertToParamMap({}) };
    api.privacy.mockResolvedValue({ data: permitted });
    api.updatePrivacy.mockResolvedValue({ data: permitted });
    api.conversations.mockResolvedValue({ data: [], meta: { nextCursor: null } });
    api.createConversation.mockResolvedValue({ data: conversation });
    api.conversationMessages.mockResolvedValue({ data: [], meta: { nextCursor: null } });
    api.sendMessage.mockResolvedValue({ data: turn });
    api.workById.mockResolvedValue({ data: work });
    await TestBed.configureTestingModule({
      imports: [AdvisorPage],
      providers: [
        provideRouter([]),
        { provide: KtobApiService, useValue: api },
        { provide: ActivatedRoute, useValue: { queryParamMap: params, snapshot } },
      ],
    }).compileComponents();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });
  async function render(query: Record<string, string> = {}): Promise<AdvisorPage> {
    snapshot.queryParamMap = convertToParamMap(query);
    params.next(snapshot.queryParamMap);
    fixture = TestBed.createComponent(AdvisorPage);
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance.loading()).toBe(false));
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('does not create or send a turn without explicit saved processing consent', async () => {
    api.privacy.mockResolvedValue({ data: { ...permitted, aiProcessingOptIn: false } });
    const page = await render();
    page.draft = 'A question about symbolism.';
    await page.send();
    expect(api.createConversation).not.toHaveBeenCalled();
    expect(api.sendMessage).not.toHaveBeenCalled();
    expect(page.messages()).toEqual([]);
    expect(page.sendError()).toContain('permission');
  });

  it('shows only a real persisted pair after a successful response and keeps a pending draft visible', async () => {
    let resolve!: (value: { data: ConversationTurn }) => void;
    api.sendMessage.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const page = await render();
    page.draft = reader.body;
    const pending = page.send();
    await Promise.resolve();
    expect(page.messages()).toEqual([]);
    expect(page.draft).toBe(reader.body);
    expect(page.sending()).toBe(true);
    resolve({ data: turn });
    await pending;
    expect(page.messages()).toEqual([reader, assistant]);
    expect(page.draft).toBe('');
    expect(page.notice()).toContain('saved privately');
    expect(api.sendMessage.mock.calls[0][1]).toEqual({
      body: reader.body,
      spoilerLevel: 'NO_SPOILERS',
      fullBookSpoilersConfirmed: false,
    });
    expect(api.sendMessage.mock.calls[0][1]).not.toHaveProperty('usePersonalContext');
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/advisor'], {
      queryParams: { conversationId: conversation.id },
      replaceUrl: true,
    });
  });

  it('retains the draft and the same idempotency key on an identical retry without fake replies', async () => {
    api.sendMessage.mockRejectedValueOnce(
      new HttpErrorResponse({
        status: 503,
        error: { code: 'AI_PROVIDER_UNAVAILABLE', detail: 'SECRET_CANARY' },
      }),
    );
    const page = await render();
    page.draft = reader.body;
    await page.send();
    const key = api.sendMessage.mock.calls[0][2];
    expect(page.messages()).toHaveLength(0);
    expect(page.draft).toBe(reader.body);
    expect(page.sendError()).toContain('temporarily unavailable');
    expect(page.sendError()).not.toContain('SECRET_CANARY');
    await page.send();
    expect(api.sendMessage.mock.calls[1][2]).toBe(key);
    expect(api.createConversation).toHaveBeenCalledTimes(1);
    expect(page.messages()).toHaveLength(2);
  });

  it('requires a fresh full-spoiler confirmation and resets it after the attempted dispatch', async () => {
    const page = await render();
    page.draft = 'Discuss the ending.';
    page.changeSpoilerChoice(true);
    await page.send();
    expect(api.sendMessage).not.toHaveBeenCalled();
    expect(page.sendError()).toContain('Confirm');
    page.spoilerConfirmed = true;
    api.sendMessage.mockRejectedValueOnce(new HttpErrorResponse({ status: 503 }));
    await page.send();
    expect(api.sendMessage.mock.calls[0][1]).toEqual({
      body: 'Discuss the ending.',
      spoilerLevel: 'FULL_BOOK_SPOILERS',
      fullBookSpoilersConfirmed: true,
    });
    expect(page.fullSpoilers).toBe(false);
    expect(page.spoilerConfirmed).toBe(false);
    await page.send();
    expect(api.sendMessage.mock.calls[1][1].spoilerLevel).toBe('NO_SPOILERS');
    expect(api.sendMessage.mock.calls[1][2]).not.toBe(api.sendMessage.mock.calls[0][2]);
  });

  it('uses only the canonical work reference to create a book conversation', async () => {
    api.createConversation.mockResolvedValue({
      data: { ...conversation, kind: 'BOOK_MAIN', workId: work.id, title: work.title },
    });
    const page = await render({ workId: work.id });
    expect(page.work()?.title).toBe('Persuasion');
    expect(api.createConversation).not.toHaveBeenCalled();
    page.draft = 'Help me analyze the narrator without spoilers.';
    await page.send();
    expect(api.createConversation).toHaveBeenCalledExactlyOnceWith({
      kind: 'BOOK_MAIN',
      workId: work.id,
    });
    expect(api.sendMessage.mock.calls[0][1]).toEqual({
      body: 'Help me analyze the narrator without spoilers.',
      spoilerLevel: 'NO_SPOILERS',
      fullBookSpoilersConfirmed: false,
    });
  });

  it('reloads saved messages chronologically without any inference and prepends older pages', async () => {
    const earlier = {
      ...reader,
      id: 'earlier-reader',
      body: 'Earlier question',
      createdAt: '2026-11-23T00:00:01Z',
    };
    api.conversations.mockResolvedValue({ data: [conversation], meta: { nextCursor: null } });
    api.conversationMessages
      .mockResolvedValueOnce({ data: [assistant, reader], meta: { nextCursor: 'older-page' } })
      .mockResolvedValueOnce({ data: [earlier], meta: { nextCursor: null } });
    const page = await render({ conversationId: conversation.id });
    expect(page.messages()).toEqual([reader, assistant]);
    expect(api.sendMessage).not.toHaveBeenCalled();
    await page.loadEarlier();
    expect(api.conversationMessages).toHaveBeenLastCalledWith(conversation.id, 'older-page');
    expect(page.messages().map((item) => item.id)).toEqual([
      'earlier-reader',
      reader.id,
      assistant.id,
    ]);
  });

  it('refreshes consent after a server-side revocation and preserves the unsent question', async () => {
    const page = await render();
    api.sendMessage.mockRejectedValueOnce(
      new HttpErrorResponse({ status: 403, error: { code: 'AI_PROCESSING_CONSENT_REQUIRED' } }),
    );
    api.privacy.mockResolvedValue({ data: { ...permitted, aiProcessingOptIn: false } });
    page.draft = reader.body;
    await page.send();
    await fixture.whenStable();
    expect(page.draft).toBe(reader.body);
    expect(page.messages()).toEqual([]);
    expect(page.hasConsent()).toBe(false);
    expect(api.privacy).toHaveBeenCalledTimes(2);
  });

  it('keeps a rate-limited request recoverable and never retries automatically', async () => {
    api.sendMessage.mockRejectedValueOnce(
      new HttpErrorResponse({ status: 429, headers: new HttpHeaders({ 'Retry-After': '45' }) }),
    );
    const page = await render();
    vi.useFakeTimers();
    page.draft = 'Une question sur le narrateur.';
    await page.send();
    expect(api.sendMessage).toHaveBeenCalledTimes(1);
    expect(page.sendError()).toContain('45 seconds');
    expect(page.draft).toBe('Une question sur le narrateur.');
    expect(page.messages()).toEqual([]);
    expect(page.retryAfterSeconds()).toBe(45);
    await page.send();
    expect(api.sendMessage).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(45000);
    expect(page.retryAfterSeconds()).toBe(0);
    expect(api.sendMessage).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('explains the smaller inference context budget without dropping the full draft or retrying', async () => {
    api.sendMessage.mockRejectedValueOnce(
      new HttpErrorResponse({ status: 422, error: { code: 'AI_CONTEXT_TOO_LARGE' } }),
    );
    const page = await render();
    page.draft = 'A long excerpt to shorten.';
    await page.send();
    expect(page.sendError()).toContain('Shorten it');
    expect(page.draft).toBe('A long excerpt to shorten.');
    expect(page.messages()).toEqual([]);
    expect(api.sendMessage).toHaveBeenCalledTimes(1);
  });

  it('does not turn an inaccessible conversation into an empty successful chat', async () => {
    api.conversationMessages.mockRejectedValueOnce(new HttpErrorResponse({ status: 404 }));
    const page = await render({ conversationId: 'other-reader-conversation' });
    expect(page.viewError()).toContain('unavailable to your account');
    page.draft = 'Do not send this';
    await page.send();
    expect(api.sendMessage).not.toHaveBeenCalled();
    expect(api.createConversation).not.toHaveBeenCalled();
  });

  it('prevents double sends and does not submit during input-method composition', async () => {
    let resolve!: (value: { data: ConversationTurn }) => void;
    api.sendMessage.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const page = await render();
    page.draft = 'ما الذي يميز أسلوب الراوي؟';
    page.onComposerKey(
      new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, isComposing: true }),
    );
    expect(api.sendMessage).not.toHaveBeenCalled();
    const pending = page.send();
    await Promise.resolve();
    await page.send();
    expect(api.sendMessage).toHaveBeenCalledTimes(1);
    resolve({ data: turn });
    await pending;
  });

  it('keeps a late reply out of a different conversation opened while the request was pending', async () => {
    const other: Conversation = { ...conversation, id: 'conversation-2', title: 'Another reading' };
    api.conversations.mockResolvedValue({
      data: [conversation, other],
      meta: { nextCursor: null },
    });
    let resolve!: (value: { data: ConversationTurn }) => void;
    api.sendMessage.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const page = await render({ conversationId: conversation.id });
    page.draft = reader.body;
    const pending = page.send();
    await Promise.resolve();
    snapshot.queryParamMap = convertToParamMap({ conversationId: other.id });
    params.next(snapshot.queryParamMap);
    await vi.waitFor(() => expect(page.loading()).toBe(false));
    expect(page.conversation()?.id).toBe(other.id);
    resolve({ data: turn });
    await pending;
    expect(page.conversation()?.id).toBe(other.id);
    expect(page.messages()).toEqual([]);
    expect(page.notice()).toBe('');
  });
});
