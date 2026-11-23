import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-section-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `<section class="future-page">
    <span class="future-icon"><ktob-icon [name]="icon" [size]="32" /></span>
    <p class="eyebrow">A LITTLE FURTHER DOWN THE SHELF</p>
    <h1 class="page-heading">{{ title }}</h1>
    <p class="page-description">{{ description }}</p>
    <span class="coming-soon"><span></span> Coming soon</span>
    <div class="future-note">
      <h2>There’s already a place for your books.</h2>
      <p>
        Discover a title, build your personal library, and come back whenever a new story catches
        your eye.
      </p>
      <a routerLink="/library" class="btn btn-primary"
        >Back to my library <ktob-icon name="arrow-right" [size]="17" /></a
      ><a routerLink="/catalog/search" class="btn btn-ghost">Discover a book</a>
    </div>
  </section>`,
  styles: `
    :host {
      display: block;
    }
    .future-page {
      max-width: 760px;
      margin: 30px auto;
      text-align: center;
      padding: 20px 10px;
    }
    .future-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 76px;
      height: 76px;
      border-radius: 50%;
      background: #e9eedf;
      color: #5b784a;
      border: 1px solid #d2ddc6;
      margin: 0 auto 26px;
    }
    .page-heading {
      margin-top: 16px;
    }
    .page-description {
      margin: 20px auto 0;
      max-width: 570px;
    }
    .coming-soon {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 6px 14px;
      border: 1px solid #d3ddc8;
      background: #eef2e6;
      color: #627653;
      border-radius: 20px;
      font-size: 11px;
      margin-top: 25px;
    }
    .coming-soon span {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #85996a;
    }
    .future-note {
      margin: 43px auto 0;
      padding: 30px;
      border: 1px solid #dfe4d7;
      background: #fffefa;
      border-radius: 14px;
    }
    .future-note h2 {
      font-family: var(--font-serif);
      font-size: 25px;
      font-weight: 400;
      letter-spacing: -0.025em;
    }
    .future-note p {
      font-size: 13px;
      line-height: 1.8;
      color: #6d7c65;
      max-width: 480px;
      margin: 13px auto 22px;
    }
    .future-note .btn {
      font-size: 12px;
      margin: 4px;
    }
    @media (max-width: 600px) {
      .future-page {
        margin: 10px auto;
      }
      .future-note {
        padding: 25px 19px;
      }
      .future-note h2 {
        font-size: 24px;
      }
    }
  `,
})
export class SectionPage {
  private readonly data = inject(ActivatedRoute).snapshot.data;
  readonly title = this.data['title'] as string;
  readonly description = this.data['description'] as string;
  readonly icon = (this.data['icon'] as string) || 'book-open';
}
