import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { BookWork, LibraryEntry, ReadingStatus } from '../core/api/ktob-api.service';
import { readingStatusLabel } from '../core/api/reading-helpers';
import { BookCoverComponent } from './book-cover.component';
import { IconComponent } from './icon.component';

@Component({
  selector: 'ktob-book-hero',
  imports: [BookCoverComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './book-hero.component.html',
  styleUrl: './book-hero.component.css',
})
export class BookHeroComponent {
  readonly entry = input.required<LibraryEntry>();
  readonly work = input<BookWork | null>(null);
  readonly activeStatus = input<ReadingStatus | null>(null);
  readonly hasReadings = input(false);
  readonly busy = input(false);
  readonly start = output<void>();
  readonly finish = output<'historical' | 'finish'>();
  readonly statusChange = output<ReadingStatus>();
  readonly favorite = output<void>();
  readonly restore = output<void>();
  readonly statusLabel = readingStatusLabel;
}
