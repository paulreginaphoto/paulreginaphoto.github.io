# Regina Photo — GitHub Pages

Portfolio photo statique au rendu premium, prévu pour GitHub Pages avec domaine personnalisé `regina.photo`.

## Fonctionnement

Le site ne lit pas directement le contenu d'un dossier côté navigateur. Pour contourner proprement cette limite de GitHub Pages, le dépôt inclut :

- un dossier `assets/photos/` dans lequel tu déposes tes images
- un script `scripts/build-gallery.js` qui génère `assets/data/gallery.json`
- un workflow GitHub Actions qui exécute ce script automatiquement à chaque push sur `main` ou `master`

Résultat : tu ajoutes des photos, tu pushes, et la galerie se met à jour.

## Formats supportés

- `.jpg`
- `.jpeg`
- `.png`
- `.webp`
- `.avif`
- `.gif`

## Déploiement

1. Crée un dépôt GitHub, idéalement `paulreginaphoto.github.io` ou un dépôt dédié si tu utilises un domaine custom.
2. Upload le contenu de ce ZIP à la racine du dépôt.
3. Vérifie que GitHub Pages publie bien depuis la branche principale.
4. Le fichier `CNAME` est déjà configuré pour `regina.photo`.

## Ajouter des images

1. Dépose tes images dans `assets/photos/`
2. Commit + push
3. GitHub Actions régénère `assets/data/gallery.json`
4. GitHub Pages affiche automatiquement les nouvelles images
