import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-section-page',
  imports: [RouterLink],
  template: `
    <section class="mx-auto max-w-[860px] py-12 sm:py-20">
      <p class="text-xs font-bold tracking-[.21em] text-[#a16b49]">{{ eyebrow }}</p>
      <h1 class="mt-4 font-serif text-[clamp(2.8rem,6vw,4.8rem)] leading-[1.08] tracking-tight text-[#352d2a]">{{ title }}</h1>
      <p class="mt-6 max-w-2xl text-lg leading-8 text-[#7b6d63]">{{ description }}</p>
      <div class="mt-12 flex flex-col gap-4 rounded-2xl border border-[#e7dcd2] bg-white p-7 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[.18em] text-[#9a7157]">Implementation status</p>
          <h2 class="mt-2 font-serif text-2xl text-[#352d2a]">Coming in {{ milestone }}</h2>
          <p class="mt-1 text-sm leading-6 text-[#877b72]">This is a navigable preview, not a working data feature.</p>
        </div>
        <a routerLink="/" class="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#d7c7bb] px-5 py-2.5 text-sm font-semibold text-[#704d3b] transition hover:bg-[#f9f3ed]">← Back home</a>
      </div>
    </section>
  `,
})
export class SectionPage {
  private readonly data = inject(ActivatedRoute).snapshot.data;
  readonly title = this.data['title'] as string;
  readonly eyebrow = this.data['eyebrow'] as string;
  readonly description = this.data['description'] as string;
  readonly milestone = this.data['milestone'] as string;
}
