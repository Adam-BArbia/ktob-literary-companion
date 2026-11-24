import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../shared/icon.component';
@Component({
  selector: 'app-privacy-page',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<article class="info-page">
    <p class="eyebrow">YOUR BOOKS. YOUR SPACE.</p>
    <h1 class="page-heading">A clear view of<br />your privacy.</h1>
    <p class="lead">Here’s how the current KTOB app handles your reading space.</p>
    <div class="info-block">
      <h2>Your personal library</h2>
      <p>
        Your saved books, archived entries, and display name are linked to your account. Other
        readers cannot view your library or the private book entries you create.
      </p>
    </div>
    <div class="info-block">
      <h2>Your account</h2>
      <p>
        Supabase manages email and password authentication. Your browser keeps your sign-in session
        so you can return to your library. You can sign out from the navigation.
      </p>
    </div>
    <div class="info-block">
      <h2>Book searches</h2>
      <p>
        When you search the catalog, your search text is sent through KTOB to Open Library to find
        book metadata. Your private library is not published to the catalog. The illustrated covers
        in KTOB are decorative title designs, not publisher cover images.
      </p>
    </div>
    <div class="info-block">
      <h2>AI only with your permission</h2>
      <p>
        The literary companion uses Groq only after you explicitly allow AI processing. When you
        send a question, KTOB shares that question, limited eligible conversation history, and the
        selected book’s title, author and language. Your account details, saved journal and reading
        history are not automatically added. Anything you choose to type or paste into a question is
        part of that request. Personalization settings are separate and are not used in this
        version.
      </p>
      <p>
        Conversations are saved privately in your KTOB account. Groq’s global Zero Data Retention
        setting is enabled for inference; operational metadata and limited legal or security
        exceptions remain subject to its data policies. Turning off your permission stops future
        requests. It cannot recall data already sent and does not erase saved conversations.
      </p>
      <p>
        No spoilers is the default for every question, with best-effort protection rather than a
        guarantee. Full-book spoilers require a fresh confirmation for that question. Earlier
        full-spoiler turns are excluded from later no-spoiler requests. AI answers can contain
        mistakes; check facts and quotations.
      </p>
    </div>
    <div class="info-block">
      <h2>Archiving and deletion</h2>
      <p>
        Archiving hides a book from your active shelf and lets you restore it. It does not delete
        the record. Account deletion and data export are not available in this version.
      </p>
    </div>
    <p class="info-caption">This describes the current app’s behavior and available controls.</p>
    <a routerLink="/settings" class="btn btn-secondary"
      >Account & privacy <ktob-icon name="arrow-right" [size]="17"
    /></a>
  </article>`,
  styleUrl: './info.page.css',
})
export class PrivacyPage {}
