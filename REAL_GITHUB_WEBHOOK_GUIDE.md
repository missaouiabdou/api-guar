# GuardRail — Real GitHub Webhook Test Guide

> Connecter ton vrai repo GitHub à GuardRail et recevoir de vrais push/PR webhooks.

---

## Architecture

```
Tu fais un git push
       ↓
GitHub envoie un webhook POST
       ↓
ngrok (tunnel internet → localhost)
       ↓
http://localhost:3000/api/v1/webhooks/github
       ↓
SignatureVerifier → DuplicateChecker → ProjectResolver → ScanCreator
       ↓
WebhookEvent + Scan créés dans PostgreSQL
```

---

## Étape 1 — Installer ngrok

```powershell
# Option A: avec Chocolatey
choco install ngrok -y

# Option B: téléchargement direct
# Aller sur https://ngrok.com/download
# Extraire ngrok.exe dans un dossier du PATH
```

Après installation, crée un compte gratuit sur [ngrok.com](https://ngrok.com) et connecte-le :

```powershell
ngrok config add-authtoken TON_TOKEN_NGROK
```

---

## Étape 2 — Lancer le tunnel ngrok

**Terminal 1** — Rails server (si pas déjà lancé) :
```powershell
cd C:\Users\missaoui.DESKTOP-4LNHLUC\RubymineProjects\guardrail-api
bundle exec rails s
```

**Terminal 2** — ngrok :
```powershell
ngrok http 3000
```

Tu vas voir quelque chose comme :

```
Forwarding    https://a1b2c3d4.ngrok-free.app → http://localhost:3000
```

> [!IMPORTANT]
> Copie l'URL **https** (ex: `https://a1b2c3d4.ngrok-free.app`).
> C'est cette URL que GitHub va utiliser pour envoyer les webhooks.

---

## Étape 3 — Préparer le Projet dans GuardRail

**Terminal 3** — PowerShell :

```powershell
# 1. Login (ou signup si pas encore fait)
$r = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/login" `
  -Method POST -ContentType "application/json" `
  -Body '{"user":{"email":"manual@test.dev","password":"password123"}}' `
  -UseBasicParsing
$token = $r.Headers["Authorization"]

# 2. Créer un projet avec TON VRAI github_repo
#    Remplace le nom par ton vrai repo (format: owner/repo)
$r = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/projects" `
  -Method POST -ContentType "application/json" `
  -Headers @{"Authorization"=$token} `
  -Body '{"project":{"name":"GuardRail API","repository_url":"https://github.com/missaoui/guardrail-api","github_repo":"missaoui/guardrail-api"}}' `
  -UseBasicParsing
$r.Content | ConvertFrom-Json | Format-List id, name, github_repo
```

> [!NOTE]
> Si tu as déjà un projet avec ce `github_repo`, skip cette étape.

---

## Étape 4 — Récupérer le Webhook Secret

Le secret que GitHub doit utiliser pour signer les payloads :

```powershell
Get-Content "C:\Users\missaoui.DESKTOP-4LNHLUC\RubymineProjects\guardrail-api\tmp\.github_webhook_secret"
```

Ton secret actuel :
```
6440381bea18bfa4a9dd942fc761b9212ffbc2cb60b3f591dbb284b9369dd523
```

> [!IMPORTANT]
> Copie ce secret. Tu vas le coller dans la config webhook sur GitHub.

---

## Étape 5 — Configurer le Webhook sur GitHub

1. Va sur ton repo GitHub : **https://github.com/missaoui/guardrail-api**

2. Clique sur **Settings** (⚙️) → **Webhooks** → **Add webhook**

3. Remplis les champs :

| Champ | Valeur |
|-------|--------|
| **Payload URL** | `https://XXXXXXXX.ngrok-free.app/api/v1/webhooks/github` |
| **Content type** | `application/json` |
| **Secret** | `6440381bea18bfa4a9dd942fc761b9212ffbc2cb60b3f591dbb284b9369dd523` |
| **Which events?** | Sélectionne "Let me select individual events" |
| **Events** | ✅ Pushes, ✅ Pull requests |
| **Active** | ✅ Coché |

4. Clique **Add webhook**

> [!WARNING]
> Remplace `XXXXXXXX.ngrok-free.app` par ta vraie URL ngrok de l'étape 2 !

---

## Étape 6 — Vérifier le Ping

Dès que tu ajoutes le webhook, GitHub envoie automatiquement un **ping event**.

Regarde dans ton **terminal Rails** (Terminal 1), tu devrais voir :

```
Started POST "/api/v1/webhooks/github" for ...
Processing by Api::V1::Webhooks::GithubController#create as */*
Completed 202 Accepted in XXms
```

Tu peux aussi vérifier sur GitHub :
- Settings → Webhooks → clique sur ton webhook
- En bas, section **Recent Deliveries**
- Le ping devrait avoir un ✅ vert avec response `202`

---

## Étape 7 — Faire un VRAI Push 🚀

Maintenant le moment de vérité ! Fais un vrai commit et push :

```powershell
cd C:\Users\missaoui.DESKTOP-4LNHLUC\RubymineProjects\guardrail-api

# Crée un fichier de test
"# Webhook test $(Get-Date)" | Out-File -Append README.md

# Commit et push
git add README.md
git commit -m "test: verify GuardRail webhook pipeline"
git push origin main
```

### Ce qui se passe :

```
1. git push → GitHub reçoit le push
2. GitHub envoie POST à ton URL ngrok avec:
   - X-Hub-Signature-256 (HMAC du payload)
   - X-GitHub-Event: push
   - X-GitHub-Delivery: uuid unique
   - Body: vrai payload JSON du push
3. ngrok forward → localhost:3000
4. Rails reçoit → SignatureVerifier vérifie
5. DuplicateChecker → pas de doublon
6. ProjectResolver → trouve le projet par github_repo
7. EventRecorder → crée WebhookEvent
8. ScanCreator → crée Scan (status: pending)
9. ScanJob → lancé en background
10. Response 202 → GitHub reçoit confirmation
```

### Regarde les logs Rails :

Tu devrais voir dans le terminal Rails :

```
Started POST "/api/v1/webhooks/github"
Processing by Api::V1::Webhooks::GithubController#create
  WebhookEvent Create (X.Xms) INSERT INTO "webhook_events" ...
  Scan Create (X.Xms) INSERT INTO "scans" ...
  Enqueued ScanJob (Job ID: xxx)
Completed 202 Accepted
```

---

## Étape 8 — Vérifier dans la Base de Données

Ouvre la Rails console :

```powershell
cd C:\Users\missaoui.DESKTOP-4LNHLUC\RubymineProjects\guardrail-api
bundle exec rails c
```

```ruby
# Dernier WebhookEvent
e = WebhookEvent.last
puts "Event: #{e.event_type}, Delivery: #{e.delivery_id}, Status: #{e.status}"
puts "Repository: #{e.repository}"
puts "Scan ID: #{e.scan_id}"

# Dernier Scan
s = Scan.last
puts "Scan: #{s.scan_id}, Source: #{s.source_type}"
puts "Branch: #{s.branch}, SHA: #{s.commit_sha}"
puts "Status: #{s.status}"
puts "Project: #{s.project.name}"

# Voir le payload brut du webhook
pp WebhookEvent.last.payload.keys

# Compter tout
puts "WebhookEvents: #{WebhookEvent.count}"
puts "Scans: #{Scan.count}"
```

---

## Étape 9 — Vérifier via l'API

```powershell
# Lister les scans
$r = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/scans" `
  -Method GET -Headers @{"Authorization"=$token} -UseBasicParsing
$r.Content | ConvertFrom-Json | Format-Table id, source_type, branch, commit_sha, status -AutoSize
```

Tu devrais voir ton **vrai commit SHA** et ta **vraie branche** :

```
id source_type  branch commit_sha                               status
-- -----------  ------ ----------                               ------
 6 github_push  main   a1b2c3d4e5f6789012345678901234567890abcd pending
```

---

## Étape 10 — Tester un Pull Request (optionnel)

1. Crée une branche et push :
```powershell
git checkout -b test/webhook-pr
"# PR test" | Out-File -Append README.md
git add README.md
git commit -m "test: verify PR webhook"
git push origin test/webhook-pr
```

2. Sur GitHub, crée une Pull Request depuis `test/webhook-pr` → `main`

3. GitHub envoie un webhook `pull_request` → GuardRail crée un Scan avec `source_type=github_pr`

---

## Troubleshooting

### GitHub affiche "failed to deliver" (❌ rouge)

| Problème | Solution |
|----------|----------|
| ngrok pas lancé | Relance `ngrok http 3000` |
| URL ngrok changée | Mets à jour le Payload URL dans GitHub Settings |
| Rails server down | Relance `bundle exec rails s` |
| Signature mismatch | Vérifie que le secret dans GitHub = celui dans `tmp/.github_webhook_secret` |

### Response 422 dans GitHub

```
{"error":"Unknown repository: owner/repo"}
```

→ Le `github_repo` du projet dans GuardRail ne match pas le `repository.full_name` du webhook.

Vérifie en Rails console :
```ruby
Project.pluck(:id, :github_repo)
```

### Response 401 dans GitHub

```
{"error":"Signature mismatch"}
```

→ Le secret configuré sur GitHub ≠ celui utilisé par Rails. Compare :
```powershell
# Secret Rails
Get-Content tmp\.github_webhook_secret

# Secret GitHub → Settings → Webhooks → Edit → Secret
```

### Scan status reste "pending"

C'est normal ! Le `ScanJob` lance `BrakemanScanner` qui exécute `bundle exec brakeman`. Si Brakeman échoue, le scan passe en `failed`. Vérifie :

```ruby
Scan.last.status
Scan.last.error_message
```

---

## Nettoyage (après les tests)

1. **Supprimer le webhook sur GitHub** : Settings → Webhooks → Delete
2. **Arrêter ngrok** : `Ctrl+C` dans le terminal ngrok
3. **Annuler le commit de test** :
```powershell
git checkout main
git reset --soft HEAD~1
git checkout -- README.md
```
