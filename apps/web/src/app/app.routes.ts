import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/dashboard.page').then((m) => m.DashboardPage),
    title: 'A home for your reading life · KTOB',
  },
  {
    path: 'auth/sign-up',
    loadComponent: () => import('./pages/sign-up.page').then((m) => m.SignUpPage),
    title: 'Create your account · KTOB',
  },
  {
    path: 'auth',
    pathMatch: 'full',
    loadComponent: () => import('./pages/auth.page').then((m) => m.AuthPage),
    title: 'Welcome back · KTOB',
  },
  { path: 'sign-up', redirectTo: 'auth/sign-up', pathMatch: 'full' },
  { path: 'sign-in', redirectTo: 'auth', pathMatch: 'full' },
  {
    path: 'library',
    loadComponent: () => import('./pages/library.page').then((m) => m.LibraryPage),
    canActivate: [authGuard],
    title: 'My library · KTOB',
  },
  {
    path: 'books/:entryId',
    loadComponent: () => import('./pages/book.page').then((m) => m.BookPage),
    canActivate: [authGuard],
    canDeactivate: [
      (page: { hasUnsavedDraft(): boolean }) =>
        !page.hasUnsavedDraft() ||
        window.confirm('Leave this book and discard your unsaved journal draft?'),
    ],
    title: 'Your book & journal · KTOB',
  },
  {
    path: 'diary',
    loadComponent: () => import('./pages/diary.page').then((m) => m.DiaryPage),
    canActivate: [authGuard],
    title: 'My reading diary · KTOB',
  },
  {
    path: 'discover/works/:workId',
    loadComponent: () => import('./pages/book-preview.page').then((m) => m.BookPreviewPage),
    canActivate: [authGuard],
    title: 'Explore a book · KTOB',
  },
  {
    path: 'catalog/search',
    loadComponent: () => import('./pages/catalog.page').then((m) => m.CatalogPage),
    canActivate: [authGuard],
    title: 'Discover your next read · KTOB',
  },
  {
    path: 'readers',
    loadComponent: () => import('./pages/reader-directory.page').then((m) => m.ReaderDirectoryPage),
    canActivate: [authGuard],
    title: 'Find readers · KTOB',
  },
  {
    path: 'readers/:username',
    loadComponent: () => import('./pages/reader-directory.page').then((m) => m.ReaderDirectoryPage),
    canActivate: [authGuard],
    title: 'Reader profile · KTOB',
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings.page').then((m) => m.SettingsPage),
    canActivate: [authGuard],
    title: 'Account & privacy · KTOB',
  },
  {
    path: 'advisor',
    loadComponent: () => import('./pages/advisor.page').then((m) => m.AdvisorPage),
    canActivate: [authGuard],
    canDeactivate: [
      (page: { hasUnsavedDraft(): boolean }) =>
        !page.hasUnsavedDraft() ||
        window.confirm(
          'Leave this conversation and discard your unsent draft? A request already sent may still finish.',
        ),
    ],
    title: 'Literary companion · KTOB',
  },
  {
    path: 'collections',
    loadComponent: () => import('./pages/section.page').then((m) => m.SectionPage),
    canActivate: [authGuard],
    data: {
      title: 'Little worlds of your own.',
      icon: 'library',
      description:
        'Personal collections are on their way. For now, keep your discoveries together in your library, ready for whatever you feel like reading next.',
    },
    title: 'Collections · KTOB',
  },
  {
    path: 'about',
    loadComponent: () => import('./pages/about.page').then((m) => m.AboutPage),
    title: 'About KTOB',
  },
  {
    path: 'privacy',
    loadComponent: () => import('./pages/privacy.page').then((m) => m.PrivacyPage),
    title: 'Your privacy · KTOB',
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found.page').then((m) => m.NotFoundPage),
    title: 'Page not found · KTOB',
  },
];
