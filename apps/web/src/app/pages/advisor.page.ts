import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  BookWork,
  Conversation,
  ConversationMessage,
  KtobApiService,
  MessageWrite,
  PrivacySettings,
  isAuthFailure,
} from '../core/api/ktob-api.service';
import { AiConsentComponent } from '../shared/ai-consent.component';
import { BookCoverComponent } from '../shared/book-cover.component';
import { IconComponent } from '../shared/icon.component';
import { ConversationMessageComponent } from '../shared/conversation-message.component';

@Component({
  selector: 'app-advisor-page',
  imports: [
    FormsModule,
    RouterLink,
    AiConsentComponent,
    BookCoverComponent,
    IconComponent,
    ConversationMessageComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './advisor.page.html',
  styleUrl: './advisor.page.css',
})
export class AdvisorPage implements OnInit {
  private readonly api = inject(KtobApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  @ViewChild('consentPanel') private consentPanel?: AiConsentComponent;
  @ViewChild('composer') private composer?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('transcript') private transcript?: ElementRef<HTMLElement>;
  private version = 0;
  private routeSignature: string | null = null;
  private historyLoaded = false;
  private lastAttempt: { fingerprint: string; key: string } | null = null;
  private retryTimer: ReturnType<typeof setInterval> | null = null;
  readonly conversations = signal<Conversation[]>([]);
  readonly conversationCursor = signal<string | null>(null);
  readonly conversation = signal<Conversation | null>(null);
  readonly work = signal<BookWork | null>(null);
  readonly messages = signal<ConversationMessage[]>([]);
  readonly messageCursor = signal<string | null>(null);
  readonly privacy = signal<PrivacySettings | null>(null);
  readonly loading = signal(true);
  readonly historyLoading = signal(false);
  readonly earlierLoading = signal(false);
  readonly sending = signal(false);
  readonly retryAfterSeconds = signal(0);
  readonly retryLabel = computed(() =>
    this.retryAfterSeconds() >= 3600
      ? `${Math.ceil(this.retryAfterSeconds() / 3600)}h`
      : this.retryAfterSeconds() >= 60
        ? `${Math.ceil(this.retryAfterSeconds() / 60)}m`
        : `${this.retryAfterSeconds()}s`,
  );
  readonly historyError = signal('');
  readonly viewError = signal('');
  readonly sendError = signal('');
  readonly earlierError = signal('');
  readonly notice = signal('');
  readonly needsSignIn = signal(false);
  readonly hasConsent = computed(() => this.privacy()?.aiProcessingOptIn === true);
  readonly title = computed(
    () => this.conversation()?.title || (this.work() ? 'A closer reading.' : 'Between the lines.'),
  );
  readonly starterPrompts = computed(() =>
    this.work()
      ? [
          'What themes should I watch for?',
          'Ask me a thoughtful question about this book.',
          'Help me analyze the narrator without spoilers.',
          'What makes this writing style distinctive?',
          'Help me interpret a passage I provide.',
        ]
      : [
          'How can I notice symbolism without overinterpreting?',
          'What is the difference between a narrator and an author?',
          'Ask me a thoughtful question about my reading.',
          'Help me explore a literary movement.',
        ],
  );
  draft = '';
  fullSpoilers = false;
  spoilerConfirmed = false;

  constructor() {
    this.destroyRef.onDestroy(() => {
      ++this.version;
      if (this.retryTimer) clearInterval(this.retryTimer);
    });
  }

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      void this.activate(params.get('conversationId'), params.get('workId'));
    });
  }

  async activate(
    conversationId: string | null,
    workId: string | null,
    force = false,
  ): Promise<void> {
    const signature = `${conversationId || ''}|${conversationId ? '' : workId || ''}`;
    if (!force && this.routeSignature === signature) return;
    this.routeSignature = signature;
    const version = ++this.version;
    this.loading.set(true);
    this.viewError.set('');
    this.sendError.set('');
    this.earlierError.set('');
    this.notice.set('');
    this.needsSignIn.set(false);
    this.conversation.set(null);
    this.work.set(null);
    this.messages.set([]);
    this.messageCursor.set(null);
    this.draft = '';
    this.fullSpoilers = false;
    this.spoilerConfirmed = false;
    try {
      if (!this.historyLoaded) await this.loadConversations();
      if (version !== this.version) return;
      if (conversationId) {
        let selected = this.conversations().find((item) => item.id === conversationId);
        let pages = 0;
        while (!selected && this.conversationCursor() && pages++ < 10) {
          if (!(await this.loadConversations(true))) break;
          if (version !== this.version) return;
          selected = this.conversations().find((item) => item.id === conversationId);
        }
        if (!selected) {
          // The owner-scoped endpoint distinguishes an inaccessible record from a list outage.
          await this.api.conversationMessages(conversationId);
          throw new Error('CONVERSATION_CONTEXT_UNAVAILABLE');
        }
        const selectedWork = selected.workId
          ? (await this.api.workById(selected.workId)).data
          : null;
        const page = await this.api.conversationMessages(selected.id);
        if (version !== this.version) return;
        this.conversation.set(selected);
        this.work.set(selectedWork);
        this.messages.set([...page.data].reverse());
        this.messageCursor.set(page.meta?.nextCursor ?? null);
        this.scrollToLatest();
      } else if (workId) {
        const { data } = await this.api.workById(workId);
        if (version !== this.version) return;
        this.work.set(data);
      }
    } catch (error) {
      if (version !== this.version) return;
      this.viewError.set(
        this.failure(
          error,
          'We couldn’t open this conversation or its book context. Please reload or choose a conversation from your history.',
        ),
      );
    } finally {
      if (version === this.version) this.loading.set(false);
    }
  }

  async reload(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;
    this.historyLoaded = false;
    await this.activate(params.get('conversationId'), params.get('workId'), true);
  }

  async loadConversations(append = false): Promise<boolean> {
    if (this.historyLoading() || (append && !this.conversationCursor())) return false;
    this.historyLoading.set(true);
    this.historyError.set('');
    try {
      const page = await this.api.conversations(append ? this.conversationCursor()! : undefined);
      if (this.destroyRef.destroyed) return false;
      const existing = append ? this.conversations() : [];
      this.conversations.set(this.unique([...existing, ...page.data]));
      this.conversationCursor.set(page.meta?.nextCursor ?? null);
      this.historyLoaded = true;
      return true;
    } catch (error) {
      if (!this.destroyRef.destroyed)
        this.historyError.set(
          this.failure(
            error,
            'Your conversation history could not be loaded. It has not been erased.',
          ),
        );
      return false;
    } finally {
      if (!this.destroyRef.destroyed) this.historyLoading.set(false);
    }
  }

  async loadEarlier(): Promise<void> {
    const current = this.conversation();
    const cursor = this.messageCursor();
    if (!current || !cursor || this.earlierLoading() || this.sending()) return;
    const version = this.version;
    this.earlierLoading.set(true);
    this.earlierError.set('');
    try {
      const page = await this.api.conversationMessages(current.id, cursor);
      if (version !== this.version) return;
      this.messages.set(this.unique([...page.data].reverse().concat(this.messages())));
      this.messageCursor.set(page.meta?.nextCursor ?? null);
    } catch (error) {
      if (version === this.version)
        this.earlierError.set(
          this.failure(
            error,
            'Earlier messages could not be loaded. Your visible conversation is still here.',
          ),
        );
    } finally {
      if (!this.destroyRef.destroyed) this.earlierLoading.set(false);
    }
  }

  async chooseConversation(item: Conversation): Promise<void> {
    if (!this.canSwitch()) return;
    const pending = this.activate(item.id, null, true);
    void this.router.navigate(['/advisor'], { queryParams: { conversationId: item.id } });
    await pending;
  }

  async newConversation(keepBook = false): Promise<void> {
    if (!this.canSwitch()) return;
    const workId = keepBook ? (this.work()?.id ?? null) : null;
    const pending = this.activate(null, workId, true);
    void this.router.navigate(['/advisor'], { queryParams: workId ? { workId } : {} });
    await pending;
    this.focusComposer();
  }

  useStarter(prompt: string): void {
    if (this.sending() || this.loading() || this.viewError()) return;
    if (
      this.draft.trim() &&
      !window.confirm('Replace your unsent draft with this starter question?')
    )
      return;
    this.draft = prompt;
    this.sendError.set('');
    this.notice.set('');
    this.focusComposer();
  }

  changeSpoilerChoice(value: boolean): void {
    this.fullSpoilers = value;
    this.spoilerConfirmed = false;
  }

  onComposerKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.isComposing) {
      event.preventDefault();
      void this.send();
    }
  }

  async send(): Promise<void> {
    if (this.sending() || this.loading() || this.viewError() || this.retryAfterSeconds() > 0)
      return;
    this.sendError.set('');
    this.notice.set('');
    if (!this.hasConsent()) {
      this.sendError.set(
        'Review and save your AI processing permission before sending a question.',
      );
      return;
    }
    if (!this.draft.trim() || this.draft.length > 12000) {
      this.sendError.set('Write a question using 1–12,000 characters.');
      this.focusComposer();
      return;
    }
    if (this.fullSpoilers && !this.spoilerConfirmed) {
      this.sendError.set(
        'Confirm that full-book spoilers are allowed for this question, or choose No spoilers.',
      );
      return;
    }
    const body: MessageWrite = {
      body: this.draft,
      spoilerLevel: this.fullSpoilers ? 'FULL_BOOK_SPOILERS' : 'NO_SPOILERS',
      fullBookSpoilersConfirmed: this.fullSpoilers && this.spoilerConfirmed,
    };
    const version = this.version;
    this.sending.set(true);
    // This is permission for one dispatch, never the next question.
    this.fullSpoilers = false;
    this.spoilerConfirmed = false;
    try {
      let current = this.conversation();
      if (!current) {
        const selectedWork = this.work();
        const result = await this.api.createConversation(
          selectedWork
            ? { kind: 'BOOK_MAIN', workId: selectedWork.id }
            : { kind: 'GENERAL', title: body.body.trim().slice(0, 100) },
        );
        if (version !== this.version) return;
        current = result.data;
        this.conversation.set(current);
        this.conversations.set(this.unique([current, ...this.conversations()]));
        this.routeSignature = `${current.id}|`;
        void this.router.navigate(['/advisor'], {
          queryParams: { conversationId: current.id },
          replaceUrl: true,
        });
      }
      const fingerprint = JSON.stringify([current.id, body]);
      if (this.lastAttempt?.fingerprint !== fingerprint) {
        this.lastAttempt = { fingerprint, key: crypto.randomUUID() };
      }
      const { data } = await this.api.sendMessage(current.id, body, this.lastAttempt.key);
      if (version !== this.version) return;
      this.messages.set(this.unique([...this.messages(), data.userMessage, data.assistantMessage]));
      this.draft = '';
      this.lastAttempt = null;
      this.notice.set('Reply received. This conversation is saved privately in KTOB.');
      this.scrollToLatest();
      this.focusComposer();
    } catch (error) {
      if (version !== this.version) return;
      const code = this.problemCode(error);
      if (code === 'AI_PROCESSING_CONSENT_REQUIRED') {
        this.privacy.set(null);
        void this.consentPanel?.load();
      }
      if (error instanceof HttpErrorResponse && error.status === 429) this.startRetryDelay(error);
      this.sendError.set(
        this.failure(
          error,
          'We couldn’t confirm a reply. Your draft is still here. You can retry the same question and spoiler choice without creating a duplicate saved turn.',
        ),
      );
    } finally {
      if (!this.destroyRef.destroyed) this.sending.set(false);
    }
  }

  hasUnsavedDraft(): boolean {
    return this.sending() || !!this.draft.trim();
  }
  returnUrl(): string {
    return this.router.url.startsWith('/advisor') ? this.router.url : '/advisor';
  }
  formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.valueOf())
      ? 'Date unavailable'
      : new Intl.DateTimeFormat(undefined, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }).format(date);
  }

  private canSwitch(): boolean {
    return (
      !this.sending() &&
      (!this.draft.trim() ||
        window.confirm('Leave this conversation and discard your unsent draft?'))
    );
  }
  private unique<T extends { id: string }>(items: T[]): T[] {
    const seen = new Set<string>();
    return items.filter((item) => !seen.has(item.id) && !!seen.add(item.id));
  }
  private problemCode(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) return '';
    return error.error && typeof error.error.code === 'string' ? error.error.code : '';
  }
  private failure(error: unknown, fallback: string): string {
    if (isAuthFailure(error)) {
      this.needsSignIn.set(true);
      return 'Your session has expired. Sign in again to continue; your unsent draft is still here.';
    }
    const code = this.problemCode(error);
    if (code === 'AI_PROCESSING_CONSENT_REQUIRED')
      return 'AI processing permission is off. Review your permission before sending again. Your draft is still here.';
    if (code === 'SPOILER_CONFIRMATION_REQUIRED')
      return 'Full-book spoilers need a fresh confirmation for this question. Your draft is still here.';
    if (code === 'AI_CONTEXT_TOO_LARGE')
      return 'This question or excerpt is too long for the companion’s current allowance. Shorten it before sending again. Your full draft is still here.';
    if (error instanceof Error && error.message === 'CONVERSATION_CONTEXT_UNAVAILABLE')
      return 'The conversation details could not be loaded. Reload history or load earlier conversations, then open it from the list.';
    if (error instanceof HttpErrorResponse) {
      if (error.status === 404) return 'This conversation or book is unavailable to your account.';
      if (error.status === 429) {
        const seconds = Number(error.headers.get('Retry-After'));
        return `The companion is busy or its free allowance is temporarily limited. ${Number.isFinite(seconds) && seconds > 0 && seconds <= 86400 ? `Try again in about ${Math.ceil(seconds)} seconds.` : 'Please wait before trying again.'} Your draft is still here.`;
      }
      if ([502, 503].includes(error.status))
        return 'The literary companion is temporarily unavailable. Your draft is still here, and your library and journal remain usable.';
      if (code === 'IDEMPOTENCY_KEY_REUSED')
        return 'This request could not be safely replayed. Reload the saved conversation before sending again.';
    }
    return fallback;
  }
  private startRetryDelay(error: HttpErrorResponse): void {
    const value = Number(error.headers.get('Retry-After'));
    const seconds = Number.isFinite(value) && value > 0 ? Math.min(86400, Math.ceil(value)) : 60;
    const deadline = Date.now() + seconds * 1000;
    if (this.retryTimer) clearInterval(this.retryTimer);
    this.retryAfterSeconds.set(seconds);
    this.retryTimer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      this.retryAfterSeconds.set(remaining);
      if (!remaining && this.retryTimer) {
        clearInterval(this.retryTimer);
        this.retryTimer = null;
      }
    }, 1000);
  }
  private scrollToLatest(): void {
    setTimeout(() => {
      if (this.destroyRef.destroyed) return;
      const element = this.transcript?.nativeElement;
      element?.scrollTo?.({ top: element.scrollHeight, behavior: 'auto' });
    });
  }
  private focusComposer(): void {
    setTimeout(() => {
      if (!this.destroyRef.destroyed) this.composer?.nativeElement.focus();
    });
  }
}
