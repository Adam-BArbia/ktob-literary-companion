import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { JournalEntry } from '../core/api/ktob-api.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'ktob-journal-note',
  imports: [DatePipe, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<article class="journal-note" [class.quotation]="note().kind === 'QUOTE'">
    <div class="note-meta">
      <span class="note-type">{{ kindLabel() }}</span
      ><time [attr.datetime]="note().createdAt">{{ note().createdAt | date: 'mediumDate' }}</time
      ><span class="note-private"
        ><ktob-icon [name]="note().isPublic ? 'eye' : 'lock'" [size]="12" />{{ note().isPublic ? 'Public note' : 'Private entry' }}</span
      >
    </div>
    <p class="note-content" dir="auto">{{ note().body }}</p>
    @if (note().emotionTags?.length) {
      <div class="emotion-tags">
        @for (tag of note().emotionTags; track $index) {
          <span>{{ tag }}</span>
        }
      </div>
    }
    <div class="note-footer">
      <span>{{
        note().allowForPersonalization
          ? 'Personalization permitted with separate consent'
          : 'Excluded from AI personalization'
      }}</span>
      @if (!readonly()) {
        <div>
          <button type="button" class="text-action" [disabled]="busy()" (click)="share.emit()">
            {{ note().isPublic ? 'Make private' : 'Publish this note' }}
          </button>
          <button type="button" class="text-action" [disabled]="busy()" (click)="edit.emit()">
            Edit<span class="sr-only"> {{ kindLabel() }}</span></button
          ><button
            type="button"
            class="text-action"
            [disabled]="busy()"
            (click)="remove.emit($event.currentTarget)"
          >
            Delete<span class="sr-only"> {{ kindLabel() }}</span>
          </button>
        </div>
      }
    </div>
  </article>`,
  styleUrl: './journal-note.component.css',
})
export class JournalNoteComponent {
  readonly note = input.required<JournalEntry>();
  readonly readonly = input(false);
  readonly busy = input(false);
  readonly share = output<void>();
  readonly edit = output<void>();
  readonly remove = output<EventTarget | null>();
  kindLabel(): string {
    return {
      REVIEW: 'Review',
      REFLECTION: 'Reflection',
      QUOTE: 'Quotation',
      NOTE: 'Note',
      EMOTION: 'Feeling',
    }[this.note().kind];
  }
}
