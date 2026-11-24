import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ConversationMessage } from '../core/api/ktob-api.service';
import { IconComponent } from './icon.component';
import { renderLiteraryMarkdown } from './literary-markdown';

/** Only assistant replies use escaped, allowlisted Markdown; Angular also sanitizes HTML. */
@Component({
  selector: 'ktob-conversation-message',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<article
    class="message"
    [class.reader-message]="message().role === 'READER'"
    [class.assistant-message]="message().role === 'ASSISTANT'"
  >
    <header class="message-heading">
      <span class="message-author"
        ><ktob-icon [name]="message().role === 'READER' ? 'user' : 'sparkles'" [size]="16" />{{
          message().role === 'READER' ? 'You' : 'KTOB companion'
        }}</span
      ><span class="message-kind">{{
        message().role === 'ASSISTANT' ? 'AI response' : date()
      }}</span>
    </header>
    @if (message().spoilerLevel === 'FULL_BOOK_SPOILERS') {
      <details class="spoiler-message">
        <summary>
          <ktob-icon name="eye-off" [size]="15" /> Full-book spoilers · choose to reveal
        </summary>
        @if (message().role === 'ASSISTANT') {
          <div class="message-body ktob-markdown" dir="auto" [innerHTML]="renderedHtml()"></div>
        } @else {
          <div class="message-body" dir="auto">{{ message().body }}</div>
        }
      </details>
    } @else {
      @if (message().role === 'ASSISTANT') {
          <div class="message-body ktob-markdown" dir="auto" [innerHTML]="renderedHtml()"></div>
        } @else {
          <div class="message-body" dir="auto">{{ message().body }}</div>
        }
    }
  </article>`,
  styleUrl: './conversation-message.component.css',
})
export class ConversationMessageComponent {
  readonly message = input.required<ConversationMessage>();
  readonly renderedHtml = computed(() => this.message().role === 'ASSISTANT' ?
    renderLiteraryMarkdown(this.message().body) : '');
  readonly date = computed(() => {
    const value = new Date(this.message().createdAt);
    return Number.isNaN(value.valueOf())
      ? 'Date unavailable'
      : new Intl.DateTimeFormat(undefined, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }).format(value);
  });
}
