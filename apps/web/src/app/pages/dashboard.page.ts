import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { BookCoverComponent } from '../shared/book-cover.component';
import { IconComponent } from '../shared/icon.component';
import { HomeHeroComponent } from '../shared/home-hero.component';

@Component({
  selector: 'app-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BookCoverComponent, IconComponent, HomeHeroComponent],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.css',
})
export class DashboardPage {
  readonly auth = inject(AuthService);
  readonly readingPaths = [
    {
      title: 'Pride and Prejudice',
      author: 'Jane Austen',
      theme: 'A classic to return to',
      color: 4,
      query: 'Pride and Prejudice',
    },
    {
      title: 'The Secret Garden',
      author: 'Frances Hodgson Burnett',
      theme: 'A little room for wonder',
      color: 0,
      query: 'The Secret Garden',
    },
    {
      title: 'Meditations',
      author: 'Marcus Aurelius',
      theme: 'A moment to reflect',
      color: 1,
      query: 'Meditations',
    },
    {
      title: 'A Room of One’s Own',
      author: 'Virginia Woolf',
      theme: 'A different perspective',
      color: 2,
      query: 'A Room of One',
    },
  ];
}
