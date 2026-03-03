# Regina Photo — GitHub Pages

Site statique haut de gamme pour portfolio photo, prêt à publier sur GitHub Pages.

## Utilisation

1. Crée un dépôt GitHub (ou utilise ton dépôt de site GitHub Pages).
2. Uploade tout le contenu de ce ZIP à la racine du dépôt.
3. Active **GitHub Pages** depuis la branche `main` (ou `master`) et le dossier racine (`/`).
4. Vérifie que le fichier `CNAME` contient bien `regina.photo`.
5. Configure le DNS de `regina.photo` vers GitHub Pages.

## Ajouter des photos

- Dépose tes images dans `assets/photos/`
- Formats pris en charge : `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`, `.gif`
- Pousse le dépôt sur GitHub
- Le workflow `.github/workflows/update-gallery.yml` régénère automatiquement `assets/data/gallery.json`
- La galerie s'affiche ensuite automatiquement sur le site

## Ordre d'affichage

Les images sont triées par nom de fichier. Si tu veux contrôler l'ordre, nomme tes photos ainsi :

- `001-portrait.jpg`
- `002-studio.jpg`
- `003-nuit.jpg`

## Domaine personnalisé

Le fichier `CNAME` est déjà configuré pour :

- `regina.photo`

## Compte GitHub prévu

- `paulreginaphoto`
