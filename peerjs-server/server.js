'use strict'

const express          = require('express')
const cors             = require('cors')
const { ExpressPeerServer } = require('peer')

const PORT = process.env.PORT || 3000
const PATH = '/peerjs'

const app = express()
app.use(cors())

// Healthcheck (Hostinger / monitoring)
app.get('/', (req, res) => {
  res.json({
    service: 'insta360-peerjs-server',
    status: 'ok',
    path: PATH,
    time: new Date().toISOString()
  })
})

// Démarre HTTP server
const server = app.listen(PORT, () => {
  console.log(`[peerjs-server] HTTP listening on port ${PORT}`)
})

// Monte PeerJS sur /peerjs
const peerServer = ExpressPeerServer(server, {
  path: '/',          // → endpoint final = /peerjs/
  proxied: true,      // derrière le reverse proxy Hostinger (nginx)
  allow_discovery: false,
})

peerServer.on('connection', client => {
  console.log(`[peerjs-server] + client connected: ${client.getId()}`)
})

peerServer.on('disconnect', client => {
  console.log(`[peerjs-server] - client disconnected: ${client.getId()}`)
})

app.use(PATH, peerServer)
