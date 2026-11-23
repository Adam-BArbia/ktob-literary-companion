import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'ktob-book-cover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: ` <div class="cover" [class.compact]="compact()" [attr.data-variant]="tone()">
    <span class="cover-line"></span>
    <div class="cover-type">
      <span class="cover-kicker">THE READING ROOM</span
      ><span class="cover-title">{{ title() }}</span
      ><span class="cover-author">{{ author() || 'A story to discover' }}</span>
    </div>
    <div class="cover-art"><span></span><i></i><b></b></div>
    <span class="cover-imprint">K / A PLACE FOR STORIES</span>
  </div>`,
  styles: `
    :host {
      display: block;
      width: 100%;
      height: 100%;
      min-width: 0;
    }
    .cover {
      position: relative;
      overflow: hidden;
      aspect-ratio: 2/3;
      max-height: 100%;
      color: #f8f3e2;
      background: #244b43;
      border-radius: 2px 7px 7px 2px;
      box-shadow:
        inset 5px 0 9px #00000020,
        inset 8px 0 0 #ffffff0c,
        3px 5px 12px #14251e12;
      text-align: center;
      container-type: inline-size;
    }
    .cover[data-variant='1'] {
      background: #e6b982;
      color: #3e3b2d;
    }
    .cover[data-variant='2'] {
      background: #b8694d;
      color: #fff1d8;
    }
    .cover[data-variant='3'] {
      background: #536a81;
      color: #fff5df;
    }
    .cover[data-variant='4'] {
      background: #dedcc8;
      color: #344835;
    }
    .cover[data-variant='5'] {
      background: #654955;
      color: #fff0da;
    }
    .cover-line {
      position: absolute;
      inset: 7% 9%;
      border: 1px solid currentColor;
      opacity: 0.23;
      border-radius: 1px;
    }
    .cover-type {
      position: relative;
      z-index: 1;
      padding: 14% 12% 0;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .cover-kicker {
      font: 500 3.6cqw var(--font-sans);
      letter-spacing: 0.19em;
      opacity: 0.8;
    }
    .cover-title {
      font-family: var(--font-serif);
      font-size: 13cqw;
      line-height: 1.08;
      letter-spacing: -0.035em;
      margin-top: 12%;
      max-width: 100%;
      overflow-wrap: anywhere;
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .cover-author {
      font-size: 4.4cqw;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      line-height: 1.5;
      margin-top: 9%;
      max-width: 100%;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .cover-art {
      position: absolute;
      width: 66%;
      aspect-ratio: 1;
      left: 17%;
      bottom: 14%;
      border: 1px solid currentColor;
      border-radius: 50%;
      opacity: 0.7;
    }
    .cover-art span {
      position: absolute;
      inset: 12%;
      border: 1px solid currentColor;
      border-radius: 50%;
    }
    .cover-art i {
      position: absolute;
      height: 60%;
      width: 34%;
      left: 33%;
      bottom: 0;
      background: currentColor;
      border-radius: 50% 50% 0 0;
      opacity: 0.3;
    }
    .cover-art b {
      position: absolute;
      inset: 38% -10% auto;
      height: 1px;
      background: currentColor;
      transform: rotate(-30deg);
    }
    .cover-imprint {
      position: absolute;
      bottom: 8%;
      left: 0;
      right: 0;
      font-size: 3.3cqw;
      letter-spacing: 0.16em;
      opacity: 0.85;
    }
    .cover[data-variant='1'] .cover-art {
      border-radius: 50% 50% 0 0;
    }
    .cover[data-variant='2'] .cover-art {
      transform: rotate(25deg);
      border-radius: 0;
    }
    .cover[data-variant='3'] .cover-art {
      border-radius: 50% 50% 0 0;
      transform: rotate(-15deg);
    }
    .compact .cover-kicker,
    .compact .cover-imprint {
      display: none;
    }
    .compact .cover-title {
      font-size: 16cqw;
    }
    .compact .cover-type {
      padding: 16% 12% 0;
    }
    .compact .cover-author {
      font-size: 7cqw;
    }
  `,
})
export class BookCoverComponent {
  readonly title = input.required<string>();
  readonly author = input('');
  readonly variant = input(0);
  readonly compact = input(false);
  readonly tone = computed(() => Math.abs(this.variant()) % 6);
}
