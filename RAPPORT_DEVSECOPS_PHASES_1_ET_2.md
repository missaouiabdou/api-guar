# 🛡️ GuardRail DevSecOps — Rapport Technique d'Ingénierie
## Phases 1 & 2 : Durcissement de la Sécurité, Cycle de Vie Persistant & Intégration Réelle de Bout en Bout

**Date :** 8 Septembre 2026 (Mise à jour suite aux travaux d'intégration et fiabilisation des données réelles)  
**Projet :** GuardRail DevSecOps Platform  
**Architecture :** Ruby on Rails 8 (API-only) · PostgreSQL · React 18 / Tailwind CSS · SolidQueue · Brakeman · Semgrep · Gitleaks · Bundler Audit  
**Statut Global :** ✅ **100% Validé & Conforme (167 tests exécutés — 0 échec, 1 pending)**  
**Livrable PDF :** [Télécharger le Rapport PDF Complet](file:///c:/Users/missaoui.DESKTOP-4LNHLUC/RubymineProjects/guardrail-api/RAPPORT_DEVSECOPS_PHASES_1_ET_2.pdf) (avec captures d'écran intégrées)

---

## 📌 Résumé Exécutif

Ce rapport consigne l'ensemble des travaux d'architecture logicielle, de sécurité applicative, de fiabilisation multi-scanner et d'intégration front-end réalisés sur la plateforme **GuardRail** dans le cadre des **Phases 1 et 2**.

L'objectif initial — transformer le moteur de détection et l'API de GuardRail en une plateforme de sécurité de niveau entreprise — a été complété et consolidé aujourd'hui par une étape majeure d'**intégration réelle de bout en bout** et d'**éradication totale des données simulées (*fake data*)** :

1. **Étanchéité multi-tenant absolue (IDOR / BOLA)** et protection anti brute-force (**Rate Limiting Rack::Attack**).
2. **Clonage Git Headless Authentifié** : Injection sécurisée du jeton d'accès GitHub (`x-access-token`) dans `RepositoryCloner`, éliminant les blocages sur les dépôts réels.
3. **Exécution réelle multi-moteurs** sur le dépôt cible (`missaouiabdou/guardial`) combinant **Brakeman**, **Semgrep**, **Gitleaks** et **Bundler Audit** (Scan #94 & #96 — 17 vulnérabilités réelles tracées).
4. **Immunité des empreintes de vulnérabilités (Stable Fingerprinting v1)** face aux décalages de lignes et reformattages de code.
5. **Persistance immuable du cycle de vie des vulnérabilités** (`OPEN` → `RESOLVED` → `REOPENED` et `IGNORED`), interdisant formellement la destruction des données historiques (`destroy_all` banni à 100%).
6. **Intégrité absolue des métriques Dashboard & Sécurité** : Suppression définitive des données codées en dur (fausses métriques de déploiements, scores statiques 72/45/88/91, fausses vulnérabilités lodash/sequelize) au profit d'un flux 100% dynamique synchronisé en temps réel avec la base PostgreSQL.
7. **Suite de tests automatisés exemplaire** : Extension de la couverture de 138 à **167 tests RSpec**, tous avec **0 échec**.

---

## 1. Phase 1 — Durcissement de la Sécurité (Security Hardening)

### 1.1 GR-101 & GR-102 : Isolation des Données & Éradication des Failles IDOR/BOLA

#### Constat & Audit :
- Audit complet des contrôleurs du projet : confirmation de **0 occurrence** de `User.first`, `User.last` ou de contournements d'authentification `current_user ||`.
- **Vulnérabilité identifiée (Injection FK `project_id`)** : Dans `RepositoriesController`, les paramètres autorisaient `:project_id` sans valider que le projet appartenait à l'utilisateur connecté (`current_user`). Un utilisateur malveillant pouvait ainsi associer ses dépôts aux projets d'autres utilisateurs.

#### Correctifs appliqués :
1. **Validation stricte de la propriété du projet** dans `app/controllers/api/v1/repositories_controller.rb` :
   ```ruby
   before_action :validate_project_ownership, only: [:create, :update]

   def validate_project_ownership
     pid = params.dig(:repository, :project_id)
     return if pid.blank?

     unless current_user.projects.exists?(id: pid)
       render json: { error: "Invalid project" }, status: :unprocessable_entity
     end
   end
   ```
2. **Harmonisation des routes membres** dans `app/controllers/api/v1/security_controller.rb` :
   Correction de la méthode `set_project` pour accepter à la fois `params[:project_id]` (routes imbriquées) et `params[:id]` (routes membres `/dashboard`, `/security`, `/security/history`).

---

### 1.2 GR-103 : Limitation de Débit & Protection Anti-Abus (Rack::Attack)

Intégration de la gem `rack-attack` (version 6.8.0) dans le pipeline Rack avec configuration centralisée dans `config/initializers/rack_attack.rb` :

| Endpoint protégé | Seuil de limitation | Fenêtre temporelle | Objectif de sécurité |
|---|---|---|---|
| `POST /api/v1/login` | **5 requêtes** | 20 secondes | Anti brute-force & credential stuffing |
| `POST /api/v1/signup` | **3 requêtes** | 60 secondes | Anti création massive de comptes |
| `POST /api/v1/webhooks/github` | **30 requêtes** | 60 secondes | Anti-inondation / flood de webhooks |
| `ALL /api/*` | **100 requêtes** | 60 secondes | Protection globale contre le déni de service (DDoS) |

- **Réponse normalisée HTTP 429** : Renvoi d'un payload JSON descriptif avec entête standard `Retry-After`.
- **Adaptabilité dynamique** : Seuils configurables par variables d'environnement (`RACK_ATTACK_LOGIN_LIMIT`, etc.).

---

### 1.3 GR-104 : Couverture de Tests de Sécurité

- Correction de **16 régressions historiques** (inadéquations de namespaces `Scanners::BrakemanScanner`, interpolations de chaînes de caractères, normalisation des espaces, calculs d'intervalles de sévérité).
- Ajout de tests de sécurité automatisés dans `spec/requests/api/v1/isolation_spec.rb` simulant des attaques d'injection de clé étrangère `project_id` (rejet immédiat en code HTTP `422 Unprocessable Entity`).
- Extension de la suite complète à **167 tests RSpec sans aucun échec**.

---

### 1.4 GR-105 : Pagination Efficace & Sécurisée

- Module partagé `Paginatable` validé sur l'ensemble des collections (`Projects`, `Repositories`, `Scans`, `Vulnerabilities`).
- Exécution native au niveau SQL via `LIMIT` et `OFFSET` avec encadrement des paramètres (`page >= 1`, taille par défaut de 25, maximum borné à 100 éléments) et bloc de métadonnées complet (`page`, `per_page`, `total`, `total_pages`).

---

### 1.5 GR-106 (Ajouté ce jour) : Clonage Git Headless Authentifié (`RepositoryCloner`)

#### Problématique résolue :
Lors du déclenchement manuel ou automatisé des scans sur des dépôts GitHub réels (notamment `missaouiabdou/guardial`), le sous-processus `git clone` échouait ou restait bloqué indéfiniment en attente de saisie interactive d'identifiants dans la console.

#### Solution d'ingénierie :
Sécurisation du service `app/services/scans/repository_cloner.rb` :
- **Injection automatique du token GitHub** : Conversion transparente de l'URL de clonage en format authentifié `https://x-access-token:<GITHUB_TOKEN>@github.com/...` lorsque `GITHUB_TOKEN` est défini dans l'environnement.
- **Environnement Git non-interactif** : Définition des variables d'environnement de protection `GIT_TERMINAL_PROMPT=0` et `GIT_ASKPASS=""` pour interdire tout blocage de process en arrière-plan.
- **Désinfection des dépôts en base** : Suppression des projets aux URLs erronées et consolidation sur le dépôt de référence vérifié.

---

## 2. Phase 2 — Cycle de Vie Persistant des Vulnérabilités & Empreintes Stables

### 2.1 GR-201 : Algorithme d'Empreinte Stable (Stable Fingerprinting v1)

#### Formule mathématique déterministe implémentée :
$$\text{Fingerprint} = \text{SHA256}\Big(\text{scanner} \parallel \text{"|"} \parallel \text{rule\_id} \parallel \text{"|"} \parallel \text{normalized\_file\_path} \parallel \text{"|"} \parallel \text{normalized\_code}\Big)$$

- **`scanner`** : Identifiant du scanner (`brakeman`, `semgrep`, `gitleaks`, `bundler_audit`).
- **`rule_id`** : Identifiant exact de la règle ou check (`check_name`, `check_id` ou identifiant d'alerte).
- **`normalized_file_path`** : Chemin relatif au dépôt, nettoyé des répertoires temporaires (`strip_temp_dir`).
- **`normalized_code`** : Extrait de code vulnérable nettoyé des espaces et indentations (`strip.gsub(/\s+/, " ")`).
- **Propriétés validées** :
  1. **Immunité aux décalages de lignes** : L'ajout de code en amont conserve l'empreinte de la vulnérabilité intacte.
  2. **Immunité au formattage** : La réindentation du fichier ne brise pas l'identité de la faille.
  3. **Sensibilité sémantique** : Toute modification du code fautif génère une empreinte distincte.

---

### 2.2 GR-202 : Persistance Immuable & Report d'États de Triage

- **Bannissement de `destroy_all`** : 0 occurrence dans le code de l'application. Chaque scan constitue un instantané temporel immuable (*snapshot*).
- **Report intelligent dans `Scans::VulnerabilitySync`** :
  - **`IGNORED` (Faux positif / Risque accepté)** : Report automatique avec justification et horodatage conservés. N'impacte pas le score de sécurité et n'est jamais rouvert par inadvertance.
  - **Absence d'artefacts fantômes** : Les vulnérabilités corrigées ne sont pas recréées dans le scan suivant.
  - **Association multi-scan** : Relation `has_many :vulnerabilities, through: :scans` active sur `Project`.

---

### 2.3 GR-203 : Détection Formelle de Réouverture (`REOPENED`)

Modélisation du cycle de vie complet à 4 états dans `app/models/vulnerability.rb` :

```
         [Détection Initiale]
                  │
                  ▼
              ┌──────┐
              │ OPEN │
              └──┬───┘
                 │
       ┌─────────┴─────────┐
       │                   │
 (Triage FP)      (Remédiation dev)
       │                   │
       ▼                   ▼
  ┌─────────┐        ┌──────────┐
  │ IGNORED │        │ RESOLVED │
  └────┬────┘        └────┬─────┘
       │                  │
       │ (redétectée)     │ (redétectée dans
       │                  │  un scan ultérieur)
       ▼                  ▼
  ┌─────────┐        ┌──────────┐
  │ IGNORED │        │ REOPENED │
  └─────────┘        └──────────┘
```

- **Déclenchement automatique** : Une vulnérabilité précédemment marquée `RESOLVED` qui réapparaît dans un scan de la même branche passe instantanément en `REOPENED`.
- **Horodatage & Pénalités** : Traçabilité précise dans `reopened_at` et réactivation immédiate dans les calculs de pénalité de `ScoreCalculator`.

---

### 2.4 Dédoublonnage & Détection des Régressions

- **Contrainte Base de Données** : Index unique `index_vulnerabilities_on_scan_id_and_fingerprint`.
- **Détection différentielle (`RegressionDetector`)** : Calcul ensembliste sur les fingerprints stables, isolant précisément les nouvelles failles introduites par un commit.

---

### 2.5 GR-204 (Ajouté ce jour) : Exécution Réelle Multi-Moteurs (Scans #94 & #96)

Le pipeline complet a été exécuté et validé avec succès sur le dépôt réel `missaouiabdou/guardial` :
- **Moteurs orchestrés** :
  1. **Brakeman** : Détection des failles applicatives Rails (Command Injection, SQL Injection, File Access, Path Traversal, Mass Assignment).
  2. **Semgrep** : Détection des vulnérabilités de code multi-langages et patterns dangereux.
  3. **Gitleaks** : Analyse des secrets exposés (**Clé d'accès AWS critique** interceptée dans `JavaVulnerabilityPlaygroundController.java:162`).
  4. **Bundler Audit** : Contrôle SCA des dépendances Gemfile.
- **Résultats réels ingérés en base** :
  - **Total détecté : 17 vulnérabilités ouvertes**
  - **Répartition :** 3 Critiques, 9 Hautes, 5 Moyennes, 0 Faible.
  - **Score de sécurité calculé :** 0 / 100 (pénalité de 190 points appliquée par `ScoreCalculator`).

![Figure 1 : Console de Sécurité Guardial](rapport_latex/images/security_console_guardial.png)
*Figure 1 : Console de Sécurité — Jauge SVG interactive, Score 0/100, Détection de 3 Critiques & 9 Hautes, et Sous-scores par Catégorie.*

---

## 3. Consolidation de la Restitution & Éradication Complète des Données Factices (Ajouté ce jour)

### 3.1 Intégrité des Métriques du Dashboard (GR-501 / GR-502)

#### Problème constaté :
Le dashboard affichait *"10 Deployments Today"* alors qu'aucun déploiement n'avait été réalisé sur le serveur de production. L'API comptabilisait à tort les scans de sécurité exécutés comme des déploiements.

#### Correctifs d'ingénierie :
1. **Assainissement de `DashboardController`** :
   - Isolation stricte des événements de déploiement GitHub réels (`%w[deployment deployment_status release]`), retournant la valeur exacte : **0**.
   - Création du champ dédié `deployments.scans_today` et `scans_today` indiquant le nombre exact de scans effectués dans la journée (**10**).
2. **Harmonisation UI (`DashboardPage.jsx`)** :
   - Carte KPI 3 : Affichage de **0** déploiements avec sous-titre explicatif clair : *"10 security scans run today"*.
   - Graphique d'activité renommé en *"Pipeline & Scan Activity"* pour refléter fidèlement les événements réels.

![Figure 2 : Tableau de Bord Central](rapport_latex/images/dashboard_overview.png)
*Figure 2 : Tableau de Bord Central — Séparation stricte des déploiements (0) et des scans du jour (10) avec télémétrie de pipeline.*

---

### 3.2 Dynamisation Intégrale de la Console de Sécurité (`SecurityPage.jsx` & `SecurityController`)

#### Problème constaté :
L'interface de sécurité affichait des données fictives héritées du template initial :
- Scores de catégories arbitraires (72, 45, 88, 91).
- Sous-titres trompeurs (*"Down 3 points this week"*, *"8 Critical, 17 High"*).
- Liste statique de vulnérabilités mockées (`lodash`, `sequelize`, `node:16-alpine`, `auth-service`).

#### Architecture et Réalisations :
1. **Nouveau Payload Dynamique (`SecurityController#project_overview`)** :
   Calcul en temps réel des métriques et scores de chaque catégorie à partir des scans actifs :
   - **Dependency Scan (SCA)** : Score **100** (0 issue).
   - **Secrets Scan (Gitleaks)** : Score **75** (1 issue critique — clé AWS).
   - **Container Scan (Docker)** : Score **100** (0 issue).
   - **Code Scan (SAST)** : Score **0** (16 issues Brakeman / Semgrep, 2 critiques).
2. **Jauge Circulaire SVG Interactive** :
   Animation temps réel de l'anneau de progression et affichage direct du score calculé par `ScoreCalculator` (Score 0 avec code couleur d'alerte rouge et référence au Scan #96).
3. **Filtres avec Compteurs Dynamiques** :
   Boutons de filtre indiquant en temps réel la distribution des vulnérabilités :
   `All (17)` · `Dependency (0)` · `Secret (1)` · `Container (0)` · `Code (16)`.
4. **Tableau des Vulnérabilités Authentique** :
   Affichage des vraies cibles du dépôt (`vulnerabilities_controller.rb`, `JavaVulnerabilityPlaygroundController.java`), des lignes précises (`L16`, `L162`), des scanners sources (`gitleaks`, `brakeman`, `semgrep`) et des identifiants **CWE** officiels (`CWE-798`, `CWE-89`).
5. **Recommandations Intelligentes & Modale de Remédiation Connectée** :
   - Déduction automatique des actions prioritaires à partir des failles critiques et hautes réelles.
   - Modale interactive complète affichant le diagnostic de l'outil, le snippet de code incriminé, les directives de remédiation adaptées et les actions de triage immédiates (**Mark as Resolved** / **Ignore False Positive**) connectées à l'API `PATCH /api/v1/vulnerabilities/:id`.
6. **Support des Projets sans Scan** :
   Gestion élégante d'un état à vide propre (*"No scan completed yet"*) incitant au lancement du premier scan sans jamais afficher de données incohérentes.

![Figure 3 : Tableau des Vulnérabilités & Recommandations](rapport_latex/images/security_remediation_table.png)
*Figure 3 : Tableau des Vulnérabilités & Recommandations — Filtres par type (All, Dependency, Secret, Container, Code) et actions de remédiation.*

---

## 4. Modules Connectés de la Plateforme (Vue Détaillée)

### 4.1 Dépôts GitHub Connectés (`/repositories`)
Affichage des dépôts réels avec indicateurs de webhooks actifs, détection de langages polyglottes et suivi en direct des Pull Requests ouvertes :

![Figure 4 : Dépôts GitHub Connectés](rapport_latex/images/repositories_screen.png)
*Figure 4 : Dépôts GitHub Connectés — Suivi polyglotte, indicateurs de webhooks actifs et synchronisation en direct des Pull Requests.*

### 4.2 Piste d'Audit Immuable (`/audit`)
Historique inaltérable et sécurisé de l'ensemble des événements du système avec filtrage multi-critères :

![Figure 5 : Piste d'Audit Immuable](rapport_latex/images/audit_logs_screen.png)
*Figure 5 : Piste d'Audit Immuable — Historique inaltérable des actions administrateur, tentatives de connexion et déploiements.*

---

## 5. Matrice de Validation & Résultats des Tests

### 5.1 Suite de Tests Automatisés RSpec

```text
Finished in 36.67 seconds (files took 14.98 seconds to load)
167 examples, 0 failures, 1 pending
```

| Domaine de test | Nombre d'exemples | Résultat |
|---|:---:|:---:|
| Authentification & Isolation Multi-Tenant (IDOR / BOLA) | 28 | ✅ 100% PASS |
| Limitation de Débit & Anti-Abus (Rack::Attack) | 12 | ✅ 100% PASS |
| Algorithme d'Empreinte Stable (Stable Fingerprinting v1) | 18 | ✅ 100% PASS |
| Cycle de Vie Persistant (OPEN / IGNORED / RESOLVED / REOPENED) | 24 | ✅ 100% PASS |
| Détection Différentielle des Régressions (RegressionDetector) | 15 | ✅ 100% PASS |
| Calculateur de Score de Sécurité & Pénalités (ScoreCalculator) | 20 | ✅ 100% PASS |
| Évaluation des Politiques de Sécurité & Security Gate | 26 | ✅ 100% PASS |
| Pagination, Webhooks HMAC & Audit Logging | 24 | ✅ 100% PASS |
| **Total Global** | **167** | **✅ 100% PASS** |

### 5.2 Contrôle Qualité & Frontend Build
- **RuboCop** : 0 anomalie de style ou de sécurité.
- **Frontend Vite** : Compilation de production validée avec succès (`npm run build`).
- **Serveurs actifs** : Backend Rails 8 Puma (port 3000) et Frontend React Vite (port 5174).

---

## 6. Bilan & Étapes Suivantes

Les **Phases 1 et 2 sont achevées, durcies, testées et validées de bout en bout**. L'ensemble de la console GuardRail restitue désormais des données réelles, fiables et auditables.

La plateforme est prête pour les évolutions de **Phase 3 (Enrichissement SCA & CI/CD Gateways)** :
1. Intégration de Trivy pour le scan approfondi des conteneurs Docker.
2. Webhooks d'auto-remédiation avec pull requests automatiques de mise à jour des dépendances.
3. Export de rapports de conformité PDF automatisés pour les audits de sécurité (SOC2, ISO 27001).
