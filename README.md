# Hypertrophy App

PWA mobile-first de suivi d'entraînement orientée hypertrophie.

## Objectif du MVP

- consulter le programme de la semaine ;
- démarrer une séance ;
- saisir charge, répétitions et RIR ;
- lancer automatiquement le minuteur de repos ;
- conserver l'historique hors ligne sur l'iPhone ;
- proposer une progression simple à la séance suivante.

## Architecture cible

- Angular standalone + TypeScript strict ;
- PWA installable sur iOS ;
- IndexedDB via Dexie pour le fonctionnement hors ligne ;
- Supabase dans un second temps pour la sauvegarde et la synchronisation ;
- interface mobile-first et mode sombre.

## Roadmap

1. Socle Angular/PWA et navigation mobile.
2. Modèle de données et programme préchargé.
3. Écran de séance, saisie des séries et minuteur.
4. Historique et surcharge progressive.
5. Synchronisation Supabase.

> Projet en cours d'initialisation.
