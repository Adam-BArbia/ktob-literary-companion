import { Routes } from '@angular/router';
import { DashboardPage } from './pages/dashboard.page';
import { SectionPage } from './pages/section.page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: DashboardPage, title: 'Home · KTOB' },
  { path: 'library', component: SectionPage, data: { title: 'My library', eyebrow: 'YOUR SHELVES', description: 'Your private library will live here when reading and authentication features are implemented.', milestone: 'Sprint 1–2' }, title: 'My library · KTOB' },
  { path: 'catalog/search', component: SectionPage, data: { title: 'Discover books', eyebrow: 'EXPLORE LITERATURE', description: 'Book lookup will search Open Library through our Java service, with a private manual-entry fallback.', milestone: 'Sprint 1' }, title: 'Discover · KTOB' },
  { path: 'advisor', component: SectionPage, data: { title: 'Literary advisor', eyebrow: 'THINK BETWEEN THE LINES', description: 'Literary conversations and recommendations will require your explicit AI processing consent. No provider is enabled.', milestone: 'Sprint 4' }, title: 'Advisor · KTOB' },
  { path: 'collections', component: SectionPage, data: { title: 'Collections', eyebrow: 'MAKE IT YOURS', description: 'Organize works into personal reading collections, independently of reading status.', milestone: 'Sprint 2' }, title: 'Collections · KTOB' },
  { path: 'settings', component: SectionPage, data: { title: 'Settings & privacy', eyebrow: 'YOUR WORDS, YOUR RULES', description: 'Your display name, privacy controls, content boundaries and essentials export will appear here.', milestone: 'Sprint 3' }, title: 'Settings · KTOB' },
  { path: '**', redirectTo: '' },
];
