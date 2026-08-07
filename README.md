# Hypertrophy App

PWA Angular mobile-first de suivi d’entraînement, orientée hypertrophie et performance.

## MVP actuel

- accueil avec séance du jour et aperçu de progression ;
- programme hypertrophie 7 jours préchargé ;
- écran de séance avec charge, répétitions, RIR et validation des séries ;
- minuteur de repos automatique ;
- navigation basse flottante pensée pour l’iPhone ;
- installation PWA et cache applicatif ;
- stockage offline-first avec IndexedDB/Dexie ;
- authentification Supabase par lien sécurisé ;
- synchronisation bidirectionnelle IndexedDB ↔ Supabase ;
- file locale avec reprise automatique après une coupure réseau.

## Stack

- Angular 21 standalone et TypeScript strict ;
- Angular Service Worker / PWA ;
- Dexie 4 sur IndexedDB ;
- Supabase Auth et PostgreSQL avec RLS ;
- Vercel pour l’hébergement de production ;
- SCSS sans bibliothèque UI externe.

## Lancer le projet

```bash
pnpm install
pnpm start
```

Puis ouvrir `http://localhost:4200`.

## Vérifications

```bash
pnpm typecheck
pnpm build
```

Le service worker est activé uniquement sur un build de production servi en HTTPS (ou sur localhost).

## Base de données

Les migrations versionnées sont dans `supabase/migrations`. Le schéma contient le catalogue du programme, les journées, les exercices, les séances, les séries et les mensurations. Toutes les tables publiques ont RLS activé ; les données d’entraînement sont limitées à leur propriétaire.

L’URL Supabase et la clé **publishable** utilisées par le navigateur sont dans `src/environments/environment.ts`. Cette clé est publique par conception ; aucune clé `secret` ou `service_role` ne doit être ajoutée au frontend.

## Suite prévue

1. Écran Historique et graphiques de progression.
2. Records personnels et règles de surcharge progressive.
3. Personnalisation du programme et des pas de charge.
