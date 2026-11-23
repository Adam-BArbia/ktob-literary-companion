import { TestBed } from '@angular/core/testing';
import { RatingComponent } from './rating.component';

describe('Half-star rating control', () => {
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
    expect(fifthStar.querySelector('path.outline')?.getAttribute('d')).toBe(
      fifthStar.querySelector('path.fill')?.getAttribute('d'),
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
