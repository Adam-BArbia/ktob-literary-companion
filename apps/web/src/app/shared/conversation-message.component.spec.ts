import { TestBed } from '@angular/core/testing';
import { ConversationMessage } from '../core/api/ktob-api.service';
import { ConversationMessageComponent } from './conversation-message.component';

const message: ConversationMessage = {
  id: 'm',
  conversationId: 'c',
  role: 'ASSISTANT',
  body: 'A thought.',
  createdAt: '2026-11-24T00:00:01Z',
  spoilerLevel: 'NO_SPOILERS',
};

describe('Safe literary responses', () => {
  it('renders model markup and links as inert text and lets Arabic choose its text direction', () => {
    const fixture = TestBed.createComponent(ConversationMessageComponent);
    const body = 'فكرة عن الراوي\n<img src=x onerror=alert(1)> https://example.test';
    fixture.componentRef.setInput('message', { ...message, body });
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.message-body')?.textContent).toBe(body);
    expect(element.querySelector('.message-body')?.getAttribute('dir')).toBe('auto');
    expect(element.querySelector('img')).toBeNull();
    expect(element.querySelector('a')).toBeNull();
  });

  it('keeps prior full-spoiler text behind an explicitly labeled closed disclosure', () => {
    const fixture = TestBed.createComponent(ConversationMessageComponent);
    fixture.componentRef.setInput('message', { ...message, spoilerLevel: 'FULL_BOOK_SPOILERS' });
    fixture.detectChanges();
    const details = fixture.nativeElement.querySelector('details') as HTMLDetailsElement;
    expect(details.open).toBe(false);
    expect(details.querySelector('summary')?.textContent).toContain('Full-book spoilers');
  });
});
