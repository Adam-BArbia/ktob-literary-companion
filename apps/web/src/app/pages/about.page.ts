import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../shared/icon.component';
@Component({
  selector: 'app-about-page',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<article class="info-page">
    <p class="eyebrow">KEEP THOUGHTS ON BOOKS</p>
    <h1 class="page-heading">A quieter corner<br />of the reading world.</h1>
    <p class="lead">KTOB is a personal home for the books you want to keep close.</p>
    <div class="info-block">
      <h2>Start with a book.</h2>
      <p>
        Search by title or author, save a discovery to your library, or add a private entry for a
        book you can’t find. Archive a title when you want a little more space, and restore it
        whenever you like.
      </p>
    </div>
    <div class="info-block">
      <h2>Make it your own.</h2>
      <p>
        Your library belongs to your account. Manual entries stay private. There’s no questionnaire
        to finish before you can begin.
      </p>
    </div>
    <div class="info-block">
      <h2>More room to grow.</h2>
      <p>
        Personal collections, reading reflections, and a literary advisor are planned for future
        chapters of KTOB. They are not available yet.
      </p>
      <div class="info-links">
        <a routerLink="/collections"
          >About collections <ktob-icon name="arrow-up-right" [size]="16" /></a
        ><a routerLink="/advisor"
          >About the advisor <ktob-icon name="arrow-up-right" [size]="16"
        /></a>
      </div>
    </div>
    <a routerLink="/auth/sign-up" class="btn btn-primary"
      >Find your place <ktob-icon name="arrow-right" [size]="17"
    /></a>
  </article>`,
  styleUrl: './info.page.css',
})
export class AboutPage {}
