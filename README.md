# Regina Photo — Luxe Plus

Site statique prêt pour **GitHub Pages** avec :

- design premium / éditorial
- **albums automatiques**
- **heatmap de publication**
- lien Instagram vers **@paulregina.photo**
- domaine custom déjà configuré via `CNAME` sur **regina.photo**

## Comment créer des albums

- Place les images à la racine de `assets/photos/` → elles vont dans l’album **Portfolio**
- Place les images dans un sous-dossier → le sous-dossier devient un album

Exemples :

- `assets/photos/portrait/image-01.jpg`
- `assets/photos/travel/italy-01.jpg`
- `assets/photos/fine-art/studio-shot.webp`

## Comment la heatmap fonctionne

Le script lit la date du dernier commit Git affectant chaque image, puis génère une heatmap sur le site.
Le workflow GitHub Actions clone l’historique complet (`fetch-depth: 0`) pour que ces dates soient fiables.

## Déploiement GitHub Pages

1. Crée un repo sur le compte **paulreginaphoto**
2. Upload le contenu de ce ZIP
3. Active GitHub Pages depuis la branche `main`
4. Garde le fichier `CNAME`
5. Configure ton domaine `regina.photo` chez Namecheap vers GitHub Pages

## Instagram

Le site pointe vers :

- `https://instagram.com/paulregina.photo`
