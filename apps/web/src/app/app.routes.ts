import { Routes } from '@angular/router';
import { DashboardPage } from './pages/dashboard.page';
import { SectionPage } from './pages/section.page';
import { AuthPage } from './pages/auth.page';
import { LibraryPage } from './pages/library.page';
import { CatalogPage } from './pages/catalog.page';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: DashboardPage, title: 'Home · KTOB' },
  { path: 'auth', component: AuthPage, title: 'Sign in · KTOB' },
  { path: 'library', component: LibraryPage, canActivate: [authGuard], title: 'My library · KTOB' },
  { path: 'catalog/search', component: CatalogPage, canActivate: [authGuard], title: 'Discover · KTOB' },
  { path: 'advisor', component: SectionPage, canActivate: [authGuard],
    data: { title: 'Literary advisor', eyebrow: 'THINK BETWEEN THE LINES', description: 'Literary conversations and recommendations will require your explicit AI processing consent. No provider is enabled.', milestone: 'Sprint 4' }, title: 'Advisor · KTOB' },
  { path: 'collections', component: SectionPage, canActivate: [authGuard],
    data: { title: 'Collections', eyebrow: 'MAKE IT YOURS', description: 'Organize works into personal reading collections, independently of reading status.', milestone: 'Sprint 2' }, title: 'Collections · KTOB' },
  { path: 'settings', component: SectionPage, canActivate: [authGuard],
    data: { title: 'Settings & privacy', eyebrow: 'YOUR WORDS, YOUR RULES', description: 'Your display name, privacy controls, content boundaries and essentials export will appear here.', milestone: 'Sprint 3' }, title: 'Settings · KTOB' },
  { path: '**', redirectTo: '' },
];
