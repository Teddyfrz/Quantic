# Releases et mises a jour automatiques

Quantic utilise le plugin officiel Tauri Updater avec GitHub Releases.

## Secrets GitHub requis

Dans `Settings > Secrets and variables > Actions`, ajouter :

- `TAURI_SIGNING_PRIVATE_KEY` : contenu de `.tauri-key/quantic.key`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` : vide pour la cle generee localement, ou le mot de passe si une nouvelle cle protegee est generee

La cle publique correspondante est deja configuree dans `apps/desktop/src-tauri/tauri.conf.json`.
Ne jamais committer `.tauri-key/`.

## Publier une version

1. Mettre a jour la version dans `package.json`, `apps/desktop/package.json`, `apps/desktop/src-tauri/Cargo.toml` et `apps/desktop/src-tauri/tauri.conf.json`.
2. Committer les changements.
3. Creer et pousser un tag :

```powershell
git tag app-v0.1.0
git push origin main
git push origin app-v0.1.0
```

Le workflow `.github/workflows/release-desktop.yml` construit Windows, macOS et Linux, cree une GitHub Release en brouillon, publie les bundles signes et genere `latest.json`.

## Endpoint updater

L'application verifie :

```text
https://github.com/Teddyfrz/Quantic/releases/latest/download/latest.json
```

Une release doit donc etre publiee, pas seulement en brouillon, pour etre visible par les clients installes.
