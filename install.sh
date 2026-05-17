#!/bin/bash
echo "=== Insta360 360 Viewer - Installation ==="
echo

# Verifier Node.js
if ! command -v node &> /dev/null; then
  echo "ERREUR: Node.js n'est pas installe."
  echo "Installe-le via: https://nodejs.org"
  exit 1
fi

echo "[1/2] Installation des dependances..."
npm install

echo ""
echo "[2/2] Telechargement de Three.js..."
node -e "
const https = require('https'), fs = require('fs');
const file = fs.createWriteStream('src/three.min.js');
https.get('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', res => {
  res.pipe(file);
  file.on('finish', () => { console.log('Three.js telecharge OK'); file.close(); });
});
"

echo ""
echo "=== Pret ! Lance avec : npm start ==="
