import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { BookCoverComponent } from './book-cover.component';
import { IconComponent } from './icon.component';

@Component({
  selector: 'ktob-home-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BookCoverComponent, IconComponent],
  templateUrl: './home-hero.component.html',
  styleUrl: './home-hero.component.css',
})
export class HomeHeroComponent {
  readonly auth = inject(AuthService);
}
