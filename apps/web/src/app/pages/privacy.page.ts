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
      <h2>No AI processing is enabled</h2>
      <p>
        The literary advisor is not available yet. The app does not currently send your books or
        personal reading data to an AI provider.
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
