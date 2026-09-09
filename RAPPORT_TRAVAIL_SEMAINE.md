**Date :** Semaine du 26 au 29 Août 2026  
**Projet :** GuardRail DevSecOps Security Console (Rails 8 API + React 18 / Tailwind CSS)  
**Statut :** Opérationnel (100% Données Réelles)  

---

## 📌 Sommaire des Réalisations

1. [Correction de l'Environnement Frontend & Dépendances](#1-correction-de-lenvironnement-frontend--dépendances)
2. [Mise en Place du Système d'Authentification Complet (JWT)](#2-mise-en-place-du-système-dauthentification-complet-jwt)
3. [Résolution des Erreurs et Bugs Backend Rails (API)](#3-résolution-des-erreurs-et-bugs-backend-rails-api)
4. [Suppression Totale des Données Statiques & Intégration 100% Données Réelles](#4-suppression-totale-des-données-statiques--intégration-100-données-réelles)
5. [Refonte Visuelle et Modernisation de l'Interface (UI/UX)](#5-refonte-visuelle-et-modernisation-de-linterface-uiux)
6. [Guide de Démarrage Rapide & Accès Base de Données](#6-guide-de-démarrage-rapide--accès-base-de-données)

---

## 1. Correction de l'Environnement Frontend & Dépendances

### Problèmes initiaux identifiés :
- Erreur au démarrage de Vite due au fichier manquant `AuthContext.jsx`.
- Conflit CSS / SCSS : `index.scss` utilisait le framework Carbon SCSS nécessitant `sass-embedded` (non installé), bloquant le rendu.
- Dépendances manquantes non déclarées dans `package.json` (`axios`, `recharts`, `lucide-react`, `tailwindcss`, `autoprefixer`).
- Absence de configuration Proxy dans Vite, redirigeant les requêtes API vers le port 5173 au lieu du serveur Rails sur le port 3000.

### Actions & Solutions :
- **Mise à jour de `package.json`** avec l'ensemble des dépendances nécessaires en versions stables.
- **Configuration du serveur Vite (`vite.config.js`)** avec un Reverse Proxy automatisé :
  - `/api` $\rightarrow$ `http://localhost:3000`
  - `/users` $\rightarrow$ `http://localhost:3000`
- **Résolution des conflits de styles** vers Tailwind CSS dark theme (`index.css` et `tailwind.config.js`).

---

## 2. Mise en Place du Système d'Authentification Complet (JWT)

### Implémentation réalisée :
- **`AuthContext.jsx`** : Gestion centralisée du cycle de vie de l'utilisateur (token JWT, état connecté, persistance `localStorage`, hooks `useAuth`).
- **`LoginPage.jsx`** : Interface complète et moderne de connexion & inscription DevSecOps :
  - Onglets interactifs **Sign In** / **Create Account**.
  - Validation des mots de passe avec option affichage/masquage.
  - Gestion des retours d'erreurs (401, validation, erreurs réseau).
- **Protection des Routes (`App.jsx`)** :
  - `ProtectedRoute` : Redirection automatique vers `/login` si l'utilisateur n'a pas de token actif.
  - `PublicRoute` : Redirection vers `/dashboard` si l'utilisateur est déjà authentifié.
- **Compte de Test Actif provisionné** :
  - **Email :** `ahmed@example.com`
  - **Mot de passe :** `password123`

---

## 3. Résolution des Erreurs et Bugs Backend Rails (API)

| Fichier / Module | Bug Détecté | Correction Appliquée |
|---|---|---|
| `app/controllers/api/v1/repositories_controller.rb` | **500 Internal Server Error (`PG::GroupingError`)** : La requête `by_language` effectuait un `GROUP BY language` avec un `ORDER BY created_at` non agrégé sous PostgreSQL. | Utilisation de `.unscope(:order).group(:language).count` pour supprimer le tri avant l'agrégation. |
| `app/controllers/api/v1/dashboard_controller.rb` | **500 Internal Server Error (`NoMethodError`)** : Appel à `.critical`, `.high`, etc. sur `Vulnerability` (scopes non définis dans le modèle). | Remplacement par des requêtes explicites `.where(severity: 'critical')`, etc. |
| `app/controllers/api/v1/projects_controller.rb` | **Données incomplètes** : L'API retournait uniquement la liste brute des projets sans calcul de santé ni score de sécurité. | Ajout de la méthode `serialize_project` calculant dynamiquement le vrai score de sécurité via `Security::ScoreCalculator`, le compte des scans et les vulnérabilités ouvertes. |

---

## 4. Suppression Totale des Données Statiques & Intégration 100% Données Réelles

### 1. Dashboard (`DashboardPage.jsx`)
- **Supprimé :** Toutes les constantes codées en dur (`DEFAULT_DEPLOYMENTS_DATA`, `DEFAULT_WEBHOOK_ACTIVITY_DATA`, `DEFAULT_WEBHOOK_EVENTS`, statistiques fictives 84%, 14 repos, 342 webhooks).
- **Intégré :**
  - Consommation dynamique de l'API `/api/v1/dashboard`.
  - État de chargement élégant (*Skeleton Loading* animé).
  - Gestion des erreurs avec bouton de réessai (*Retry*).
  - Graphiques Recharts réactifs basés uniquement sur les scans et webhooks enregistrés en base de données.

### 2. Gestion des Projets (`ProjectsPage.jsx`)
- **Supprimé :** Les générateurs de nombres aléatoires (`Math.random()`) et métriques simulées.
- **Intégré :**
  - Liaison avec les **8 projets réels** et **88 scans de sécurité** de la base PostgreSQL.
  - Calcul du **vrai score de sécurité (%)** selon l'impact des vulnérabilités réelles (critiques, hautes, moyennes, faibles).
  - Affichage précis des vulnérabilités ouvertes (`X open`) et du nombre réel de scans exécutés.
  - Horodatages réels basés sur les dates de scans et de commits (`updated_at` / `last_scanned_at`).

---

## 5. Refonte Visuelle et Modernisation de l'Interface (UI/UX)

- **Thème Dark DevSecOps** (`#0B1120`, `#111726`, `#1E293B`) avec contrastes optimisés.
- **Cartes Projets Interactives** :
  - Avatar coloré généré à partir du nom du projet.
  - Badges de statuts dynamiques (Active 🟢, Failed 🔴, Warning 🟡, Running 🔵).
  - Grille technique : Environnement, Branche GitHub, Nombre de scans, Vulnérabilités ouvertes, Dernière activité.
  - Barre de progression du Score de Sécurité avec code couleur adaptatif (Vert $\ge$ 80%, Ambre $\ge$ 50%, Rouge $<$ 50%).
  - Barre de recherche en temps réel par nom de projet ou nom de dépôt GitHub.

---

## 6. Guide de Démarrage Rapide & Accès Base de Données

### 🚀 Lancer le projet

#### 1. Backend (Rails API - Port 3000)
```powershell
bundle exec rails s -p 3000
```

#### 2. Frontend (React / Vite - Port 5173)
```powershell
cd frontend
npm run dev
```

Accès à l'application : **[http://localhost:5173](http://localhost:5173)**

---

### 🔑 Identifiants de connexion

| Champ | Valeur |
|---|---|
| **Email** | `ahmed@example.com` |
| **Mot de passe** | `password123` |

---

### 🗄️ Accès direct à la Base de Données PostgreSQL

- **Base de données :** `guardrail_api_development`
- **Utilisateur :** `postgres`
- **Mot de passe :** `pass`
- **Hôte / Port :** `localhost:5432`

#### Commande via Terminal :
```powershell
psql -U postgres -h localhost -d guardrail_api_development
```
*(ou simplement `bundle exec rails dbconsole` à la racine du projet)*

#### Requêtes SQL utiles :
```sql
-- Vérifier les projets
SELECT id, name, github_repo, status FROM projects;

-- Vérifier les scans et scores
SELECT id, project_id, status, commit_sha, created_at FROM scans ORDER BY created_at DESC LIMIT 10;

-- Vérifier les vulnérabilités détectées
SELECT severity, status, count(*) FROM vulnerabilities GROUP BY severity, status;
```

---

*Document généré automatiquement pour le suivi de projet GuardRail.*
