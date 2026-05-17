@echo off
echo === Insta360 360 Viewer - Installation ===
echo.

REM Verifier Node.js
node --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
  echo ERREUR: Node.js n'est pas installe.
  echo Telecharge-le sur https://nodejs.org
  pause
  exit /b 1
)

echo [1/2] Installation des dependances...
npm install

echo.
echo [2/2] Telechargement de Three.js...
node -e "const https=require('https'),fs=require('fs');const f=fs.createWriteStream('src/three.min.js');https.get('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',r=>{r.pipe(f);f.on('finish',()=>{console.log('Three.js OK');f.close()})});"

echo.
echo === Installation terminee ! ===
echo Lance l'application avec : npm start
echo.
pause
