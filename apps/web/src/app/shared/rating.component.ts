import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

let nextRatingId = 0;

/** Native radio inputs provide half-star keyboard choices as well as touch targets. */
@Component({
  selector: 'ktob-rating',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rating" [class.readonly]="readonly()">
      <div
        class="stars"
        [attr.role]="readonly() ? 'img' : 'radiogroup'"
        [attr.aria-label]="readonly() ? description() : label()"
        (pointerleave)="preview.set(null)"
      >
        @for (star of stars; track star) {
          <span class="star" [class.focused]="focusedStar() === star">
            <svg class="star-art" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <defs>
                <clipPath [id]="groupName + '-clip-' + star" clipPathUnits="userSpaceOnUse">
                  <rect x="0" y="0" [attr.width]="fill(star) * 0.24" height="24" />
                </clipPath>
              </defs>
              <path class="outline" [attr.d]="starPath" />
              <path
                class="fill"
                [attr.d]="starPath"
                [attr.clip-path]="'url(#' + groupName + '-clip-' + star + ')'"
              />
            </svg>
            @if (!readonly()) {
              @for (choice of choices(star); track choice) {
                <input
                  type="radio"
                  [name]="groupName"
                  [value]="choice"
                  [class.half]="star > 1"
                  [class.right]="choice === star && star > 1"
                  [checked]="value() === choice"
                  [disabled]="disabled()"
                  [attr.aria-label]="'Rate ' + choice + ' out of 5 stars'"
                  (pointerenter)="preview.set(choice)"
                  (focus)="onFocus(choice, star)"
                  (blur)="focusedStar.set(null); preview.set(null)"
                  (change)="valueChange.emit(choice)"
                />
              }
            }
          </span>
        }
      </div>
      @if (!readonly()) {
        <span class="rating-value" aria-live="polite"
          >{{ preview() ?? value() ?? 'Unrated'
          }}{{ (preview() ?? value()) !== null ? ' / 5' : '' }}</span
        >
        @if (value() !== null) {
          <button
            type="button"
            class="clear"
            [disabled]="disabled()"
            (click)="clear()"
            aria-label="Clear rating"
          >
            Clear
          </button>
        }
      } @else if (value() !== null) {
        <span class="rating-value" aria-hidden="true">{{ value() }}</span>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .rating {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .stars {
      display: inline-flex;
      flex: none;
      gap: 0;
    }
    .star {
      position: relative;
      display: block;
      width: 48px;
      height: 48px;
      border-radius: 5px;
    }
    .star-art {
      position: absolute;
      left: 5px;
      top: 5px;
      width: 38px;
      height: 38px;
      display: block;
      pointer-events: none;
    }
    .outline {
      fill: #dfe4dc;
    }
    .fill {
      fill: #a45e3d;
    }
    .star input {
      position: absolute;
      inset: 0;
      opacity: 0;
      margin: 0;
      width: 100%;
      height: 100%;
      cursor: pointer;
    }
    .star input.half {
      width: 50%;
    }
    .star input.right {
      left: 50%;
    }
    .star:has(input:focus-visible) {
      outline: 3px solid #8f5c38;
      outline-offset: 2px;
    }
    .star:has(input:disabled) {
      opacity: 0.6;
    }
    .star input:disabled {
      cursor: not-allowed;
    }
    .rating-value {
      font-size: 12px;
      color: #64736b;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
    .clear {
      border: 0;
      background: transparent;
      text-decoration: underline;
      text-underline-offset: 3px;
      color: #64736b;
      min-height: 44px;
      padding: 4px;
      font-size: 12px;
    }
    .readonly {
      gap: 7px;
    }
    .readonly .star {
      width: 16px;
      height: 22px;
    }
    .readonly .star-art {
      left: 0;
      top: 3px;
      width: 16px;
      height: 16px;
    }
    .readonly .rating-value {
      color: #a45e3d;
      font-weight: 600;
    }
    .readonly .stars {
      pointer-events: none;
    }
    @media (max-width: 380px) {
      .rating {
        gap: 7px;
      }
    }
  `,
})
export class RatingComponent {
  readonly value = input<number | null>(null);
  readonly readonly = input(false);
  readonly disabled = input(false);
  readonly label = input('Your rating, from 1 to 5 stars in half-star steps');
  readonly valueChange = output<number | null>();
  readonly stars = [1, 2, 3, 4, 5];
  readonly starPath =
    'M12 2.5 14.9 8.4 21.4 9.3 16.7 13.9 17.8 20.4 12 17.3 6.2 20.4 7.3 13.9 2.6 9.3 9.1 8.4Z';
  readonly groupName = `rating-${++nextRatingId}`;
  readonly preview = signal<number | null>(null);
  readonly focusedStar = signal<number | null>(null);
  readonly description = computed(() =>
    this.value() === null ? 'Not rated' : `${this.value()} out of 5 stars`,
  );

  choices(star: number): number[] {
    return star === 1 ? [1] : [star - 0.5, star];
  }
  fill(star: number): number {
    return Math.max(0, Math.min(1, (this.preview() ?? this.value() ?? 0) - star + 1)) * 100;
  }
  onFocus(choice: number, star: number): void {
    this.preview.set(choice);
    this.focusedStar.set(star);
  }
  clear(): void {
    this.preview.set(null);
    this.valueChange.emit(null);
  }
}
