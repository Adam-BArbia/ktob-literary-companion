import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'ktob-auth-frame',
  imports: [RouterLink],
  template: `
    <div class="auth-layout">
      <aside class="auth-story" aria-label="A space for your reading life">
        <a routerLink="/" class="story-wordmark" aria-label="KTOB home">ktob<span>.</span></a>
        <div class="story-copy">
          <p class="story-eyebrow">KEEP THOUGHTS ON BOOKS</p>
          <h2>For the books.<br />And the person<br /><em>between the pages.</em></h2>
          <p>
            A quiet home for your next read,<br />your old favorites, and all the stories in
            between.
          </p>
        </div>
        <div class="story-art" aria-hidden="true">
          <div class="art-ring ring-one"></div>
          <div class="art-ring ring-two"></div>
          <div class="art-book book-back">
            <span>THE ART<br />OF<br />NOTICING</span><i></i>
          </div>
          <div class="art-book book-front">
            <small>A READER'S COMPANION</small><span>One more<br /><em>chapter.</em></span>
            <div class="book-flower">✳</div>
            <small>THE EVERYDAY EDITION</small>
          </div>
          <span class="art-star star-one">✧</span><span class="art-star star-two">✳</span>
        </div>
        <p class="story-footnote">
          <span aria-hidden="true">○</span> A little space. Entirely yours.
        </p>
      </aside>
      <section class="auth-content">
        <a class="auth-back" routerLink="/"><span aria-hidden="true">←</span> Back to home</a>
        <div class="auth-form-panel"><ng-content /></div>
        <p class="auth-bottom-note">Your library is private. Your next chapter is up to you.</p>
      </section>
    </div>
  `,
  styleUrl: './auth-frame.css',
})
export class AuthFrameComponent {}
