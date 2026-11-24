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
  it('renders potentially malicious markup inert and lets Arabic choose its text direction', () => {
    const fixture = TestBed.createComponent(ConversationMessageComponent);
    const body = 'فكرة عن الراوي\n<img src=x onerror=alert(1)> https://example.test';
    fixture.componentRef.setInput('message', { ...message, body });
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.message-body')?.textContent).toContain('فكرة عن الراوي');
    expect(element.querySelector('.message-body')?.textContent).toContain('<img src=x onerror=alert(1)>');
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


describe('Literary Markdown presentation', () => {
  it('formats assistant headings, lists, bold, links and inline code', () => {
    const fixture = TestBed.createComponent(ConversationMessageComponent);
    fixture.componentRef.setInput('message', {
      ...message,
      body: '## Key themes\n\n1. **Friendship** — a complex bond\n2. *Redemption*\n\n> Consider the narrator\n\nRead [Open Library](https://openlibrary.org) and \x60code\x60.',
    });
    fixture.detectChanges();
    const body = fixture.nativeElement.querySelector('.message-body') as HTMLElement;
    expect(body.querySelector('h3')?.textContent).toBe('Key themes');
    expect(body.querySelectorAll('ol li').length).toBe(2);
    expect(body.querySelector('strong')?.textContent).toBe('Friendship');
    expect(body.querySelector('em')?.textContent).toBe('Redemption');
    expect(body.querySelector('blockquote')?.textContent).toContain('narrator');
    expect(body.querySelector('a')?.getAttribute('href')).toBe('https://openlibrary.org/');
    expect(body.querySelector('a')?.getAttribute('rel')).toContain('noopener');
    expect(body.querySelector('code')?.textContent).toBe('code');
  });

  it('keeps the reader message plain text even if it contains markdown', () => {
    const fixture = TestBed.createComponent(ConversationMessageComponent);
    fixture.componentRef.setInput('message', {
      ...message, role: 'READER', body: '**This is my literal question**',
    });
    fixture.detectChanges();
    const body = fixture.nativeElement.querySelector('.message-body') as HTMLElement;
    expect(body.textContent).toBe('**This is my literal question**');
    expect(body.querySelector('strong')).toBeNull();
  });

  it('never activates HTML or javascript URLs in generated responses', () => {
    const fixture = TestBed.createComponent(ConversationMessageComponent);
    fixture.componentRef.setInput('message', {
      ...message, body: '**Themes** <img src=x onerror=alert(1)>\n\n[bad](javascript:alert(1))\n\n[ok](https://openlibrary.org)',
    });
    fixture.detectChanges();
    const body = fixture.nativeElement.querySelector('.message-body') as HTMLElement;
    expect(body.querySelector('img')).toBeNull();
    expect(body.querySelector('script')).toBeNull();
    expect(body.querySelector('a[href^="javascript:"]')).toBeNull();
    expect(body.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(body.querySelectorAll('a').length).toBe(1);
  });
});
