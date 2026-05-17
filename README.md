# Insta360 X5 — Viewer 360° (Electron)

Application desktop locale pour visualiser le flux 360° de ta caméra Insta360 X5
sans OBS, sans navigateur, sans demande de permission.

## Prérequis

- **Node.js** v18+ → https://nodejs.org
- **Insta360 X5** branchée en mode **Webcam** via USB-C

## Installation (1 seule fois)

### Windows
Double-clique sur `install.bat`

### Mac / Linux
```bash
chmod +x install.sh && ./install.sh
```

### Manuellement
```bash
npm install
# Télécharge Three.js dans src/
node -e "const https=require('https'),fs=require('fs');const f=fs.createWriteStream('src/three.min.js');https.get('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',r=>{r.pipe(f);f.on('finish',()=>{f.close()})});"
```

## Lancement

```bash
npm start
```

## Utilisation

1. Branche la X5 en **mode Webcam** via USB-C
2. Lance l'app → clique **Démarrer**
3. La caméra Insta360 est auto-détectée (marquée ★)

## Contrôles

| Action | Résultat |
|--------|----------|
| Glisser la souris | Naviguer dans la sphère 360° |
| Molette | Zoom (FOV) |
| Slider Zoom | Ajuster le champ de vision |
| Bouton Centrer | Revenir au centre |
| Bouton Réticule | Afficher/masquer la croix |
| Plein écran | Plein écran |
| Touche `C` | Centrer la vue |
| Touche `F` | Plein écran |
| Touches `+` / `-` | Zoom in / out |

## Résolution recommandée

La résolution **2880×1440** (équirectangulaire 2:1) est demandée automatiquement
pour un rendu 360° correct. Assure-toi que la X5 est bien en **mode Webcam 360°**.

## Dépannage

| Problème | Solution |
|----------|----------|
| Caméra non détectée | Vérifie le mode Webcam sur la X5 et le câble USB-C data |
| Image plate (pas de 360) | La X5 doit être en mode Webcam (pas U-Disk) |
| Caméra utilisée | Ferme toute autre app utilisant la caméra |
| Erreur npm | Installe Node.js v18+ depuis nodejs.org |
