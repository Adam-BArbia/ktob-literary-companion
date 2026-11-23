import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const paths: Record<string, string[]> = {
  'book-open': ['M12 7C9 4 4 4 2 5v15c3-1 7-1 10 1 3-2 7-2 10-1V5c-2-1-7-1-10 2Z', 'M12 7v14'],
  book: [
    'M4 19.5A2.5 2.5 0 0 1 6.5 17H20',
    'M6.5 3H20v19H6.5A2.5 2.5 0 0 1 4 19.5v-14A2.5 2.5 0 0 1 6.5 3Z',
  ],
  library: ['M4 4v16', 'M8 4v16', 'M12 4v16', 'm16 4 4 16', 'M3 20h18'],
  search: ['M21 21l-5-5', 'M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0'],
  plus: ['M12 5v14', 'M5 12h14'],
  'arrow-right': ['M5 12h14', 'm12 5 7 7-7 7'],
  'arrow-left': ['M19 12H5', 'm12 5-7 7 7 7'],
  'arrow-up-right': ['M7 17 17 7', 'M7 7h10v10'],
  check: ['m5 12 4 4L19 6'],
  lock: ['M5 10h14v11H5Z', 'M8 10V7a4 4 0 0 1 8 0v3', 'M12 14v3'],
  shield: ['M12 3 3 7v6c0 4 5 7 9 9 4-2 9-5 9-9V7Z', 'm8 12 3 3 5-6'],
  grid: ['M3 3h7v7H3Z', 'M14 3h7v7h-7Z', 'M3 14h7v7H3Z', 'M14 14h7v7h-7Z'],
  list: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
  archive: ['M3 3h18v5H3Z', 'M5 8v13h14V8', 'M10 12h4'],
  'rotate-ccw': ['M3 10a9 9 0 1 1 2.5 9', 'M3 3v7h7'],
  x: ['m6 6 12 12', 'M6 18 18 6'],
  'chevron-down': ['m6 9 6 6 6-6'],
  'chevron-right': ['m9 6 6 6-6 6'],
  'alert-circle': ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0', 'M12 8v5', 'M12 16h.01'],
  user: ['M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0', 'M4 21v-2a8 8 0 0 1 16 0v2'],
  mail: ['M3 5h18v14H3Z', 'm3 6 9 7 9-7'],
  eye: ['M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12', 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0'],
  'eye-off': [
    'm3 3 18 18',
    'M10.5 5.1Q17 3 22 12a19 19 0 0 1-3.1 3.9',
    'M6.1 6.1A20 20 0 0 0 2 12s4 7 10 7c1.6 0 3.1-.5 4.4-1.2',
    'M10 10a3 3 0 0 0 4 4',
  ],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  home: ['m3 10 9-7 9 7v11H3Z', 'M9 21v-8h6v8'],
  bookmark: ['M6 3h12v19l-6-4-6 4Z'],
  sparkles: ['m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z'],
  leaf: ['M20 3C5 2 2 12 6 17c5 5 15 2 14-14Z', 'M3 21 15 9'],
  'log-out': ['M9 4H3v16h6', 'M9 12h12', 'm17 8 4 4-4 4'],
  loader: ['M21 12a9 9 0 1 1-9-9'],
  clock: ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0', 'M12 6v6l4 2'],
  heart: [
    'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  ],
};
@Component({
  selector: 'ktob-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', style: 'display:inline-flex;flex-shrink:0;vertical-align:middle' },
  template: `<svg
    [attr.width]="size()"
    [attr.height]="size()"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.65"
    stroke-linecap="round"
    stroke-linejoin="round"
    focusable="false"
  >
    @for (path of iconPaths(); track $index) {
      <path [attr.d]="path" />
    }
  </svg>`,
})
export class IconComponent {
  readonly name = input('book-open');
  readonly size = input(20);
  readonly iconPaths = computed(() => paths[this.name()] ?? paths['book-open']);
}
