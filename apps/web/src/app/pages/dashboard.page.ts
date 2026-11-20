import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink],
  template: `
    <section class="relative overflow-hidden rounded-[28px] border border-[#e7dcd2] bg-[#f8f1e7] px-6 py-10 shadow-sm sm:px-12 sm:py-16">
      <div class="pointer-events-none absolute -right-10 -top-28 size-80 rounded-full border-[38px] border-[#e4d4c2] opacity-65 sm:size-[470px]"></div>
      <div class="pointer-events-none absolute -bottom-32 right-16 h-56 w-32 rotate-[-25deg] rounded-full bg-[#d2b8a0]/45 blur-3xl"></div>
      <div class="relative max-w-[670px]">
        <div class="mb-7 inline-flex items-center gap-2 rounded-full border border-[#d9c7b5] bg-white/70 px-3 py-1.5 text-[11px] font-bold tracking-[.18em] text-[#8b624a]">
          <span aria-hidden="true" class="size-1.5 rounded-full bg-[#a16b49]"></span>
          A SPACE FOR EVERY STORY
        </div>
        <h1 class="max-w-[620px] font-serif text-[clamp(2.8rem,5.3vw,5rem)] leading-[1.06] tracking-[-.045em] text-[#352d2a]">
          A little more room<br>for <em class="font-normal text-[#a46c4c]">wonder.</em>
        </h1>
        <p class="mt-6 max-w-[500px] text-base leading-7 text-[#776a61] sm:text-lg">Collect the books that move you. Keep the thoughts that stay with you. Find your way to the next great read.</p>
        <div class="mt-9 flex flex-wrap items-center gap-3">
          <a routerLink="/catalog/search" class="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-[#704d3b] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#563b2f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#704d3b]">
            Discover books <span aria-hidden="true">↗</span>
          </a>
          <a routerLink="/library" class="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#cdbbae] bg-white/70 px-6 py-3 text-sm font-semibold text-[#694d3d] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#704d3b]">My library</a>
        </div>
      </div>
      <div class="pointer-events-none absolute -bottom-8 right-2 hidden rotate-[-11deg] select-none font-serif text-[11rem] leading-none text-[#bca084]/30 lg:block" aria-hidden="true">&amp;</div>
    </section>

    <section class="mt-12">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="text-[11px] font-bold tracking-[.2em] text-[#a16b49]">THE READER'S DESK</p>
          <h2 class="mt-2 font-serif text-[2rem] tracking-tight text-[#352d2a]">Your literary corner</h2>
        </div>
        <span class="rounded-full border border-[#e4dcd5] px-3 py-1.5 text-xs text-[#74695f]">Workspace preview · Sprint 0</span>
      </div>
      <div class="mt-6 grid gap-4 md:grid-cols-3">
        <a routerLink="/library" class="group rounded-2xl border border-[#e8e1da] bg-white p-6 transition hover:-translate-y-1 hover:border-[#d2b7a2] hover:shadow-lg hover:shadow-[#a68b79]/10">
          <div class="flex size-12 items-center justify-center rounded-xl bg-[#f3e6da] text-2xl text-[#a26847]" aria-hidden="true">◫</div>
          <h3 class="mt-6 font-serif text-2xl text-[#3e312b]">Your library</h3>
          <p class="mt-2 min-h-16 text-sm leading-6 text-[#82776d]">A home for the books you've read, loved, and want to discover.</p>
          <div class="mt-6 flex items-center justify-between text-xs font-bold text-[#865c47]"><span>Explore shelf</span><span aria-hidden="true" class="text-lg transition group-hover:translate-x-1">→</span></div>
        </a>
        <a routerLink="/collections" class="group rounded-2xl border border-[#e8e1da] bg-white p-6 transition hover:-translate-y-1 hover:border-[#d2b7a2] hover:shadow-lg hover:shadow-[#a68b79]/10">
          <div class="flex size-12 items-center justify-center rounded-xl bg-[#e9ede5] text-2xl text-[#73806a]" aria-hidden="true">▤</div>
          <h3 class="mt-6 font-serif text-2xl text-[#3e312b]">Collections</h3>
          <p class="mt-2 min-h-16 text-sm leading-6 text-[#82776d]">Make little worlds of your own, one thoughtful collection at a time.</p>
          <div class="mt-6 flex items-center justify-between text-xs font-bold text-[#865c47]"><span>Browse collections</span><span aria-hidden="true" class="text-lg transition group-hover:translate-x-1">→</span></div>
        </a>
        <a routerLink="/advisor" class="group rounded-2xl border border-[#e8e1da] bg-white p-6 transition hover:-translate-y-1 hover:border-[#d2b7a2] hover:shadow-lg hover:shadow-[#a68b79]/10">
          <div class="flex size-12 items-center justify-center rounded-xl bg-[#eae5ed] text-2xl text-[#857092]" aria-hidden="true">✧</div>
          <h3 class="mt-6 font-serif text-2xl text-[#3e312b]">Literary advisor</h3>
          <p class="mt-2 min-h-16 text-sm leading-6 text-[#82776d]">One day, a thoughtful conversation with stories and characters.</p>
          <div class="mt-6 flex items-center justify-between text-xs font-bold text-[#865c47]"><span>Preview advisor</span><span aria-hidden="true" class="text-lg transition group-hover:translate-x-1">→</span></div>
        </a>
      </div>
    </section>
    <section class="mt-10 rounded-2xl border border-[#e8e1da] bg-white px-6 py-6 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:px-8">
      <div>
        <p class="text-[11px] font-bold tracking-[.17em] text-[#a16b49]">A NOTE FROM KTOB</p>
        <h2 class="mt-2 font-serif text-xl text-[#3d332e]">Every book leaves a trace.</h2>
        <p class="mt-2 max-w-[580px] text-sm leading-6 text-[#7b7068]">This is the first foundation of KTOB. Your library, journal and private reading history are being built—no sample books or personal records are presented as real.</p>
      </div>
      <a routerLink="/settings" class="mt-5 inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-[#865c47] hover:underline sm:mt-0">Privacy first <span aria-hidden="true">↗</span></a>
    </section>
  `,
})
export class DashboardPage {}
