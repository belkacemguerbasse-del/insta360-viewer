# Serveur PeerJS auto-hébergé

Petit serveur Node.js pour remplacer le cloud public `peerjs.com`.
À déployer sur Hostinger (ou tout host Node.js ≥ 18).

## Déploiement sur Hostinger

### 1. Créer l'app Node.js

hPanel → **Sites web** → **Ajouter un site web** → **Application web Node.js**

- Domaine ou sous-domaine : ex. `peer.tondomaine.com` (recommandé)
- Source : upload ce dossier OU connecter un repo GitHub
- Version Node : 18+
- Fichier de démarrage : `server.js`
- Commande de démarrage : `npm start`

### 2. SSL

hPanel → **Sécurité** → **SSL** → installer Let's Encrypt sur `peer.tondomaine.com` (auto, gratuit).
**Indispensable** : les navigateurs n'autorisent WSS que sur HTTPS.

### 3. Vérifier

Ouvre `https://peer.tondomaine.com/` → tu dois voir le JSON :
```json
{ "service": "insta360-peerjs-server", "status": "ok", ... }
```

Et `https://peer.tondomaine.com/peerjs/` doit répondre `{"name":"PeerJS Server"}`.

## Endpoint à utiliser côté clients

```js
new Peer(peerId, {
  host:   'peer.tondomaine.com',
  port:   443,
  path:   '/peerjs',
  secure: true
})
```
