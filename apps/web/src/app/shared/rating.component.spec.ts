import { TestBed } from '@angular/core/testing';
import { RatingComponent } from './rating.component';

describe('Half-star rating control', () => {
  it('does not acquire Tailwind utility outlines on editable or read-only SVG stars', () => {
    const utility = document.createElement('style');
    utility.textContent = '.outline { outline-style: solid; outline-width: 1px; }';
    document.head.appendChild(utility);
    try {
      const fixture = TestBed.createComponent(RatingComponent);
      fixture.componentRef.setInput('value', 4.5);
      for (const readonly of [false, true]) {
        fixture.componentRef.setInput('readonly', readonly);
        fixture.detectChanges();
        const paths = Array.from(fixture.nativeElement.querySelectorAll('svg path')) as SVGElement[];
        expect(paths).toHaveLength(10);
        for (const path of paths) {
          expect(getComputedStyle(path).outlineStyle).not.toBe('solid');
        }
      }
    } finally {
      utility.remove();
    }
  });

  it('offers native keyboard-operable radio choices from 1 through 5, with half steps', () => {
    const fixture = TestBed.createComponent(RatingComponent);
    fixture.componentRef.setInput('value', 4.5);
    fixture.detectChanges();
    const radios = Array.from(
      fixture.nativeElement.querySelectorAll('input[type=radio]'),
    ) as HTMLInputElement[];
    expect(radios.map((input) => Number(input.value))).toEqual([1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]);
    expect(radios.filter((input) => input.checked).map((input) => input.value)).toEqual(['4.5']);
    expect(new Set(radios.map((input) => input.name)).size).toBe(1);
    expect(radios[7].getAttribute('aria-label')).toBe('Rate 4.5 out of 5 stars');
    const changed = vi.fn();
    fixture.componentInstance.valueChange.subscribe(changed);
    radios[8].dispatchEvent(new Event('change'));
    expect(changed).toHaveBeenCalledWith(5);
  });

  it('previews focus without changing the saved input and can explicitly clear a rating', () => {
    const fixture = TestBed.createComponent(RatingComponent);
    fixture.componentRef.setInput('value', 4.5);
    fixture.detectChanges();
    const changed = vi.fn();
    fixture.componentInstance.valueChange.subscribe(changed);
    fixture.componentInstance.onFocus(2.5, 3);
    expect(fixture.componentInstance.fill(3)).toBe(50);
    expect(fixture.componentInstance.value()).toBe(4.5);
    expect(changed).not.toHaveBeenCalled();
    fixture.componentInstance.clear();
    expect(changed).toHaveBeenCalledWith(null);
    expect(fixture.componentInstance.preview()).toBeNull();
  });

  it('renders accessible read-only stars without interactive controls', () => {
    const fixture = TestBed.createComponent(RatingComponent);
    fixture.componentRef.setInput('value', 4.5);
    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input')).toBeNull();
    expect(fixture.nativeElement.querySelector('[role=img]').getAttribute('aria-label')).toBe(
      '4.5 out of 5 stars',
    );
    expect(fixture.componentInstance.fill(5)).toBe(50);
  });

  it('clips matching SVG geometry at the exact midpoint for a half star in both sizes', () => {
    const fixture = TestBed.createComponent(RatingComponent);
    fixture.componentRef.setInput('value', 4.5);
    fixture.detectChanges();
    const fifthStar = fixture.nativeElement.querySelectorAll('svg')[4] as SVGElement;
    expect(fifthStar.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(fifthStar.querySelector('rect')?.getAttribute('width')).toBe('12');
    expect(fifthStar.querySelector('path.ktob-rating-track')?.getAttribute('d')).toBe(
      fifthStar.querySelector('path.ktob-rating-fill')?.getAttribute('d'),
    );
    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelectorAll('svg')[4].querySelector('rect').getAttribute('width'),
    ).toBe('12');
    fixture.componentRef.setInput('value', 5);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelectorAll('svg')[4].querySelector('rect').getAttribute('width'),
    ).toBe('24');
  });
});
