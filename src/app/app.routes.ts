import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'connexion',
    title: 'Connexion · Hypertrophy',
    loadComponent: () =>
      import('./features/auth/auth.page').then((component) => component.AuthPage),
  },
  {
    path: '',
    loadComponent: () => import('./layout/app-shell').then((component) => component.AppShell),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'accueil',
      },
      {
        path: 'accueil',
        title: 'Accueil · Hypertrophy',
        loadComponent: () =>
          import('./features/home/home.page').then((component) => component.HomePage),
      },
      {
        path: 'programme',
        title: 'Programme · Hypertrophy',
        loadComponent: () =>
          import('./features/program/program.page').then((component) => component.ProgramPage),
      },
      {
        path: 'seance',
        title: 'Séance · Hypertrophy',
        loadComponent: () =>
          import('./features/session/session.page').then((component) => component.SessionPage),
      },
      {
        path: 'stats',
        title: 'Statistiques · Hypertrophy',
        loadComponent: () =>
          import('./features/stats/stats.page').then((component) => component.StatsPage),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'accueil',
  },
];
