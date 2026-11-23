import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../shared/icon.component';
@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="not-found">
    <p class="eyebrow">404 / A PAGE OUT OF PLACE</p>
    <span class="page-art" aria-hidden="true"><ktob-icon name="book-open" [size]="50" /></span>
    <h1 class="page-heading">We’ve lost our place.</h1>
    <p class="page-description">
      This page isn’t on the shelf. Let’s get you back to a good story.
    </p>
    <a routerLink="/" class="btn btn-primary"
      ><ktob-icon name="arrow-left" [size]="17" /> Back home</a
    ><a routerLink="/library" class="btn btn-ghost">Open my library</a>
  </section>`,
  styles: `
    .not-found {
      text-align: center;
      max-width: 650px;
      margin: 55px auto 75px;
    }
    .page-art {
      display: flex;
      width: 110px;
      height: 110px;
      align-items: center;
      justify-content: center;
      background: #e8eedf;
      color: #667e51;
      border: 1px solid #d0dcc2;
      border-radius: 50%;
      margin: 30px auto;
    }
    .page-description {
      margin: 20px auto 30px;
    }
    .btn {
      margin: 5px;
    }
  `,
})
export class NotFoundPage {}
