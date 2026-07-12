# La bonne 125

Comparateur des motos 125cc du marché français, fait par un parrain pour aider sa filleule à choisir sa première moto (permis A1).

**Site :** https://carpette.github.io/la-bonne-125/

## Fonctionnalités
- Base de ~75 modèles (japonaises, européennes, marques chinoises et confidentielles), prix indicatifs 2026
- Filtres : type, budget, hauteur de selle, puissance, ABS, origine, marque, recherche
- Sceau « Approuvé par parrain » (rouge) et « Suggestion de l'IA » (vert), avec avis détaillés
- Fiche détail par modèle avec liens site officiel / photos / essais

## Espace parrain (admin)
1. Bouton « ⚙ parrain » en haut à droite
2. Coller un token GitHub *fine-grained* limité à ce dépôt, permission **Contents : Read and write** uniquement
3. Ouvrir une fiche moto → poser le sceau, écrire un avis, corriger un prix, coller une URL de photo
4. « Publier sur le site » → commit direct de `data/motos.json`, GitHub Pages redéploie en ~1 min

Le token reste en sessionStorage (perdu à la fermeture de l'onglet). Le révoquer après usage reste la bonne pratique.

## Données
`data/motos.json` — éditable à la main ou via le panneau. Prix et hauteurs de selle **indicatifs** : toujours vérifier en concession.

## Stack
HTML/CSS/JS vanilla, zéro dépendance, zéro build. Hébergement GitHub Pages.
