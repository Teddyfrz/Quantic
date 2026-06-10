# QUANTIC_CONTEXT.md

> Fichier de continuité entre IA et développeurs. Mis à jour à chaque étape importante.

## État actuel du projet

Projet **greenfield** initialisé. Monorepo npm workspaces : API Fastify + client desktop Tauri/React.
**Lot 1 terminé** : fondations, authentification (connexion + inscription par code d'invitation), rôles user/admin, panel admin minimal, direction artistique de base.
**Lot 3 terminé** : modules Projets + Tâches (CRUD, isolation par utilisateur, progression calculée, kanban à faire/en cours/terminé).
**Lot 2 terminé** : Dashboard refondu (Aujourd'hui = tâches ouvertes agrégées, Projet actif + progression, Notes récentes).
**GUI flottante d'édition** : modale réutilisable pour projets et tâches (et notes).
**Lot 4 terminé** : module Notes (CRUD, recherche, lien projet) branché au Dashboard + page Projet ; **Base de connaissances** (catégories + pages, recherche titre/contenu, consultation, édition via modales, distincte des Notes).
**Lot 5 terminé** : **Calendrier** (grille mensuelle, événements + échéances de tâches en lecture seule, modale d'événement) et **Contacts** (CRUD + recherche nom/email/entreprise).
**Lot 6 terminé** : Personnel complet — **Suivi** (entrée quotidienne upsert, tendance 7 j), **Santé** (poids/eau/ressenti + séances de sport, tendance 30 j), **Finance** (transactions, budgets mensuels, solde + lecture analytique par catégorie).
**Lot 7 terminé** : **Settings** (2 thèmes Sombre/Ardoise, météo on/off + ville → widget dashboard via Open-Meteo, stats API en ligne/version/latence, infos compte + déconnexion) et page **Compte** (avatar initiales, bio, liens). → **Tous les modules du cahier des charges sont implémentés.**

## Architecture / Choix techniques

- **Monorepo** npm workspaces : `apps/api`, `apps/desktop`, `packages/shared`.
- **API** : Fastify 4 + TypeScript strict (ESM) + Prisma (SQLite) + `@fastify/jwt` + bcryptjs + Zod (validation serveur).
- **Desktop** : Tauri 2 + React 18 + Vite 5 + TypeScript strict. Le frontend tourne en web via Vite (`port 1420`).
- **Types partagés** : `@quantic/shared` (compilé en `dist/`, consommé par API et desktop).
- **Auth** : JWT Bearer stocké dans `localStorage` (`quantic.token`). Payload `{ sub, role }`.

## Modules présents

| Module | État |
|---|---|
| Auth (login) | ✅ terminé |
| Auth (inscription par code) | ✅ terminé |
| Rôles user/admin | ✅ terminé |
| Panel admin minimal | ✅ terminé |
| DA globale (palette noire) | ✅ base posée |
| Dashboard | ✅ terminé |
| Projets | ✅ terminé |
| Tâches | ✅ terminé |
| Notes | ✅ terminé |
| Base de connaissances | ✅ terminé |
| Calendrier | ✅ terminé |
| Contacts | ✅ terminé |
| Personnel > Suivi | ✅ terminé (refonte wellness : métriques + sparklines + plage 7/14/30) |
| Personnel > Santé | ✅ terminé (refonte : anneau d'hydratation, sparklines poids/eau, séances en cartes) |
| Personnel > Finance | ✅ terminé |
| Settings | ✅ terminé |
| Social (profil/identité, ex-Compte) | ✅ terminé |
| Notes / Base de connaissances | ⏳ à faire |
| Calendrier / Contacts | ⏳ à faire |
| Personnel (Suivi/Santé/Finance) | ⏳ à faire |
| Settings / Compte | ⏳ à faire |

## Routes / API existantes

- `GET  /health` — état + version de l'API.
- `POST /auth/login` — `{ email, password }` → `{ token, user }`.
- `POST /auth/register` — `{ name, email, password, invitationCode }` → `{ token, user }`. Valide le code (existence, actif, non expiré, quota non atteint), incrémente `usedCount`, désactive si quota atteint.
- `GET  /auth/me` — (auth) profil courant.
- `GET  /admin/users` — (admin) liste des utilisateurs.
- `PATCH /admin/users/:id/role` — (admin) change le rôle (garde-fou : pas son propre rôle).
- `DELETE /admin/users/:id` — (admin) supprime un utilisateur + ses données (cascade ; pas soi-même).
- `GET  /admin/stats` — (admin) statistiques BDD : comptage par entité (groupes Comptes/Productivité/Personnel), `totalRows`, `users`, `admins`, `activeInvites`, `dbSizeBytes` (taille du fichier SQLite).
- `GET  /admin/invitations` — (admin) liste des codes.
- `POST /admin/invitations` — (admin) crée un code (`maxUses`, `expiresAt` optionnels). Format `QNT-XXXXXXXX`.
- `PATCH /admin/invitations/:id/disable` — (admin) désactive un code.
- `DELETE /admin/invitations/:id` — (admin) supprime un code.
- `PATCH /auth/me` — (auth) change le nom du compte (2-60).

**Panel admin** (`AdminView.tsx`) en **4 onglets** : **Aperçu** (KPIs + état API live), **Statistiques** (suivi BDD : lignes totales, taille du fichier, comptage par entité regroupé Comptes/Productivité/Personnel avec barres, bouton rafraîchir), **Utilisateurs** (recherche + tri, promouvoir/rétrograder, supprimer avec confirmation, ligne « vous » protégée), **Invitations** (création usages + expiration, copier, désactiver, supprimer).

**Menu compte** (sidebar) : Paramètres + Déconnexion (l'entrée « Mon profil » a été retirée ; Social reste dans la navigation principale).

Protection : `app.authenticate` (auth requise) et `app.requireAdmin` (rôle admin). Vérif **frontend ET API**.

### Projets (auth, scellé `userId`)
- `GET /projects` — liste + méta (`taskCount`, `doneCount`, `progress` 0-100).
- `GET /projects/:id` — détail + `tasks[]`.
- `POST /projects` — `{ name, description?, status? }`.
- `PATCH /projects/:id` — mise à jour partielle.
- `DELETE /projects/:id` — supprime (tâches détachées via `SetNull`).

### Tâches (auth, scellé `userId`)
- `GET /tasks?projectId=&status=` — liste filtrable.
- `POST /tasks` — `{ title, description?, status?, priority?, projectId?, dueDate? }`. Vérifie que `projectId` appartient à l'utilisateur.
- `PATCH /tasks/:id` — mise à jour partielle.
- `DELETE /tasks/:id`.

Progression projet = `round(doneCount / taskCount * 100)`, calculée serveur via `groupBy`.

### Notes (auth, scellé `userId`)
- `GET /notes?projectId=&limit=` — liste (filtre projet, `limit` pour le dashboard).
- `GET /notes/:id` — détail.
- `POST /notes` — `{ title, content?, projectId? }` (vérifie l'appartenance du projet).
- `PATCH /notes/:id` / `DELETE /notes/:id`.

### Base de connaissances (auth, scellé `userId`)
- `GET/POST /kb/categories`, `PATCH/DELETE /kb/categories/:id` (suppression = pages détachées via `SetNull`).
- `GET /kb/pages?categoryId=&q=` — `q` recherche `title` + `content`.
- `GET /kb/pages/:id`, `POST /kb/pages` `{ title, content?, categoryId? }`, `PATCH/DELETE /kb/pages/:id` (vérifie l'appartenance de la catégorie).

### Calendrier (auth, scellé `userId`)
- `GET /events?from=&to=` — bornes sur `startAt`.
- `POST /events` `{ title, description?, startAt, endAt?, allDay?, projectId? }`, `PATCH/DELETE /events/:id`. Les échéances de tâches (`dueDate`) sont affichées en lecture seule côté UI.

### Contacts (auth, scellé `userId`)
- `GET /contacts?q=` — recherche nom / email / entreprise.
- `POST /contacts` `{ name, email?, phone?, company?, type?, note? }`, `PATCH/DELETE /contacts/:id`.

### Personnel — Suivi (auth, scellé `userId`)
- `GET /tracking?days=` (défaut 7), `GET /tracking/:date`, `POST /tracking` (upsert par jour, unique `userId+date`). Champs : mental/energy/stress (1-5), sleepHours, reflection.

### Personnel — Santé (auth, scellé `userId`)
- `GET /health-entries?days=` (défaut 30), `POST /health-entries` (upsert/jour) : weight, water, waterGoal, bodyFeeling, note.
- `GET/POST /sport-sessions?days=`, `PATCH/DELETE /sport-sessions/:id` : activity, durationMin, intensity?, note?.

### Personnel — Finance (auth, scellé `userId`)
- `GET/POST /transactions`, `PATCH/DELETE /transactions/:id` : amount, type (income|expense), category, date, note?.
- `GET/POST /budgets`, `PATCH/DELETE /budgets/:id` : category? (null = global), amount (mensuel).
- `GET /finance/overview` : `balance` (tout temps), `monthIncome`, `monthExpense`, `byCategory[]`, `budgets[]` (used/remaining sur le mois courant).

## Schéma de données (Prisma — SQLite)

- **User** : `id, name, email (unique), password (hash), role ("user"|"admin"), createdAt, updatedAt`.
- **InvitationCode** : `id, code (unique), createdByUserId?, maxUses, usedCount, expiresAt?, isActive, createdAt, updatedAt`.
- **Project** : `id, userId, name, description?, status ("active"|"paused"|"done"), createdAt, updatedAt`. Index `userId`.
- **Task** : `id, userId, projectId?, title, description?, status ("todo"|"doing"|"done"), priority? ("low"|"medium"|"high"), dueDate?, recurrence? ("daily"|"weekly"|"monthly"), tags (JSON string[]), createdAt, updatedAt`. `onDelete: Cascade` (user) / `SetNull` (project).
- **Note** : `id, userId, projectId?, title, content, createdAt, updatedAt`. `onDelete: Cascade` (user) / `SetNull` (project).
- **KbCategory** : `id, userId, name, createdAt, updatedAt`.
- **KbPage** : `id, userId, categoryId?, title, content, createdAt, updatedAt`. `onDelete: Cascade` (user) / `SetNull` (category).
- **CalendarEvent** : `id, userId, projectId?, title, description?, startAt, endAt?, allDay, createdAt, updatedAt`. `onDelete: Cascade` (user) / `SetNull` (project).
- **Contact** : `id, userId, name, email?, phone?, company?, type?, note?, createdAt, updatedAt`.
- **TrackingEntry** : `id, userId, date, mental?, energy?, stress?, sleepHours?, reflection?` — unique `userId+date`.
- **HealthEntry** : `id, userId, date, weight?, water?, waterGoal?, bodyFeeling?, note?` — unique `userId+date`.
- **SportSession** : `id, userId, date, activity, durationMin, intensity?, note?`.
- **Transaction** : `id, userId, amount, type, category, date, note?`.
- **Budget** : `id, userId, category? (null=global), amount`.

Les modèles métier restants (Note, KB, Calendar, Contact, Personnel…) seront ajoutés par lots successifs.

## Fonctionnalités transverses (lot « 4 recos »)

- **Recherche globale ⌘K** (`CommandPalette`) : `GET /search?q=` agrège projets/tâches/notes/pages KB/contacts (5 max chacun). Raccourci Ctrl/⌘+K + bouton « Rechercher » en haut de nav. Sélection → navigue vers le module **et** pré-remplit sa recherche (prop `applySearch` sur les 5 vues liste).
- **Éditeur markdown** (`lib/markdown.ts` renderer sûr — échappe puis applique titres/gras/italique/code/listes/citations/liens/hr ; `components/Markdown.tsx`). Bascule **Écrire/Aperçu** dans NoteEditModal et KbPageEditModal ; la **consultation KB** rend le markdown.
- **Tâches récurrentes** : champ `recurrence` (`daily`/`weekly`/`monthly`) sur Task + éditable dans TaskEditModal. Passage à « terminé » d'une tâche récurrente **avec échéance** → crée automatiquement la prochaine occurrence (`PATCH /tasks/:id` renvoie `{ task, spawned }`).
- **Rappels in-app** (`components/Reminders.tsx`, cloche sidebar) : tâches en retard / dues aujourd'hui + événements du jour, badge de compteur, rafraîchi toutes les 5 min.
- **Dashboard actionnable** : case à cocher pour terminer une tâche d'« Aujourd'hui » + champ d'ajout rapide de tâche.
- **Fix** : sidebar repliée — le logo est masqué et le chevron passe en flux (`position: static`), plus de superposition pointeur/logo. Centrage des icônes corrigé (libellés `display:none` en replié au lieu de width:0 → plus de décalage dû au `gap`/`margin-left:auto`).
- **Tags de tâches** : champ `tags` (JSON `string[]`) sur Task, éditeur à chips dans TaskEditModal (Entrée/virgule), affichage des tags `#xxx` (cliquables → filtre) dans TasksView, **filtre par tag** dans la barre d'outils, recherche globale étendue aux tags. **Gestion des tags** : `TagManagerModal` (bouton « Gérer les tags ») pour renommer/supprimer un tag sur toutes les tâches.
- **Fix sidebar repliée (popups)** : la sidebar passe en `overflow: visible` (le défilement est porté par `.nav-list`), et en mode replié les popups (menu compte, rappels) sortent du rail avec `width: 248px` → plus de texte coupé. Cloche centrée.
- **Markdown** : puces de liste rétablies (`list-style: disc`, `padding-left` + `::marker` violet) — le reset global les avait supprimées.

## Listes (Projets / Tâches / Notes / Contacts)

Barre d'outils cohérente (`.list-toolbar`) sur les 4 listes : **recherche**, **tri** et **compteur** `affichés / total`, plus filtres spécifiques :
- **Projets** : recherche (nom/desc), chips de statut (Tous/Actif/En pause/Terminé + compteurs), tri récents/nom/progression.
- **Tâches** : recherche (titre/desc), chips de statut + sélecteurs priorité & projet, tri récentes/échéance/priorité/titre.
- **Notes** : recherche (titre/contenu), filtre projet (Tous/Sans projet/par projet), tri récentes/titre.
- **Contacts** : recherche serveur, filtre par type (déduit des contacts), tri nom/récents.

Tout est filtré/trié côté client via `useMemo`.

## Composants réutilisables

- **`Modal`** (`components/Modal.tsx`) : GUI flottante (overlay + blur, fermeture clic extérieur / Échap, animations). Base de toutes les éditions.
- **`ProjectEditModal`** : édition nom / description / statut + suppression (avec confirmation).
- **`TaskEditModal`** : édition titre / description / statut / priorité / projet lié / échéance + suppression.
- Ouverture : bouton « Modifier » sur les cartes/headers projet, clic sur le titre d'une tâche (page projet & vue Tâches).

## Préférences & thème

- `lib/prefs.ts` : préférences locales (`localStorage` clé `quantic.prefs`) → `theme` (`sombre`|`ardoise`), `weatherEnabled`, `weatherCity`, `bio`, `links`. `applyTheme` pose `data-theme` sur `<html>` ; `initPrefs()` appelé au démarrage (`main.tsx`).
- 2 thèmes max : **Sombre** (défaut, #030303) et **Blanc** (clair) via overrides `:root[data-theme="blanc"]` (tokens + `.btn-primary` texte blanc, grille pointillée sombre, écran de login conservé sombre). Migration : ancien `ardoise` → `sombre`.
- Météo : `lib/weather.ts` (Open-Meteo, sans clé) — géocodage + relevé courant, affiché sur le dashboard si activé.

## Refonte visuelle (design pass)

- **Typographie** : police **Geist** (Google Fonts, fallback system-ui) sur toute l'app, titres display tracking serré.
- **Écran de connexion** : refonte **split-screen premium** (`AuthView` + classes `.auth-split/.auth-hero/.auth-panel`) — volet gauche marque (logo `Logo.tsx` « Q » SVG) + promesse + 3 atouts à icônes ; volet droit carte **glassmorphique** (blur 14px, radius 28px) avec onglets Connexion / Créer un compte, champs à icônes, « Rester connecté » + « Mot de passe oublié » (message, pas de lien mort), bouton clair avec flèche animée, mention légale.
- **Atouts mis en avant** : Projets et tâches · Notes connectées · Équilibre personnel (pas de « journal » — hors périmètre).
- **Polish global** : fond à vignette radiale + grille pointillée, ombres teintées, `:focus-visible` violet discret, `.btn:active` scale(0.98), hover `.card` translateY, lueur de focus sur `.input`, logo « Q » dans la sidebar.
- **Animations** : entrée de vue à chaque navigation (`.view-anim` + `key={view}`), cartes/stats/kanban/lignes en **cascade** (`rise-in` avec délais nth-child), indicateur de nav actif animé, icônes de nav au hover, entrée animée de l'écran de connexion. Respect de `prefers-reduced-motion`.
- **Sidebar rétractable** : bouton dans le bandeau marque, transition `grid-template-columns` (244px ↔ 76px), libellés masqués en mode icônes (avec `title` au survol), état **persisté** (`prefs.sidebarCollapsed`). Chaque entrée a une **icône** (`NavIcons.tsx`).
- **Dashboard bento (refonte)** : salutation contextuelle selon l'heure + date + horloge live, bande de 4 **KPIs** (tâches ouvertes / en cours / projets actifs / notes), grille **bento** asymétrique, **anneau de progression** (`ProgressRing.tsx`) pour le projet actif, tuile météo accentuée. Reste léger (pas de graphiques lourds).
- Compte admin : identifiants gérés dans `apps/api/src/seed.ts` (compte personnel du dev).
- **Onglet Social** (`SocialView.tsx`) — **indépendant du compte**, persisté serveur (modèle `Profile`). Deux sous-vues :
  - **Mon profil** : carte refondue **bannière + avatar superposé**, **photos personnalisées** (avatar + bannière, upload/redimension côté client, repli dégradé si absent), `@handle` unique, statut + message, bio, localisation, liens à icônes, aperçu live, **réglage de visibilité** (privé / membres), aperçu factuel.
  - **Annuaire = tableau de présence** : **filtres par disponibilité** (Tous / Disponible / Focus / Absent / Hors ligne, avec compteurs), cartes membres (mini-bannière + avatar + **message d'état** « sur quoi je bosse » + **badge rôle**), recherche, clic → fiche membre en modale large. Vraie utilité : voir d'un coup d'œil qui est dispo et sur quoi chacun travaille.
- **Identité (nom + identifiant `@`)** éditée dans **Social › Mon profil** : le **Nom** (`PATCH /auth/me`, validation 2-60) et l'**identifiant** (handle, `PUT /me/profile`) sont côte à côte, sauvegardés ensemble ; aperçu live + sidebar mise à jour via le contexte d'auth. **Paramètres › Compte** est en **lecture seule**. Le rôle admin s'affiche en **badge** (sidebar + annuaire), plus comme « nom ».
- **Menu compte** (bas de sidebar) : chip avec **photo de profil** (avatarUrl, repli dégradé/initiales) + nom + badge ; au clic, popup regroupant **Mon profil**, **Paramètres** et **Déconnexion** (fermeture par clic extérieur). Plus de boutons Paramètres/Déconnexion isolés.
  - Les infos de compte (email, rôle, déconnexion) ne sont **plus** dans Social → elles restent dans **Paramètres**.
  - Sécurité : `PublicProfile` **n'expose jamais l'email** ; handle unique (409 si pris) ; un profil privé n'apparaît pas dans l'annuaire et renvoie 404 aux autres.

### Profil social (auth, modèle `Profile` 1-1 avec User)
- `GET /me/profile` (création auto), `PUT /me/profile` (handle/bio/status/statusText/location/avatarColor/links/visibility ; valide l'unicité du handle).
- `GET /profiles?q=` — annuaire des profils `visibility=members`.
- `GET /profiles/:userId` — fiche d'un membre visible (ou la sienne), sinon 404.
- **Profile** : `id, userId @unique, handle? @unique, bio?, status, statusText?, location?, avatarColor, avatarUrl?, bannerUrl?, links (JSON), visibility, timestamps`. Images (avatar/bannière) en **data URL**, uploadées + redimensionnées côté client (`lib/image.ts`), validées type image ≤ 2,5 Mo.

## Conventions UI

- Palette imposée via variables CSS dans `apps/desktop/src/styles.css` (`--background-main #030303`, surfaces `rgba(255,255,255,0.035)`, accent violet `#9B7CFF` **rare** : actif/focus/progression).
- Fond noir + grille pointillée très subtile.
- Cartes `.card` (radius 22px, bordure fine, hover discret). Boutons `.btn-primary` (blanc) / `.btn-ghost`.
- Typo Inter/Geist/SF Pro. Titres 30px, sections 19px, texte 14px, secondaire 12-13px.
- États gérés : loading / empty / error sur chaque vue de données.

## Décisions prises

- SQLite en dev (simplicité, zéro config). Migrable vers Postgres plus tard via `datasource`.
- Inscription **uniquement** par code d'invitation valide.
- Pas de fonctionnalités hors liste (pas de gamification, scoring, citations, etc.).
- **Coquille Tauri 2 générée et fonctionnelle** : `apps/desktop/src-tauri/` (`Cargo.toml`, `src/main.rs` + `src/lib.rs`, `build.rs`, `capabilities/default.json`, icônes via `tauri icon`). CLI `@tauri-apps/cli@2` + `@tauri-apps/api@2` installés. Lancement : `npm run tauri dev -w @quantic/desktop` (Vite `:1422` + window). Prérequis : Rust + port 1422 libre. La fenêtre charge le front Vite et tape l'API `:4000`.
- **Repo GitHub + releases desktop** : dépôt privé `Teddyfrz/Quantic`, branche `main`, tag de release courant `app-v0.1.0`. Le workflow `.github/workflows/release-desktop.yml` construit Windows/macOS/Linux via GitHub Actions et publie les artefacts directement en release.
- **Mises à jour automatiques Tauri** : plugin `@tauri-apps/plugin-updater` + `@tauri-apps/plugin-process` côté JS, crates `tauri-plugin-updater` + `tauri-plugin-process` côté Rust. Endpoint updater : `https://github.com/Teddyfrz/Quantic/releases/latest/download/latest.json`. La vérification/installation est exposée dans `SettingsView` via `apps/desktop/src/lib/updater.ts`.
- **Signature updater** : paire de clés générée localement dans `.tauri-key/` (ignoré Git). La clé publique est dans `tauri.conf.json`; la clé privée doit être copiée dans le secret GitHub Actions `TAURI_SIGNING_PRIVATE_KEY`. Pas de mot de passe sur la clé générée actuellement.
- **Workflow release corrigé** : `tauri-apps/tauri-action@v0.6.2` (le tag `v1` n'existe pas sur l'action officielle). `releaseDraft: false` pour rendre la version téléchargeable dès que le build passe. Les icônes natives sont déclarées explicitement (`.png`, `.icns`, `.ico`) pour éviter l'erreur Windows `Couldn't find a .ico icon`.
- **Backup avant mise en Git/release** : archive source locale `.backups/quantic-source-backup-20260610-171656.zip`, excluant `node_modules`, `target`, `.tauri-key`, les builds et la base SQLite verrouillée.

## Démarrage (dev)

```
npm install                       # à la racine
npm run build:shared              # compile @quantic/shared
npm run prisma:push -w @quantic/api   # crée la base SQLite
npm run seed -w @quantic/api      # crée/maj le compte admin (voir apps/api/src/seed.ts) + 1 code
npm run dev:api                   # API sur :4000
npm run dev:desktop               # frontend sur :1420
```

## Points à faire ensuite (polish / hors cahier des charges initial)

Tous les modules demandés sont livrés. Pistes d'amélioration éventuelles :
1. Stabiliser la chaîne de release desktop GitHub Actions jusqu'à obtenir les artefacts Windows/macOS/Linux téléchargeables.
2. Persistance serveur des préférences (thème/météo/profil) si multi-appareils souhaité (aujourd'hui en `localStorage`).
3. Édition des séances de sport (actuellement ajout + suppression).
4. Tests automatisés (API + composants).

## Bugs / limites connues

- Coquille Tauri 2 opérationnelle en **dev** (`tauri dev`). Packaging GitHub Actions en cours de stabilisation : macOS est passé, Windows a été corrigé via déclaration `.ico`, Ubuntu reste à vérifier selon le dernier log Actions.
- Pas encore de refresh token (JWT simple). Suffisant pour le dev.
- `prisma db push` peut échouer derrière un proxy réseau (génération du client à surveiller).
