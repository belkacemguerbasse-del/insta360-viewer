'use strict'

;(function () {
  // ── Éléments DOM ──────────────────────────────────────────────────────────
  const canvas    = document.getElementById('c')
  const splash    = document.getElementById('splash')
  const errMsg    = document.getElementById('err-msg')
  const liveBadge = document.getElementById('live-badge')
  const resLabel  = document.getElementById('res-label')
  const bottombar = document.getElementById('bottombar')
  const crosshair = document.getElementById('crosshair')
  const camSelect = document.getElementById('cam-select')
  const btnStart  = document.getElementById('btn-start')
  const btnStop   = document.getElementById('btn-stop')
  const btnLive   = document.getElementById('btn-live')
  const btnCenter = document.getElementById('btn-center')
  const btnCross  = document.getElementById('btn-cross')
  const btnFs     = document.getElementById('btn-fs')
  const fovRange  = document.getElementById('fov')
  const fovValEl  = document.getElementById('fov-val')

  // Live modal
  const liveModal      = document.getElementById('live-modal')
  const liveClose      = document.getElementById('btn-live-close')
  const liveIdInput    = document.getElementById('live-id')
  const liveUrlInput   = document.getElementById('live-url')
  const viewerBaseInput= document.getElementById('viewer-base')
  const btnSaveBase    = document.getElementById('btn-save-base')
  const btnCopyId      = document.getElementById('btn-copy-id')
  const btnCopyUrl     = document.getElementById('btn-copy-url')
  const liveQr         = document.getElementById('live-qr')
  const liveStatus     = document.getElementById('live-status')
  const liveStatusText = document.getElementById('live-status-text')
  const viewerCountEl  = document.getElementById('viewer-count')
  const btnStopLive    = document.getElementById('btn-stop-live')

  // ── State ──────────────────────────────────────────────────────────────────
  let renderer, scene, camera, sphere, videoTex
  let videoEl = null
  let stream  = null
  let lon = 0, lat = 0
  let isDragging = false
  let prevX = 0, prevY = 0
  let fov = 75
  let crossOn = false
  let animId = null

  // Live streaming P2P
  let peer        = null
  let peerId      = null
  const activeCalls = new Map()
  const DEFAULT_VIEWER_BASE = 'viewer.html'
  const LS_BASE_KEY = 'x5_viewer_base'

  // ── Initialisation Three.js ────────────────────────────────────────────────
  function initThree () {
    const w = canvas.parentElement.clientWidth
    const h = canvas.parentElement.clientHeight

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(w, h)
    renderer.setClearColor(0x0a0a0f)

    scene  = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(fov, w / h, 0.1, 2000)
    camera.position.set(0, 0, 0.001)

    videoEl = document.createElement('video')
    videoEl.autoplay   = true
    videoEl.muted      = true
    videoEl.playsInline = true

    videoTex = new THREE.VideoTexture(videoEl)
    videoTex.minFilter = THREE.LinearFilter
    videoTex.magFilter = THREE.LinearFilter
    videoTex.format    = THREE.RGBFormat

    const geo = new THREE.SphereGeometry(800, 64, 48)
    geo.scale(-1, 1, 1)                              // sphère retournée
    const mat = new THREE.MeshBasicMaterial({ map: videoTex })
    sphere = new THREE.Mesh(geo, mat)
    scene.add(sphere)

    window.addEventListener('resize', onResize)
    attachControls()
  }

  function onResize () {
    if (!renderer) return
    const el = canvas.parentElement
    renderer.setSize(el.clientWidth, el.clientHeight)
    camera.aspect = el.clientWidth / el.clientHeight
    camera.updateProjectionMatrix()
  }

  // ── Boucle de rendu ────────────────────────────────────────────────────────
  function renderLoop () {
    animId = requestAnimationFrame(renderLoop)
    if (videoTex) videoTex.needsUpdate = true

    lat = Math.max(-85, Math.min(85, lat))
    const phi   = THREE.MathUtils.degToRad(90 - lat)
    const theta = THREE.MathUtils.degToRad(lon)

    camera.lookAt(
      Math.sin(phi) * Math.cos(theta),
      Math.cos(phi),
      Math.sin(phi) * Math.sin(theta)
    )
    renderer.render(scene, camera)
  }

  // ── Contrôles souris / touch / molette ────────────────────────────────────
  function attachControls () {
    // Souris
    canvas.addEventListener('mousedown', e => {
      isDragging = true
      prevX = e.clientX; prevY = e.clientY
      canvas.classList.add('grabbing')
    })
    window.addEventListener('mousemove', e => {
      if (!isDragging) return
      lon -= (e.clientX - prevX) * 0.18
      lat += (e.clientY - prevY) * 0.18
      prevX = e.clientX; prevY = e.clientY
    })
    window.addEventListener('mouseup', () => {
      isDragging = false
      canvas.classList.remove('grabbing')
    })

    // Touch
    canvas.addEventListener('touchstart', e => {
      if (e.touches.length !== 1) return
      isDragging = true
      prevX = e.touches[0].clientX; prevY = e.touches[0].clientY
    }, { passive: true })
    canvas.addEventListener('touchmove', e => {
      if (!isDragging || e.touches.length !== 1) return
      lon -= (e.touches[0].clientX - prevX) * 0.22
      lat += (e.touches[0].clientY - prevY) * 0.22
      prevX = e.touches[0].clientX; prevY = e.touches[0].clientY
    }, { passive: true })
    canvas.addEventListener('touchend', () => { isDragging = false }, { passive: true })

    // Molette → zoom
    canvas.addEventListener('wheel', e => {
      fov += e.deltaY * 0.04
      fov = Math.max(30, Math.min(110, fov))
      fovRange.value = Math.round(fov)
      fovValEl.textContent = Math.round(fov) + '°'
      camera.fov = fov
      camera.updateProjectionMatrix()
    }, { passive: true })
  }

  // ── Détection des caméras ──────────────────────────────────────────────────
  async function populateCameras () {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const vids    = devices.filter(d => d.kind === 'videoinput')

      camSelect.innerHTML = ''
      if (vids.length === 0) {
        const opt = document.createElement('option')
        opt.value = ''
        opt.textContent = 'Aucune caméra détectée'
        camSelect.appendChild(opt)
        return
      }

      vids.forEach((d, i) => {
        const opt = document.createElement('option')
        opt.value = d.deviceId
        opt.textContent = d.label || `Caméra ${i + 1}`
        // Pré-sélectionner Insta360
        if (d.label.toLowerCase().includes('insta360') || d.label.toLowerCase().includes('x5')) {
          opt.selected = true
          opt.textContent += ' ★'
        }
        camSelect.appendChild(opt)
      })
    } catch (e) {
      console.warn('enumerate devices:', e)
    }
  }

  // ── Démarrer le stream ─────────────────────────────────────────────────────
  async function startStream () {
    errMsg.classList.remove('on')
    btnStart.disabled = true
    btnStart.textContent = 'Connexion…'

    const deviceId = camSelect.value

    const constraints = {
      video: {
        ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        width:  { ideal: 2880 },
        height: { ideal: 1440 },
        frameRate: { ideal: 30 }
      },
      audio: false
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints)
      videoEl.srcObject = stream
      await videoEl.play()

      // Affichage résolution réelle
      videoEl.addEventListener('loadedmetadata', () => {
        resLabel.textContent = videoEl.videoWidth + '×' + videoEl.videoHeight
        resLabel.classList.add('on')
      }, { once: true })

      // Masquer splash, afficher viewer
      splash.style.display    = 'none'
      liveBadge.classList.add('on')
      bottombar.classList.add('on')
      btnStop.disabled = false
      btnLive.disabled = false

    } catch (err) {
      let msg = 'Erreur : ' + err.message
      if (err.name === 'NotFoundError')    msg = 'Caméra introuvable. Vérifie la connexion USB et le mode Webcam.'
      if (err.name === 'NotAllowedError')  msg = 'Accès refusé. Relance l\'application.'
      if (err.name === 'NotReadableError') msg = 'Caméra déjà utilisée par une autre application.'
      errMsg.textContent = msg
      errMsg.classList.add('on')
      btnStart.disabled = false
      btnStart.textContent = 'Réessayer'
    }
  }

  // ── Arrêter le stream ──────────────────────────────────────────────────────
  function stopStream () {
    stopLive()
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null }
    if (videoEl) { videoEl.srcObject = null }
    liveBadge.classList.remove('on')
    resLabel.classList.remove('on')
    bottombar.classList.remove('on')
    splash.style.display = 'flex'
    btnStop.disabled = true
    btnLive.disabled = true
    btnStart.disabled = false
    btnStart.textContent = 'Démarrer'
    errMsg.classList.remove('on')
  }

  // ── Contrôles UI ──────────────────────────────────────────────────────────
  btnStart.addEventListener('click', async () => {
    if (!renderer) {
      initThree()
      renderLoop()
    }
    await populateCameras()
    await startStream()
  })

  btnStop.addEventListener('click', stopStream)

  btnCenter.addEventListener('click', () => { lon = 0; lat = 0 })

  btnCross.addEventListener('click', () => {
    crossOn = !crossOn
    crosshair.classList.toggle('on', crossOn)
  })

  btnFs.addEventListener('click', () => {
    const el = document.documentElement
    if (!document.fullscreenElement) {
      el.requestFullscreen && el.requestFullscreen()
    } else {
      document.exitFullscreen && document.exitFullscreen()
    }
  })
  document.addEventListener('fullscreenchange', () => setTimeout(onResize, 80))

  fovRange.addEventListener('input', () => {
    fov = parseInt(fovRange.value)
    fovValEl.textContent = fov + '°'
    if (camera) { camera.fov = fov; camera.updateProjectionMatrix() }
  })

  // Raccourcis clavier
  window.addEventListener('keydown', e => {
    if (e.key === 'c' || e.key === 'C') { lon = 0; lat = 0 }           // centrer
    if (e.key === 'f' || e.key === 'F') btnFs.click()                   // fullscreen
    if (e.key === '+' || e.key === '=') { fov = Math.max(30, fov - 5); fovRange.value = fov; fovValEl.textContent = fov + '°'; if(camera){camera.fov=fov;camera.updateProjectionMatrix()} }
    if (e.key === '-')                  { fov = Math.min(110, fov + 5); fovRange.value = fov; fovValEl.textContent = fov + '°'; if(camera){camera.fov=fov;camera.updateProjectionMatrix()} }
  })

  // ── LIVE STREAMING P2P (PeerJS) ────────────────────────────────────────────
  function shortId () { return 'x5-' + Math.random().toString(36).slice(2, 8) }

  function setLiveStatus (state, text) {
    liveStatus.className = 'live-status ' + state
    liveStatusText.textContent = text
  }

  function updateViewerCount () { viewerCountEl.textContent = activeCalls.size }

  function getViewerBase () {
    return localStorage.getItem(LS_BASE_KEY) || DEFAULT_VIEWER_BASE
  }

  function buildViewerUrl (id) {
    const base = getViewerBase()
    const sep  = base.includes('?') ? '&' : '?'
    return base + sep + 'id=' + encodeURIComponent(id)
  }

  function refreshUrlAndQr () {
    if (!peerId) return
    const url = buildViewerUrl(peerId)
    liveUrlInput.value = url
    liveQr.src = 'https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=' + encodeURIComponent(url)
    liveQr.classList.add('on')
  }

  function startLive () {
    if (peer) { liveModal.classList.add('on'); return }
    if (!stream) {
      setLiveStatus('error', 'Démarre d\'abord la caméra')
      liveModal.classList.add('on')
      return
    }

    liveModal.classList.add('on')
    setLiveStatus('connecting', 'Connexion au réseau P2P…')
    liveIdInput.value = '—'
    liveUrlInput.value = '—'
    liveQr.classList.remove('on')

    peerId = shortId()
    peer   = new Peer(peerId, { debug: 1 })

    peer.on('open', id => {
      peerId = id
      liveIdInput.value = id
      refreshUrlAndQr()
      setLiveStatus('live', 'EN DIRECT — en attente de spectateurs')
      btnLive.classList.add('broadcasting')
      btnLive.title = 'Live actif — cliquer pour gérer'
    })

    peer.on('call', call => {
      call.answer(stream)
      activeCalls.set(call.peer, call)
      updateViewerCount()
      call.on('close', () => { activeCalls.delete(call.peer); updateViewerCount() })
      call.on('error', err => {
        console.warn('call error', err)
        activeCalls.delete(call.peer); updateViewerCount()
      })
    })

    peer.on('error', err => {
      console.error('peer error', err)
      setLiveStatus('error', 'Erreur P2P : ' + err.type)
      if (err.type === 'unavailable-id') {
        stopLive(true)
        setTimeout(startLive, 300)
      }
    })

    peer.on('disconnected', () => {
      setLiveStatus('connecting', 'Reconnexion…')
      try { peer.reconnect() } catch (_) {}
    })
  }

  function stopLive (silent) {
    activeCalls.forEach(c => { try { c.close() } catch (_) {} })
    activeCalls.clear()
    updateViewerCount()
    if (peer) { try { peer.destroy() } catch (_) {} }
    peer = null
    peerId = null
    btnLive.classList.remove('broadcasting')
    btnLive.title = 'Diffuser en direct (P2P)'
    if (!silent) {
      setLiveStatus('connecting', 'Diffusion arrêtée')
      liveIdInput.value = '—'
      liveUrlInput.value = '—'
      liveQr.classList.remove('on')
    }
  }

  btnLive.addEventListener('click', () => {
    if (peer) liveModal.classList.add('on')
    else      startLive()
  })

  btnStopLive.addEventListener('click', () => {
    stopLive()
    liveModal.classList.remove('on')
  })

  liveClose.addEventListener('click', () => liveModal.classList.remove('on'))
  liveModal.addEventListener('click', e => { if (e.target === liveModal) liveModal.classList.remove('on') })

  btnCopyId.addEventListener('click', () => {
    if (!peerId) return
    navigator.clipboard.writeText(peerId)
    btnCopyId.textContent = '✓'
    setTimeout(() => btnCopyId.textContent = 'Copier', 1200)
  })

  btnCopyUrl.addEventListener('click', () => {
    if (!peerId) return
    navigator.clipboard.writeText(liveUrlInput.value)
    btnCopyUrl.textContent = '✓'
    setTimeout(() => btnCopyUrl.textContent = 'Copier', 1200)
  })

  viewerBaseInput.value = localStorage.getItem(LS_BASE_KEY) || ''
  btnSaveBase.addEventListener('click', () => {
    const v = viewerBaseInput.value.trim()
    if (v) localStorage.setItem(LS_BASE_KEY, v)
    else   localStorage.removeItem(LS_BASE_KEY)
    refreshUrlAndQr()
    btnSaveBase.textContent = '✓'
    setTimeout(() => btnSaveBase.textContent = 'OK', 1200)
  })

  // Pré-énumérer les caméras au chargement (sans permission requise)
  populateCameras()
})()
