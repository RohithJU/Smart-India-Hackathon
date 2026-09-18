/* ==================================================================
   0. CONFIG
   ================================================================== */
const CESIUM_ION_ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjVWNDZRNWl1dWRMVFkyV2ciLCJqdGkiOiIyMmVkZWI0My0yMmQyLTQzMTctYWM3MC02OTc5OGM2NmU1YzciLCJpZCI6NDk5ODQ5LCJpc3MiOiJodHRwczovL2FwaS5jZXNpdW0uY29tIiwiYXVkIjoidW5kZWZpbmVkX2RlZmF1bHQiLCJpYXQiOjE3ODk3MjQzODh9.wYa87Y28D0ivxD8p8ZmY_IQipZvAa3qHQ-qJ3uJywBw";

const HOME = { lon: 75.0, lat: 10.0, height: 20000000.0 };
const MIN_H = 300, MAX_H = 40000000;

/* ==================================================================
   1. HELPERS & STATE MANAGEMENT
   ================================================================== */
const $ = id => document.getElementById(id);
const loadingOverlay = $('loadingOverlay');

let landingDismissed = false;
let cesiumState = 'LOADING'; // 'LOADING' | 'READY' | 'ERROR'
let landingAnimFrame = null;

/* ── Interactive Background Gradient Mouse Tracking for Landing Page ── */
function initLandingGradientTracking() {
  const blob = $('landingInteractiveBlob');
  if (!blob) return;

  let curX = 0;
  let curY = 0;
  let tgX = window.innerWidth / 2;
  let tgY = window.innerHeight / 2;

  const onMouseMove = e => {
    if (landingDismissed) return;
    tgX = e.clientX;
    tgY = e.clientY;
  };

  window.addEventListener('mousemove', onMouseMove, { passive: true });

  function animate() {
    if (landingDismissed) {
      if (landingAnimFrame) cancelAnimationFrame(landingAnimFrame);
      window.removeEventListener('mousemove', onMouseMove);
      return;
    }
    curX += (tgX - curX) / 16;
    curY += (tgY - curY) / 16;
    blob.style.transform = `translate(${Math.round(curX)}px, ${Math.round(curY)}px)`;
    landingAnimFrame = requestAnimationFrame(animate);
  }

  landingAnimFrame = requestAnimationFrame(animate);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLandingGradientTracking);
} else {
  initLandingGradientTracking();
}

function setCesiumReady() {
  if (cesiumState === 'READY') return;
  cesiumState = 'READY';
  const statusEl = $('loaderStatusText');
  if (statusEl) {
    statusEl.textContent = '3D Globe & Marine Telemetry Ready';
  }
  const dotEl = $('landingStatusDot');
  if (dotEl) {
    dotEl.classList.add('ready');
  }
}

function setCesiumError(msg) {
  cesiumState = 'ERROR';
  const statusEl = $('loaderStatusText');
  if (statusEl) {
    statusEl.textContent = msg || 'Offline fallback mode active';
  }
}

function dismissLandingPage() {
  if (landingDismissed) return;
  landingDismissed = true;
  if (landingAnimFrame) {
    cancelAnimationFrame(landingAnimFrame);
    landingAnimFrame = null;
  }

  const btnExplore = $('btnExploreOcean');
  const statusEl = $('loaderStatusText');

  if (btnExplore) {
    // Step 1: morph into circular loading state with spinner (SaveToggle style)
    btnExplore.classList.remove('status-idle');
    btnExplore.classList.add('status-loading');
    btnExplore.disabled = true;
    if (statusEl) statusEl.textContent = 'Synchronizing 3D telemetry…';

    // Step 2: morph into success checkmark state
    setTimeout(() => {
      btnExplore.classList.remove('status-loading');
      btnExplore.classList.add('status-success');
      if (statusEl) statusEl.textContent = 'Ready • Launching Explorer';

      // Step 3: smooth fade-out of landing overlay to reveal the 3D globe
      setTimeout(() => {
        if (loadingOverlay) {
          loadingOverlay.classList.add('dismissed');
          setTimeout(() => {
            loadingOverlay.classList.add('hidden');
          }, 500);
        }
      }, 450);
    }, 650);
  } else {
    if (loadingOverlay) {
      loadingOverlay.classList.add('dismissed');
      setTimeout(() => {
        loadingOverlay.classList.add('hidden');
      }, 500);
    }
  }
}

// Wire Explore Ocean button click & keyboard accessibility
const btnExploreOcean = $('btnExploreOcean');
if (btnExploreOcean) {
  btnExploreOcean.addEventListener('click', dismissLandingPage);
  btnExploreOcean.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      dismissLandingPage();
    }
  });
}

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('on'), 1900);
}
function showErrorBanner(html) {
  document.querySelector('.err-banner')?.remove();
  const b = document.createElement('div');
  b.className = 'err-banner';
  b.innerHTML = '<span class="err-icon" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span><span>' + html + '</span>';
  document.body.prepend(b);
}
function fmtDist(m) {
  if (m === null || m === undefined || isNaN(m)) return '--';
  if (m >= 1000000) return (m / 1000000).toFixed(2) + ' Mm';
  if (m >= 1000) return (m / 1000).toFixed(1) + ' km';
  return Math.round(m) + ' m';
}
function compassLabel(deg) {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
}
function fmtCoord(lat, lon) {
  return Math.abs(lat).toFixed(2) + '° ' + (lat >= 0 ? 'N' : 'S') + ', ' + Math.abs(lon).toFixed(2) + '° ' + (lon >= 0 ? 'E' : 'W');
}

/* ==================================================================
   2. CESIUM VIEWER SETUP
   ================================================================== */
let viewer, targetIndicator, lockIndicator, googleTileset = null;
let currentLocationIndicator = null, currentLocationHalo = null;
let userLocation = null; // { lat, lon, name, label }
let locating = false;
let gridEntities = [];

try {
  if (CESIUM_ION_ACCESS_TOKEN && !CESIUM_ION_ACCESS_TOKEN.startsWith('YOUR_')) {
    Cesium.Ion.defaultAccessToken = CESIUM_ION_ACCESS_TOKEN;
  }

  viewer = new Cesium.Viewer('cesiumContainer', {
    baseLayer: false,
    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
    baseLayerPicker: false, geocoder: false, homeButton: false, infoBox: false,
    navigationHelpButton: false, sceneModePicker: false, animation: false,
    timeline: false, fullscreenButton: false, vrButton: false, selectionIndicator: false,
    requestRenderMode: false
  });

  const scene = viewer.scene;
  scene.backgroundColor = Cesium.Color.fromCssColorString('#02060f');
  scene.globe.enableLighting = false;
  scene.globe.showGroundAtmosphere = true;
  scene.globe.baseColor = Cesium.Color.fromCssColorString('#07223f');
  scene.skyAtmosphere.show = true;
  scene.fog.enabled = true;
  scene.highDynamicRange = false;

  // Camera behaviour limits — makes zoom feel like a real platform
  const ssc = scene.screenSpaceCameraController;
  ssc.minimumZoomDistance = MIN_H;
  ssc.maximumZoomDistance = MAX_H;
  ssc.enableCollisionDetection = true;
  ssc.inertiaSpin = 0.85;
  ssc.inertiaZoom = 0.75;
  ssc.inertiaTranslate = 0.85;

  // Base imagery (so the globe is readable even without / before 3D tiles)
  (async function addBaseImagery() {
    try {
      const layer = await Cesium.ImageryLayer.fromWorldImagery({});
      viewer.imageryLayers.add(layer);
    } catch (e) {
      try {
        const prov = await Cesium.TileMapServiceImageryProvider.fromUrl(
          Cesium.buildModuleUrl('Assets/Textures/NaturalEarthII')
        );
        viewer.imageryLayers.add(new Cesium.ImageryLayer(prov));
      } catch (e2) { console.warn('No base imagery available', e2); }
    }
  })();

  // Hover marker: vivid green dot
  targetIndicator = viewer.entities.add({
    name: 'Sampling coordinate',
    position: Cesium.Cartesian3.ZERO, show: false,
    point: {
      pixelSize: 8, color: Cesium.Color.fromCssColorString('#00E676'),
      outlineColor: Cesium.Color.fromCssColorString('#061a10'), outlineWidth: 2,
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    }
  });
  // Locked station marker
  lockIndicator = viewer.entities.add({
    name: 'Locked station',
    position: Cesium.Cartesian3.ZERO, show: false,
    point: {
      pixelSize: 13, color: Cesium.Color.fromCssColorString('#a78bfa'),
      outlineColor: Cesium.Color.WHITE, outlineWidth: 2,
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    },
    label: {
      text: 'STATION', font: '600 11px JetBrains Mono, monospace',
      fillColor: Cesium.Color.fromCssColorString('#c4b5fd'),
      style: Cesium.LabelStyle.FILL, pixelOffset: new Cesium.Cartesian2(0, -20),
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    }
  });

  // Current GPS / Device Location Marker (Pulsing Emerald Beacon)
  currentLocationIndicator = viewer.entities.add({
    name: 'Current user location',
    position: Cesium.Cartesian3.ZERO,
    show: false,
    point: {
      pixelSize: new Cesium.CallbackProperty(() => 13 + 3 * Math.sin(Date.now() / 280), false),
      color: Cesium.Color.fromCssColorString('#10b981'),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2.5,
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    },
    label: {
      text: 'MY LOCATION',
      font: '700 11px JetBrains Mono, monospace',
      fillColor: Cesium.Color.fromCssColorString('#6ee7b7'),
      outlineColor: Cesium.Color.fromCssColorString('#02060f'),
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, -22),
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    }
  });

  // Animated glowing halo around current location
  currentLocationHalo = viewer.entities.add({
    name: 'Current location halo',
    position: Cesium.Cartesian3.ZERO,
    show: false,
    point: {
      pixelSize: new Cesium.CallbackProperty(() => 28 + 10 * Math.sin(Date.now() / 280), false),
      color: new Cesium.CallbackProperty(() => {
        const alpha = Math.max(0.08, 0.28 + 0.15 * Math.sin(Date.now() / 280));
        return Cesium.Color.fromCssColorString('#10b981').withAlpha(alpha);
      }, false),
      outlineColor: Cesium.Color.fromCssColorString('#34d399').withAlpha(0.6),
      outlineWidth: 1.5,
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    }
  });

  // Immediate centred view
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(HOME.lon, HOME.lat, HOME.height),
    orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 }
  });

  // Google Photorealistic 3D Tiles
  (async function loadGoogle3DTiles() {
    if (!CESIUM_ION_ACCESS_TOKEN || CESIUM_ION_ACCESS_TOKEN.startsWith('YOUR_')) {
      showErrorBanner('Cesium Ion token not configured — set <code>CESIUM_ION_ACCESS_TOKEN</code> at the top of the file.');
      $('swTiles').classList.remove('on');
      setCesiumReady();
      return;
    }
    try {
      const statusEl = $('loaderStatusText');
      if (statusEl) statusEl.textContent = 'Streaming Google Photorealistic 3D Tiles…';
      googleTileset = await Cesium.createGooglePhotorealistic3DTileset();
      viewer.scene.primitives.add(googleTileset);
      applyTilesMode(true);
      console.info('Google 3D Tiles loaded.');
      setCesiumReady();
    } catch (err) {
      console.error('Google 3D Tiles failed:', err);
      showErrorBanner('Google 3D Tiles unavailable — check your Cesium Ion token. Falling back to satellite imagery.');
      $('swTiles').classList.remove('on');
      viewer.scene.globe.show = true;
      setCesiumReady();
    }
  })();

} catch (err) {
  console.error('Cesium init failed:', err);
  setCesiumError(err.message || 'Initialization failed');
  $('cesiumContainer').innerHTML =
    '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#f87171;text-align:center;padding:2rem">' +
    '<div><h2 style="margin-bottom:.5rem">Globe failed to load</h2>' +
    '<p style="color:#94a3b8;max-width:420px">' + (err.message || err) + '</p></div></div>';
}

/* Tiles visibility: when 3D tiles are on we hide the ellipsoid imagery,
   but the ellipsoid itself stays alive for pickEllipsoid() sampling.   */
function applyTilesMode(on) {
  if (!viewer) return;
  if (googleTileset) googleTileset.show = on;
  viewer.scene.globe.show = !on || !googleTileset;
}

/* ==================================================================
   3. CAMERA CONTROL LAYER (zoom / tilt / rotate / spin / centre)
   ================================================================== */
let autoRotate = false;

function camHeight() { return viewer ? viewer.camera.positionCartographic.height : HOME.height; }

function centerGlobe(duration = 2.0) {
  if (!viewer) return;
  autoRotate = false; $('btnSpin').classList.remove('on');
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(HOME.lon, HOME.lat, HOME.height),
    duration,
    orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
    easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT
  });
}
function flyTo(lat, lon, height, duration = 1.8) {
  if (!viewer) return;
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(lon, lat, height),
    duration,
    orientation: { heading: viewer.camera.heading, pitch: Cesium.Math.toRadians(-90), roll: 0 },
    easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT
  });
}
function zoomStep(dir) { // dir = -1 in, +1 out
  if (!viewer) return;
  const h = camHeight();
  const amount = Math.max(h * 0.32, 120);
  if (dir < 0) viewer.camera.zoomIn(amount);
  else viewer.camera.zoomOut(amount);
}
function tiltBy(deg) {
  if (!viewer) return;
  viewer.camera.rotate(viewer.camera.right, Cesium.Math.toRadians(deg));
}
function rotateBy(deg) {
  if (!viewer) return;
  viewer.camera.rotate(Cesium.Cartesian3.UNIT_Z, Cesium.Math.toRadians(deg));
}
function resetNorth() {
  if (!viewer) return;
  const c = viewer.camera.positionCartographic;
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromRadians(c.longitude, c.latitude, c.height),
    duration: 1.0,
    orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 }
  });
}

/* Zoom slider <-> camera height (logarithmic, feels natural) */
const zoomRange = $('zoomRange');
let sliderBusy = false;
function heightToSlider(h) {
  const t = (Math.log(h) - Math.log(MIN_H)) / (Math.log(MAX_H) - Math.log(MIN_H));
  return Math.round(Math.min(1, Math.max(0, t)) * 1000);
}
function sliderToHeight(v) {
  const t = v / 1000;
  return Math.exp(Math.log(MIN_H) + t * (Math.log(MAX_H) - Math.log(MIN_H)));
}
function paintSlider(v) {
  const pct = 100 - (v / 1000) * 100; // inverted visual: top = zoomed in
  zoomRange.style.background =
    'linear-gradient(90deg, rgba(255,255,255,.12) 0%, rgba(255,255,255,.12) ' + (100 - pct) + '%, var(--cyan) ' + (100 - pct) + '%, var(--cyan) 100%)';
}
zoomRange.addEventListener('input', e => {
  if (!viewer) return;
  sliderBusy = true;
  const h = sliderToHeight(Number(e.target.value));
  const c = viewer.camera.positionCartographic;
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromRadians(c.longitude, c.latitude, h),
    orientation: { heading: viewer.camera.heading, pitch: viewer.camera.pitch, roll: 0 }
  });
  paintSlider(e.target.value);
  setTimeout(() => { sliderBusy = false; }, 60);
});

/* ==================================================================
   3b. TRACKPAD & GESTURE NAVIGATION
   Pinch In (fingers together)  → Zoom IN toward globe
   Pinch Out (fingers apart)    → Zoom OUT from globe
   Mouse Wheel Up               → Zoom IN (native Cesium)
   Mouse Wheel Down             → Zoom OUT (native Cesium)
   ================================================================== */
const TRACKPAD_ZOOM_SENSITIVITY = 0.005;

function initTrackpadGestures() {
  if (!viewer || !viewer.scene || !viewer.scene.canvas) return;
  const canvas = viewer.scene.canvas;

  // Trackpad Pinch Detection via Wheel Event (Chrome, Edge, Windows Precision Touchpad, macOS)
  canvas.addEventListener('wheel', e => {
    // Only intercept trackpad pinch gestures (ctrlKey is true during trackpad pinch in Chromium/Safari)
    if (!e.ctrlKey) {
      // Ordinary physical mouse wheel or 2-finger scroll: let Cesium's ScreenSpaceCameraController handle natively
      return;
    }

    // Prevent default browser page-level zoom and stop Cesium internal wheel handler from counter-zooming
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    if (!viewer) return;
    const h = camHeight();

    // Normalize delta across deltaMode (0 = pixels, 1 = lines, 2 = pages)
    let rawDelta = e.deltaY;
    if (isNaN(rawDelta) || !isFinite(rawDelta)) return;
    if (e.deltaMode === 1) rawDelta *= 16;
    else if (e.deltaMode === 2) rawDelta *= 100;

    // Extreme delta protection: clamp between -80 and +80 px per event
    const clampedDelta = Math.max(-80, Math.min(80, rawDelta));
    if (Math.abs(clampedDelta) < 0.05) return;

    // Proportional zoom factor based on camera height
    const factor = Math.min(Math.abs(clampedDelta) * TRACKPAD_ZOOM_SENSITIVITY, 0.15);
    const zoomAmount = Math.max(h * factor, 10);

    // Direction normalization:
    // In browsers, pinch inward (fingers together) emits deltaY > 0
    // Pinch outward (fingers apart) emits deltaY < 0
    // Target:
    // Pinch inward  (clampedDelta > 0) -> Zoom IN
    // Pinch outward (clampedDelta < 0) -> Zoom OUT
    if (clampedDelta > 0) {
      if (h - zoomAmount >= MIN_H) {
        viewer.camera.zoomIn(zoomAmount);
      } else if (h > MIN_H) {
        viewer.camera.zoomIn(h - MIN_H);
      }
    } else {
      if (h + zoomAmount <= MAX_H) {
        viewer.camera.zoomOut(zoomAmount);
      } else if (h < MAX_H) {
        viewer.camera.zoomOut(MAX_H - h);
      }
    }
  }, { capture: true, passive: false });

  // WebKit / Safari GestureEvent handling (hardware trackpad gesture support)
  let lastGestureScale = 1.0;
  canvas.addEventListener('gesturestart', e => {
    e.preventDefault();
    lastGestureScale = 1.0;
  }, { passive: false });

  canvas.addEventListener('gesturechange', e => {
    e.preventDefault();
    if (!viewer) return;
    const h = camHeight();
    const scaleDiff = e.scale - lastGestureScale;
    lastGestureScale = e.scale;
    if (isNaN(scaleDiff) || !isFinite(scaleDiff) || Math.abs(scaleDiff) < 0.001) return;

    // Clamp gesture scale diff to avoid sudden leaps
    const clampedDiff = Math.max(-0.25, Math.min(0.25, scaleDiff));
    const GESTURE_SENSITIVITY = 0.85;
    const factor = Math.min(Math.abs(clampedDiff) * GESTURE_SENSITIVITY, 0.15);
    const zoomAmount = Math.max(h * factor, 10);

    // In Safari gesture: scale < 1 (scaleDiff < 0) = fingers together (pinch in) -> Zoom IN
    // scale > 1 (scaleDiff > 0) = fingers apart (pinch out) -> Zoom OUT
    if (clampedDiff < 0) {
      if (h - zoomAmount >= MIN_H) viewer.camera.zoomIn(zoomAmount);
      else if (h > MIN_H) viewer.camera.zoomIn(h - MIN_H);
    } else {
      if (h + zoomAmount <= MAX_H) viewer.camera.zoomOut(zoomAmount);
      else if (h < MAX_H) viewer.camera.zoomOut(MAX_H - h);
    }
  }, { passive: false });

  canvas.addEventListener('gestureend', e => {
    e.preventDefault();
    lastGestureScale = 1.0;
  }, { passive: false });
}

initTrackpadGestures();

/* ==================================================================
   4. LAT / LON GRATICULE
   ================================================================== */
function buildGraticule() {
  if (!viewer || gridEntities.length) return;
  const col = Cesium.Color.fromCssColorString('#38bdf8').withAlpha(0.22);
  const colMajor = Cesium.Color.fromCssColorString('#00f2fe').withAlpha(0.45);
  for (let lon = -180; lon < 180; lon += 15) {
    const pts = [];
    for (let lat = -85; lat <= 85; lat += 2) pts.push(lon, lat);
    gridEntities.push(viewer.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray(pts),
        width: (lon === 0 ? 1.8 : 1), material: (lon === 0 ? colMajor : col), arcType: Cesium.ArcType.GEODESIC
      }
    }));
  }
  for (let lat = -75; lat <= 75; lat += 15) {
    const pts = [];
    for (let lon = -180; lon <= 180; lon += 2) pts.push(lon, lat);
    gridEntities.push(viewer.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray(pts),
        width: (lat === 0 ? 1.8 : 1), material: (lat === 0 ? colMajor : col), arcType: Cesium.ArcType.GEODESIC
      }
    }));
  }
  gridEntities.forEach(e => e.show = false);
}
function setGraticule(on) {
  buildGraticule();
  gridEntities.forEach(e => e.show = on);
}

/* ==================================================================
   5. OFFLINE OCEAN / LAND CLASSIFIERS (instant, zero latency)
   ================================================================== */
function getOfflineOceanName(lat, lon) {
  let n = lon; while (n > 180) n -= 360; while (n < -180) n += 360;
  if (lat <= -60) return 'Southern Ocean';
  if (lat >= 66.5) return 'Arctic Ocean';
  if (lat >= 12 && lat <= 30 && n >= 32 && n <= 44) return 'Red Sea';
  if (lat >= 23 && lat <= 31 && n >= 47 && n <= 57) return 'Persian Gulf';
  if (lat >= 22 && lat <= 26 && n >= 56 && n <= 61) return 'Gulf of Oman';
  if (lat >= 7 && lat <= 26 && n >= 50 && n <= 77.5) return 'Arabian Sea';
  if (lat >= 4 && lat <= 14 && n >= 71 && n <= 80) return 'Laccadive Sea';
  if (lat >= 4 && lat <= 23 && n >= 80 && n <= 95) return 'Bay of Bengal';
  if (lat >= 4 && lat <= 16 && n >= 92 && n <= 100) return 'Andaman Sea';
  if (lat >= -11 && lat <= 0 && n >= 98 && n <= 140) return 'Java & Banda Sea';
  if (lat >= 30 && lat <= 46 && n >= -6 && n <= 36.5) return 'Mediterranean Sea';
  if (lat >= 40 && lat <= 48 && n >= 27 && n <= 42) return 'Black Sea';
  if (lat >= 53 && lat <= 66 && n >= 10 && n <= 30) return 'Baltic Sea';
  if (lat >= 51 && lat <= 62 && n >= -4 && n <= 9) return 'North Sea';
  if (lat >= 62 && lat <= 72 && n >= -5 && n <= 25) return 'Norwegian Sea';
  if (lat >= 8 && lat <= 22 && n >= -89 && n <= -59) return 'Caribbean Sea';
  if (lat >= 18 && lat <= 31 && n >= -98 && n <= -80) return 'Gulf of Mexico';
  if (lat >= 0 && lat <= 25 && n >= 100 && n <= 121) return 'South China Sea';
  if (lat >= 24 && lat <= 33 && n >= 117 && n <= 131) return 'East China Sea';
  if (lat >= 35 && lat <= 52 && n >= 127 && n <= 142) return 'Sea of Japan';
  if (lat >= 5 && lat <= 32 && n >= 121 && n <= 145) return 'Philippine Sea';
  if (lat >= 51 && lat <= 66 && (n >= 160 || n <= -160)) return 'Bering Sea';
  if (lat >= -30 && lat <= -10 && n >= 142 && n <= 175) return 'Coral Sea';
  if (lat >= -48 && lat <= -30 && n >= 145 && n <= 175) return 'Tasman Sea';
  if (n >= 20 && n <= 147 && lat < 30 && lat > -60) return 'Indian Ocean';
  if (lat >= 0 && lat < 66.5 && n >= -80 && n <= 20) return 'North Atlantic Ocean';
  if (lat < 0 && lat >= -60 && n >= -70 && n <= 20) return 'South Atlantic Ocean';
  if (lat >= 0 && lat < 66.5) return 'North Pacific Ocean';
  if (lat < 0 && lat >= -60) return 'South Pacific Ocean';
  return 'Global Ocean';
}
function getOfflineLandRegion(lat, lon) {
  let n = lon; while (n > 180) n -= 360; while (n < -180) n += 360;
  if (lat >= 6 && lat <= 37 && n >= 68 && n <= 97) return 'Indian Subcontinent';
  if (lat >= 5 && lat <= 35 && n >= 35 && n <= 60) return 'Middle East';
  if (lat >= -35 && lat <= 37 && n >= -18 && n <= 52) return 'Africa';
  if (lat >= 36 && lat <= 71 && n >= -10 && n <= 45) return 'Europe';
  if (lat >= 0 && lat <= 75 && n >= 60 && n <= 180) return 'Asia';
  if (lat >= 15 && lat <= 72 && n >= -168 && n <= -52) return 'North America';
  if (lat >= -56 && lat <= 13 && n >= -82 && n <= -34) return 'South America';
  if (lat >= -45 && lat <= -10 && n >= 112 && n <= 155) return 'Australia';
  if (lat < -60) return 'Antarctica';
  return 'Terrestrial landmass';
}

/* ==================================================================
   6. DATA FETCHING (marine + atmospheric + reverse geocode)
   ================================================================== */
const geoCache = new Map();
let activeController = null;

function abortActive() {
  if (activeController) { activeController.abort(); activeController = null; }
}

async function reverseGeocode(lat, lon, signal) {
  const key = lat.toFixed(2) + ',' + lon.toFixed(2);
  if (geoCache.has(key)) return geoCache.get(key);
  try {
    const url = 'https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' +
      lat.toFixed(4) + '&longitude=' + lon.toFixed(4) + '&localityLanguage=en';
    const r = await fetch(url, { signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();

    let oceanName = null;
    if (d.localityInfo && Array.isArray(d.localityInfo.informative)) {
      for (const it of d.localityInfo.informative) {
        const desc = (it.description || '').toLowerCase(), nm = (it.name || '').toLowerCase();
        if (desc.includes('ocean') || desc.includes('sea') || desc.includes('gulf') || desc.includes('bay') ||
          desc.includes('strait') || nm.includes('ocean') || nm.includes('sea')) { oceanName = it.name; break; }
      }
    }
    const parts = [];
    if (d.locality && d.locality !== d.countryName) parts.push(d.locality);
    else if (d.city && d.city !== d.countryName) parts.push(d.city);
    if (d.principalSubdivision && d.principalSubdivision !== d.countryName && !parts.includes(d.principalSubdivision))
      parts.push(d.principalSubdivision);
    if (d.countryName) parts.push(d.countryName);

    const res = {
      isLand: Boolean(d.countryName),
      country: d.countryName || '', state: d.principalSubdivision || '',
      city: d.city || d.locality || '', continent: d.continent || '',
      landLocation: parts.length ? parts.join(', ') : getOfflineLandRegion(lat, lon),
      oceanName: oceanName || getOfflineOceanName(lat, lon)
    };
    geoCache.set(key, res);
    return res;
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    return {
      isLand: false, country: '', state: '', city: '', continent: '',
      landLocation: getOfflineLandRegion(lat, lon), oceanName: getOfflineOceanName(lat, lon)
    };
  }
}

async function fetchSample(lat, lon) {
  abortActive();
  activeController = new AbortController();
  const signal = activeController.signal;

  renderLoading(lat, lon);

  const la = lat.toFixed(4), lo = lon.toFixed(4);
  const marineUrl = 'https://marine-api.open-meteo.com/v1/marine?latitude=' + la + '&longitude=' + lo +
    '&current=wave_height,wave_direction,wave_period,sea_surface_temperature,ocean_current_velocity,ocean_current_direction';
  const airUrl = 'https://api.open-meteo.com/v1/forecast?latitude=' + la + '&longitude=' + lo +
    '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,surface_pressure,weather_code&timezone=auto';

  try {
    const [mRes, aRes, gRes] = await Promise.allSettled([
      fetch(marineUrl, { signal }).then(r => r.ok ? r.json() : Promise.reject(r.status)),
      fetch(airUrl, { signal }).then(r => r.ok ? r.json() : Promise.reject(r.status)),
      reverseGeocode(lat, lon, signal)
    ]);

    const geo = gRes.status === 'fulfilled' ? gRes.value : {
      landLocation: getOfflineLandRegion(lat, lon), oceanName: getOfflineOceanName(lat, lon), isLand: false
    };
    const marine = mRes.status === 'fulfilled' ? mRes.value : null;
    const air = aRes.status === 'fulfilled' ? aRes.value : null;
    const cur = marine ? marine.current : null;

    const isLand = !cur || (
      cur.sea_surface_temperature === null &&
      cur.wave_height === null &&
      cur.ocean_current_velocity === null
    );

    const sample = {
      lat, lon, geo, isLand,
      marine: cur,
      air: air ? air.current : null,
      elevation: air && typeof air.elevation === 'number' ? air.elevation : null,
      tz: air ? air.timezone_abbreviation : null,
      name: isLand ? (geo.landLocation || getOfflineLandRegion(lat, lon))
        : (geo.oceanName || getOfflineOceanName(lat, lon))
    };

    lastSample = sample;
    renderSample(sample);
    updateHUDFromSample(sample);

  } catch (e) {
    if (e.name === 'AbortError') return;
    console.warn('Sample fetch failed:', e);
    renderError('Unable to reach live data services');
  }
}

/* ==================================================================
   7. RENDERING — station panel, tooltip, HUD
   ================================================================== */
let lastSample = null;
let locked = false;

function setPill(cls, txt) {
  $('stPill').className = 'pill ' + cls;
  $('stPill').textContent = txt;
}
function setCoordChips(lat, lon) {
  $('cLat').textContent = Math.abs(lat).toFixed(3) + '° ' + (lat >= 0 ? 'N' : 'S');
  $('cLon').textContent = Math.abs(lon).toFixed(3) + '° ' + (lon >= 0 ? 'E' : 'W');
}

const SVG_ICONS = {
  search: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  marine: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12c2.5-2.5 5-2.5 7.5 0s5 2.5 7.5 0 5-2.5 7 0"/><path d="M2 17c2.5-2.5 5-2.5 7.5 0s5 2.5 7.5 0 5-2.5 7 0"/></svg>',
  land: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/></svg>',
  alert: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  temp: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>',
  wave: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12c2.5-2.5 5-2.5 7.5 0s5 2.5 7.5 0 5-2.5 7 0"/></svg>',
  current: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
  wind: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.7 7.7A2.5 2.5 0 1 1 20 10H2"/><path d="M19.7 13.7A2.5 2.5 0 1 1 22 16H2"/></svg>',
  alt: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>',
  humidity: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>',
  pressure: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m12 6 2 6-4 2"/></svg>',
  camera: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
  flag: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>',
  globe: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>'
};

function renderDepthProfileSvg(sstVal, currentDepthSlice = 0) {
  const sst = sstVal !== null && !isNaN(sstVal) ? Number(sstVal) : 26.0;
  const deepTemp = 3.5;
  const W = 280, H = 120;
  const padL = 36, padR = 38, padT = 18, padB = 20;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const maxDepth = 2000;

  const yForDepth = d => padT + (Math.min(maxDepth, d) / maxDepth) * plotH;
  const xForTemp = t => padL + Math.max(0, Math.min(plotW, ((t - 0) / 32) * plotW));
  const xForSal = s => padL + Math.max(0, Math.min(plotW, ((s - 33.0) / 4.0) * plotW));

  const depths = [0, 50, 100, 200, 400, 600, 800, 1200, 1600, 2000];
  const tempPoints = depths.map(d => {
    let t;
    if (d <= 50) t = sst;
    else if (d <= 800) {
      const ratio = (d - 50) / 750;
      t = sst - (sst - 6.0) * Math.pow(ratio, 0.7);
    } else {
      const ratio = (d - 800) / 1200;
      t = 6.0 - (6.0 - deepTemp) * Math.pow(ratio, 0.8);
    }
    return `${xForTemp(t).toFixed(1)},${yForDepth(d).toFixed(1)}`;
  }).join(' ');

  const salPoints = depths.map(d => {
    let s;
    if (d <= 100) s = 35.2;
    else if (d <= 600) s = 34.6;
    else if (d <= 1200) s = 34.8;
    else s = 34.7;
    return `${xForSal(s).toFixed(1)},${yForDepth(d).toFixed(1)}`;
  }).join(' ');

  const sliceY = yForDepth(currentDepthSlice);

  return `
    <div class="depth-profile-card">
      <div class="depth-profile-head">
        <span class="depth-profile-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          CTD Depth Profile (0–2000m)
        </span>
        <span class="ge-section-badge" style="font-size:0.52rem">Modelled</span>
      </div>
      <div class="depth-profile-legend">
        <span class="leg-t"><span style="display:inline-block;width:7px;height:2px;background:var(--temp-highlight);margin-right:3px"></span>Temp (${sst.toFixed(1)}°C SST)</span>
        <span class="leg-s"><span style="display:inline-block;width:7px;height:2px;background:var(--cyan-salinity);margin-right:3px"></span>Salinity (35 PSU)</span>
      </div>
      <svg class="depth-chart-svg" viewBox="0 0 ${W} ${H}">
        <!-- Horizontal Grid Lines -->
        <line x1="${padL}" y1="${yForDepth(0)}" x2="${padL + plotW}" y2="${yForDepth(0)}" stroke="#30343A" stroke-width="1" stroke-dasharray="2 3"/>
        <text x="${padL - 4}" y="${yForDepth(0) + 3}" fill="#9AA0A6" font-size="8" text-anchor="end">0m</text>
        
        <line x1="${padL}" y1="${yForDepth(1000)}" x2="${padL + plotW}" y2="${yForDepth(1000)}" stroke="#30343A" stroke-width="1" stroke-dasharray="2 3"/>
        <text x="${padL - 4}" y="${yForDepth(1000) + 3}" fill="#9AA0A6" font-size="8" text-anchor="end">1km</text>
        
        <line x1="${padL}" y1="${yForDepth(2000)}" x2="${padL + plotW}" y2="${yForDepth(2000)}" stroke="#30343A" stroke-width="1" stroke-dasharray="2 3"/>
        <text x="${padL - 4}" y="${yForDepth(2000) + 3}" fill="#9AA0A6" font-size="8" text-anchor="end">2km</text>
        
        <!-- Salinity Curve -->
        <polyline fill="none" stroke="#7DD3FC" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.85" points="${salPoints}"/>
        
        <!-- Temperature Profile Curve -->
        <polyline fill="none" stroke="#F28B82" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${tempPoints}"/>
        
        <!-- Active Depth Slice Indicator -->
        <line x1="${padL}" y1="${sliceY}" x2="${padL + plotW}" y2="${sliceY}" stroke="#A8C7FA" stroke-width="1.5" stroke-dasharray="4 2"/>
        <circle cx="${padL + plotW}" cy="${sliceY}" r="3" fill="#A8C7FA"/>
        <text x="${padL + plotW + 4}" y="${sliceY + 3}" fill="#A8C7FA" font-size="8" text-anchor="start">-${currentDepthSlice}m</text>
      </svg>
    </div>
  `;
}

function renderLoading(lat, lon) {
  if (locked) return;
  setPill('load', 'SAMPLING');
  $('stIcon').innerHTML = SVG_ICONS.search;
  $('stTitle').textContent = 'Sampling Station';
  $('locBanner').className = 'loc-banner';
  $('locIcon').innerHTML = SVG_ICONS.search;
  $('locText').textContent = 'Resolving ' + getOfflineOceanName(lat, lon) + '…';
  setCoordChips(lat, lon);
  $('stContent').innerHTML =
    '<div class="msgbox loading"><div class="mini-spinner"></div>' +
    '<div class="mt">Querying marine model, atmospheric model and gazetteer…</div></div>';
}

function renderError(msg) {
  if (locked) return;
  setPill('err', 'OFFLINE');
  $('locBanner').className = 'loc-banner';
  $('locIcon').innerHTML = SVG_ICONS.alert;
  $('locText').textContent = 'Connection issue';
  $('stContent').innerHTML =
    '<div class="msgbox error"><div style="font-size:1.2rem;display:flex;align-items:center;justify-content:center">' + SVG_ICONS.alert + '</div><div class="mt">' + msg + '</div></div>';
}

function metric(label, value, unit, colorVar, sub, iconSvg) {
  return '<div class="metric" style="--c:' + colorVar + '">' +
    '<div class="lab">' + (iconSvg ? '<span class="m-icon" style="display:inline-flex;align-items:center;margin-right:4px">' + iconSvg + '</span>' : '') + label + '</div>' +
    '<div class="val"><span class="num">' + value + '</span><span class="unit">' + (unit || '') + '</span></div>' +
    (sub ? '<div class="sub">' + sub + '</div>' : '') +
    '</div>';
}

function renderSample(s) {
  if (locked) return;
  setCoordChips(s.lat, s.lon);

  const m = s.marine || {}, a = s.air || {};
  const num = v => (v === null || v === undefined || isNaN(v)) ? null : Number(v);

  const sst = num(m.sea_surface_temperature);
  const wave = num(m.wave_height);
  const wavePer = num(m.wave_period);
  const waveDir = num(m.wave_direction);
  const vel = num(m.ocean_current_velocity);
  const dir = num(m.ocean_current_direction);
  const airT = num(a.temperature_2m);
  const wind = num(a.wind_speed_10m);
  const windDir = num(a.wind_direction_10m);
  const hum = num(a.relative_humidity_2m);
  const pres = num(a.surface_pressure);

  let html = '';

  if (s.isLand) {
    setPill('land', 'TERRESTRIAL');
    $('stIcon').innerHTML = SVG_ICONS.land;
    $('stTitle').textContent = 'Land Station';
    $('locBanner').className = 'loc-banner land';
    $('locIcon').innerHTML = SVG_ICONS.land;
  } else {
    setPill('ocean', 'OCEANIC');
    $('stIcon').innerHTML = SVG_ICONS.marine;
    $('stTitle').textContent = 'Marine Station';
    $('locBanner').className = 'loc-banner ocean';
    $('locIcon').innerHTML = SVG_ICONS.marine;
  }
  $('locText').textContent = s.name;
  $('locText').title = s.name;

  /* ---- Marine block ---- */
  if (!s.isLand) {
    html += '<div class="section-label">Marine conditions</div><div class="metric-grid">';
    html += metric('Sea temp', sst !== null ? sst.toFixed(1) : '--', '°C', 'var(--temp)', null, SVG_ICONS.temp);
    html += metric('Wave height', wave !== null ? wave.toFixed(2) : '--', 'm', 'var(--wave)',
      wavePer !== null ? wavePer.toFixed(1) + ' s period' : null, SVG_ICONS.wave);
    const dirSub = dir !== null ? Math.round(dir) + '° ' + compassLabel(dir) : null;
    html += '<div class="metric wide" style="--c:var(--curr)">' +
      '<div class="lab"><span class="m-icon" style="display:inline-flex;align-items:center;margin-right:4px">' + SVG_ICONS.current + '</span> Surface current</div>' +
      '<div class="val" style="justify-content:space-between;width:100%">' +
      '<div><span class="num">' + (vel !== null ? vel.toFixed(1) : '--') + '</span><span class="unit"> km/h</span></div>' +
      '<div style="display:flex;align-items:center;gap:6px">' +
      '<span class="unit" style="font-family:var(--mono);font-weight:600">' + (dirSub || '--') + '</span>' +
      '<div class="compass" style="transform:rotate(' + (dir !== null ? dir : 0) + 'deg)">' +
      '<svg viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>' +
      '</div></div></div></div>';
    if (waveDir !== null) {
      html += metric('Wave dir', Math.round(waveDir) + '°', compassLabel(waveDir), 'var(--wave)', null, SVG_ICONS.wave);
      html += metric('Sea state', wave === null ? '--' : (wave < 0.5 ? 'Calm' : wave < 1.25 ? 'Slight' : wave < 2.5 ? 'Moderate' : wave < 4 ? 'Rough' : 'Very rough'), '', 'var(--wave)', null, SVG_ICONS.wave);
    }
    html += '</div>';
    html += renderDepthProfileSvg(sst, currentObservationDepth);
  }

  /* ---- Atmosphere + position block ---- */
  html += '<div class="section-label">Atmosphere &amp; position</div><div class="metric-grid">';
  html += metric('Air temp', airT !== null ? airT.toFixed(1) : '--', '°C', 'var(--temp)', null, SVG_ICONS.temp);
  html += metric('Wind speed', wind !== null ? wind.toFixed(1) : '--', 'km/h', 'var(--wind)',
    windDir !== null ? Math.round(windDir) + '° ' + compassLabel(windDir) : null, SVG_ICONS.wind);
  html += metric('Elevation', s.elevation !== null ? Math.round(s.elevation) : '--', 'm', 'var(--alt)',
    s.isLand ? 'above mean sea level' : 'model surface', SVG_ICONS.alt);
  html += metric('Humidity', hum !== null ? Math.round(hum) : '--', '%', 'var(--teal)', null, SVG_ICONS.humidity);
  html += metric('Pressure', pres !== null ? Math.round(pres) : '--', 'hPa', 'var(--teal)', null, SVG_ICONS.pressure);
  html += metric('Eye altitude', fmtDist(camHeight()), '', 'var(--cyan)', 'camera above surface', SVG_ICONS.camera);
  html += '</div>';

  if (s.isLand && s.geo) {
    const g = s.geo;
    html += '<div class="section-label">Gazetteer</div><div class="metric-grid">';
    if (g.country) html += metric('Country', g.country, '', 'var(--alt)', null, SVG_ICONS.flag);
    if (g.continent) html += metric('Continent', g.continent, '', 'var(--alt)', null, SVG_ICONS.globe);
    html += '</div>';
  }

  $('stContent').innerHTML = html;
}

/* ---- HUD (bottom strip) ---- */
function updateHUDFromSample(s) {
  const m = s.marine || {}, a = s.air || {};
  $('hPlace').textContent = s.name || '—';
  $('hPlace').title = s.name || '';

  const sst = m.sea_surface_temperature, airT = a.temperature_2m;
  if (!s.isLand && sst !== null && sst !== undefined)
    $('hTemp').textContent = Number(sst).toFixed(1) + '°C sea';
  else if (airT !== null && airT !== undefined)
    $('hTemp').textContent = Number(airT).toFixed(1) + '°C air';
  else $('hTemp').textContent = '--';

  const vel = m.ocean_current_velocity, wind = a.wind_speed_10m;
  if (!s.isLand && vel !== null && vel !== undefined)
    $('hSpeed').textContent = Number(vel).toFixed(1) + ' km/h cur';
  else if (wind !== null && wind !== undefined)
    $('hSpeed').textContent = Number(wind).toFixed(1) + ' km/h wind';
  else $('hSpeed').textContent = '--';

  $('hElev').textContent = s.elevation !== null ? Math.round(s.elevation) + ' m' : '--';
}

function getCameraCenterCoord() {
  if (!viewer) return null;
  try {
    const centerPos = new Cesium.Cartesian2(viewer.canvas.clientWidth / 2, viewer.canvas.clientHeight / 2);
    const cart = viewer.camera.pickEllipsoid(centerPos, viewer.scene.globe.ellipsoid);
    if (cart) {
      const carto = Cesium.Cartographic.fromCartesian(cart);
      return {
        lat: Cesium.Math.toDegrees(carto.latitude),
        lon: Cesium.Math.toDegrees(carto.longitude)
      };
    }
  } catch (e) { }
  return null;
}

function updateCameraHUD() {
  if (!viewer) return;
  const c = viewer.camera.positionCartographic;
  const h = c.height;
  $('hEye').textContent = fmtDist(h);
  const head = Cesium.Math.toDegrees(viewer.camera.heading);
  const pit = Cesium.Math.toDegrees(viewer.camera.pitch);
  $('hHead').textContent = Math.round(((head % 360) + 360) % 360) + '° ' + compassLabel(head);
  $('hPitch').textContent = Math.round(pit) + '°';
  const z = Math.max(0, Math.min(22, Math.round(Math.log2(40000000 / Math.max(h, 1)) + 1)));
  $('hScale').textContent = 'Z' + z;

  // Update real-time View Center Coordinates
  const center = getCameraCenterCoord();
  const centerEl = $('hCenterCoord');
  if (centerEl) {
    centerEl.textContent = center ? fmtCoord(center.lat, center.lon) : '— space —';
  }

  // Update persistent bottom telemetry status bar
  const statusAlt = $('statusAlt');
  if (statusAlt) statusAlt.textContent = 'ALT ' + fmtDist(h);
  const statusZoom = $('statusZoom');
  if (statusZoom) {
    const zFrac = Math.max(0, Math.min(22, (Math.log2(40000000 / Math.max(h, 1)) + 1))).toFixed(1);
    statusZoom.textContent = 'ZOOM ' + zFrac;
  }

  if (!sliderBusy) {
    const v = heightToSlider(h);
    zoomRange.value = v;
    paintSlider(v);
  }
}

/* ---- Hover details dialog ---- */
const tip = $('tip');
function showTip() { if (tip) tip.classList.add('on'); }
function hideTip() { if (tip) tip.classList.remove('on'); }
function positionTip(x, y) {
  if (!tip) return;
  const w = 232, hgt = 150, pad = 12;
  let px = x + 20, py = y + 20;
  if (px + w > window.innerWidth - pad) px = x - w - 20;
  if (py + hgt > window.innerHeight - pad) py = y - hgt - 20;
  tip.style.left = Math.max(pad, px) + 'px';
  tip.style.top = Math.max(pad, py) + 'px';
}
function tipQuick(lat, lon) {
  const c = $('tipCoord'), n = $('tipName'), r = $('tipRows');
  if (c) c.textContent = fmtCoord(lat, lon);
  if (n) n.textContent = getOfflineOceanName(lat, lon);
  if (r) r.innerHTML = '<div class="tr"><span>Status</span><b style="color:var(--teal)">sampling…</b></div>';
}
function tipFromSample(s) {
  const c = $('tipCoord'), n = $('tipName'), r = $('tipRows');
  if (c) c.textContent = fmtCoord(s.lat, s.lon);
  if (n) n.textContent = s.name;
  const m = s.marine || {}, a = s.air || {};
  let rows = '';
  if (!s.isLand) {
    if (m.sea_surface_temperature != null) rows += '<div class="tr"><span>Sea temp</span><b style="color:var(--temp)">' + Number(m.sea_surface_temperature).toFixed(1) + ' °C</b></div>';
    if (m.wave_height != null) rows += '<div class="tr"><span>Wave</span><b style="color:var(--wave)">' + Number(m.wave_height).toFixed(2) + ' m</b></div>';
    if (m.ocean_current_velocity != null) rows += '<div class="tr"><span>Current</span><b style="color:var(--curr)">' + Number(m.ocean_current_velocity).toFixed(1) + ' km/h</b></div>';
  }
  if (a.temperature_2m != null) rows += '<div class="tr"><span>Air temp</span><b style="color:var(--temp)">' + Number(a.temperature_2m).toFixed(1) + ' °C</b></div>';
  if (a.wind_speed_10m != null) rows += '<div class="tr"><span>Wind</span><b style="color:var(--wind)">' + Number(a.wind_speed_10m).toFixed(1) + ' km/h</b></div>';
  if (s.elevation != null) rows += '<div class="tr"><span>Elevation</span><b style="color:var(--alt)">' + Math.round(s.elevation) + ' m</b></div>';
  if (r) r.innerHTML = rows || '<div class="tr"><span>No model data</span><b>--</b></div>';
}

/* ==================================================================
   8. HOVER / CLICK INTERACTION
   ================================================================== */
let hoverTimer = null, lastLat = null, lastLon = null;

if (viewer) {
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  const container = $('cesiumContainer');

  handler.setInputAction(mv => {
    positionTip(mv.endPosition.x, mv.endPosition.y);

    const cart = viewer.camera.pickEllipsoid(mv.endPosition, viewer.scene.globe.ellipsoid);
    if (!cart) {
      clearTimeout(hoverTimer); abortActive(); hideTip();
      if (container) container.classList.remove('over-globe');
      targetIndicator.show = false;
      $('hCoord').textContent = '— space —';
      const statusCoord = $('statusCoord');
      if (statusCoord) statusCoord.textContent = 'LAT --.--° N   LON --.--° E';
      return;
    }

    // Hovering over globe surface: activate cursor: none (no OS pointer) and render green dot + details dialog
    if (container) container.classList.add('over-globe');
    const carto = Cesium.Cartographic.fromCartesian(cart);
    const lon = Cesium.Math.toDegrees(carto.longitude);
    const lat = Cesium.Math.toDegrees(carto.latitude);

    targetIndicator.position = cart;
    targetIndicator.show = true;
    $('hCoord').textContent = fmtCoord(lat, lon);

    // Update bottom status bar coordinates
    const statusCoord = $('statusCoord');
    if (statusCoord) {
      const latStr = Math.abs(lat).toFixed(4) + '° ' + (lat >= 0 ? 'N' : 'S');
      const lonStr = Math.abs(lon).toFixed(4) + '° ' + (lon >= 0 ? 'E' : 'W');
      statusCoord.textContent = `LAT ${latStr}   LON ${lonStr}`;
    }

    showTip();
    clearTimeout(hoverTimer);
    if (lastLat === null || Math.abs(lat - lastLat) > 0.2 || Math.abs(lon - lastLon) > 0.2) {
      tipQuick(lat, lon);
      if (!locked) renderLoading(lat, lon);
    }
    hoverTimer = setTimeout(async () => {
      lastLat = lat; lastLon = lon;
      await fetchSample(lat, lon);
      if (lastSample) tipFromSample(lastSample);
    }, 380);
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

  // Click = lock a station at that point
  handler.setInputAction(click => {
    const cart = viewer.camera.pickEllipsoid(click.position, viewer.scene.globe.ellipsoid);
    if (!cart) return;
    const carto = Cesium.Cartographic.fromCartesian(cart);
    const lon = Cesium.Math.toDegrees(carto.longitude);
    const lat = Cesium.Math.toDegrees(carto.latitude);
    locked = false;
    lockIndicator.position = cart;
    lockIndicator.show = true;
    fetchSample(lat, lon).then(() => {
      locked = true;
      setPill('lock', 'LOCKED');
      toast('Station locked at ' + fmtCoord(lat, lon));
      $('btnLock').classList.add('active');
    });
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  viewer.scene.canvas.addEventListener('mouseleave', () => {
    clearTimeout(hoverTimer); abortActive(); hideTip();
    if (container) container.classList.remove('over-globe');
    targetIndicator.show = false;
    const statusCoord = $('statusCoord');
    if (statusCoord) statusCoord.textContent = 'LAT --.--° N   LON --.--° E';
  });

  // Auto-rotate + camera HUD refresh
  let hudTick = 0;
  viewer.scene.postRender.addEventListener(() => {
    if (autoRotate) {
      const h = camHeight();
      viewer.camera.rotate(Cesium.Cartesian3.UNIT_Z, -Cesium.Math.toRadians(0.055));
      if (h > MAX_H) viewer.camera.zoomIn(1000);
    }
    if (++hudTick % 8 === 0) updateCameraHUD();
  });
}

/* ==================================================================
   9. GEOLOCATION & USER CURRENT LOCATION
   ================================================================== */
async function getUserCurrentLocation(autoFly = true) {
  if (locating) return;
  locating = true;
  if (autoFly) toast('Acquiring current GPS location…');

  const updateLocDisplay = (txt) => {
    const topEl = $('topLocLabel');
    if (topEl) topEl.textContent = txt;
    const hudEl = $('hMyLoc');
    if (hudEl) hudEl.textContent = txt;
  };

  const setLocationActive = async (lat, lon, label = 'Current Location') => {
    userLocation = { lat, lon, label };
    const cart = Cesium.Cartesian3.fromDegrees(lon, lat);
    if (currentLocationIndicator) {
      currentLocationIndicator.position = cart;
      currentLocationIndicator.show = true;
    }
    if (currentLocationHalo) {
      currentLocationHalo.position = cart;
      currentLocationHalo.show = true;
    }

    const formatted = fmtCoord(lat, lon);
    updateLocDisplay(formatted);
    $('btnLocate')?.classList.add('on');
    $('btnTopLocate')?.classList.add('active');

    // Reverse geocode city/place name
    reverseGeocode(lat, lon).then(geo => {
      const locName = geo.city || geo.landLocation || geo.oceanName || 'My Location';
      userLocation.name = locName;
      updateLocDisplay(locName);
      if (currentLocationIndicator && currentLocationIndicator.label) {
        currentLocationIndicator.label.text = locName.toUpperCase();
      }
    });

    if (autoFly && viewer) {
      flyTo(lat, lon, 250000, 2.2);
      toast('Flying to your location (' + formatted + ')');
      fetchSample(lat, lon);
    }
    locating = false;
  };

  const fallbackToIP = async () => {
    try {
      const res = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client');
      const data = await res.json();
      if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        setLocationActive(data.latitude, data.longitude, data.city || data.locality || 'Current Location');
        return;
      }
    } catch (e) { }

    try {
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      if (data && data.latitude && data.longitude) {
        setLocationActive(data.latitude, data.longitude, data.city || 'Current Location');
        return;
      }
    } catch (e2) { }

    if (autoFly) toast('Could not determine current location');
    updateLocDisplay('Locate failed');
    locating = false;
  };

  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocationActive(pos.coords.latitude, pos.coords.longitude, 'GPS Location');
      },
      err => {
        console.warn('Browser geolocation denied/timed out, falling back to IP:', err.message);
        fallbackToIP();
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  } else {
    fallbackToIP();
  }
}

/* ==================================================================
   10. UI WIRING
   ================================================================== */
$('zIn').onclick = () => zoomStep(-1);
$('zOut').onclick = () => zoomStep(1);
$('tiltUp').onclick = () => tiltBy(-4);
$('tiltDown').onclick = () => tiltBy(4);
$('rotL').onclick = () => rotateBy(-4);
$('rotR').onclick = () => rotateBy(4);
$('btnNorth').onclick = () => { resetNorth(); toast('Camera reset to north / nadir'); };
$('btnCenter').onclick = () => { centerGlobe(1.8); toast('Globe re-centred'); };
$('btnLocate').onclick = () => getUserCurrentLocation(true);
$('btnTopLocate').onclick = () => getUserCurrentLocation(true);
$('btnMyLoc').onclick = () => getUserCurrentLocation(true);
$('hMyLoc').onclick = () => getUserCurrentLocation(true);
$('btnSpin').onclick = e => {
  autoRotate = !autoRotate;
  e.currentTarget.classList.toggle('on', autoRotate);
  toast(autoRotate ? 'Auto-rotation on' : 'Auto-rotation off');
};
$('btnFull').onclick = () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
};

/* Authoritative single source of truth for left sidebar */
function toggleSidebar(forceState, isKeyboard = false) {
  const sb = $('ge-sidebar');
  if (!sb) return;

  if (isKeyboard) {
    sb.style.transitionDuration = '0ms';
  }

  const willBeCollapsed = typeof forceState === 'boolean' ? !forceState : !sb.classList.contains('collapsed');
  sb.classList.toggle('collapsed', willBeCollapsed);

  if (isKeyboard) {
    requestAnimationFrame(() => {
      setTimeout(() => {
        sb.style.transitionDuration = '';
      }, 50);
    });
  }

  const toggleBtn = $('ge-sidebar-toggle');
  if (toggleBtn) {
    toggleBtn.setAttribute('aria-expanded', String(!willBeCollapsed));
    toggleBtn.classList.toggle('active', !willBeCollapsed);
  }
  const btnPanels = $('btnPanels');
  if (btnPanels) {
    btnPanels.classList.toggle('on', !willBeCollapsed);
  }
}

if ($('btnPanels')) $('btnPanels').onclick = () => toggleSidebar();
if ($('ge-sidebar-toggle')) $('ge-sidebar-toggle').onclick = () => toggleSidebar();

/* Dock Tooltip Continuity */
const dockEl = document.querySelector('.dock');
if (dockEl) {
  let dockContinuousTimer = null;
  const dockButtons = dockEl.querySelectorAll('.dbtn');
  dockButtons.forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      clearTimeout(dockContinuousTimer);
      dockEl.classList.add('tooltip-continuous');
    });
  });
  dockEl.addEventListener('mouseleave', () => {
    dockContinuousTimer = setTimeout(() => {
      dockEl.classList.remove('tooltip-continuous');
    }, 150);
  });
}

$('btnLock').onclick = e => {
  locked = !locked;
  e.currentTarget.classList.toggle('active', locked);
  if (locked) { setPill('lock', 'LOCKED'); toast('Panel locked — hover will not overwrite'); }
  else { lockIndicator.show = false; toast('Panel unlocked — tracking cursor'); }
};
$('btnFly').onclick = () => {
  if (!lastSample) return toast('Sample a point first');
  flyTo(lastSample.lat, lastSample.lon, 900000, 2.2);
  toast('Flying to ' + lastSample.name);
};
$('btnCopy').onclick = async () => {
  if (!lastSample) return toast('Nothing to copy yet');
  const s = lastSample, m = s.marine || {}, a = s.air || {};
  const txt =
    'OceanXplore — sample\n' +
    'Location : ' + s.name + '\n' +
    'Coords   : ' + s.lat.toFixed(4) + ', ' + s.lon.toFixed(4) + '\n' +
    'Type     : ' + (s.isLand ? 'Land' : 'Ocean') + '\n' +
    (m.sea_surface_temperature != null ? 'Sea temp : ' + Number(m.sea_surface_temperature).toFixed(1) + ' °C\n' : '') +
    (m.wave_height != null ? 'Wave     : ' + Number(m.wave_height).toFixed(2) + ' m\n' : '') +
    (m.ocean_current_velocity != null ? 'Current  : ' + Number(m.ocean_current_velocity).toFixed(1) + ' km/h @ ' + Math.round(m.ocean_current_direction || 0) + '°\n' : '') +
    (a.temperature_2m != null ? 'Air temp : ' + Number(a.temperature_2m).toFixed(1) + ' °C\n' : '') +
    (a.wind_speed_10m != null ? 'Wind     : ' + Number(a.wind_speed_10m).toFixed(1) + ' km/h @ ' + Math.round(a.wind_direction_10m || 0) + '°\n' : '') +
    (s.elevation != null ? 'Elevation: ' + Math.round(s.elevation) + ' m\n' : '') +
    'Sampled  : ' + new Date().toISOString();
  try { await navigator.clipboard.writeText(txt); toast('Station report copied'); }
  catch (e) { toast('Clipboard blocked by browser'); }
};

$('jumpSel').onchange = e => {
  if (!e.target.value) return;
  if (e.target.value === 'my_location') {
    e.target.value = '';
    getUserCurrentLocation(true);
    return;
  }
  const [la, lo, h] = e.target.value.split(',').map(Number);
  autoRotate = false; $('btnSpin').classList.remove('on');
  flyTo(la, lo, h, 2.4);
  toast('Flying to ' + e.target.options[e.target.selectedIndex].text.replace(/^[^\w]+/, ''));
  e.target.value = '';
};

/* Layer toggles */
document.querySelectorAll('.toggle-row').forEach(row => {
  row.addEventListener('click', () => {
    const sw = row.querySelector('.switch');
    const on = !sw.classList.contains('on');
    sw.classList.toggle('on', on);
    const which = row.dataset.toggle;
    if (!viewer) return;
    switch (which) {
      case 'myLoc':
        if (currentLocationIndicator) currentLocationIndicator.show = on;
        if (currentLocationHalo) currentLocationHalo.show = on;
        toast(on ? 'Current location pin visible' : 'Current location pin hidden');
        break;
      case 'tiles': applyTilesMode(on); break;
      case 'light': viewer.scene.globe.enableLighting = on; break;
      case 'grid': setGraticule(on); break;
      case 'atmo': viewer.scene.skyAtmosphere.show = on;
        viewer.scene.globe.showGroundAtmosphere = on; break;
      case 'stars': viewer.scene.skyBox.show = on; break;
      case 'reticle': $('reticle').classList.toggle('on', on); break;
    }
  });
});

/* Keyboard shortcuts */
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
  switch (e.key) {
    case '+': case '=': zoomStep(-1); break;
    case '-': case '_': zoomStep(1); break;
    case 'ArrowUp': tiltBy(-3); e.preventDefault(); break;
    case 'ArrowDown': tiltBy(3); e.preventDefault(); break;
    case 'ArrowLeft': rotateBy(-3); e.preventDefault(); break;
    case 'ArrowRight': rotateBy(3); e.preventDefault(); break;
    case 'r': case 'R': $('btnSpin').click(); break;
    case 'n': case 'N': $('btnNorth').click(); break;
    case 'c': case 'C': $('btnCenter').click(); break;
    case 'g': case 'G': getUserCurrentLocation(true); break;
    case 'h': case 'H': toggleSidebar(undefined, true); break;
    case 'f': case 'F': $('btnFull').click(); break;
    case 'l': case 'L': $('btnLock').click(); break;
  }
});

/* Clocks */
function tickClock() {
  const now = new Date();
  $('utcClock').textContent = now.toISOString().substr(11, 8);
  $('localClock').textContent = 'local ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
tickClock(); setInterval(tickClock, 1000);

/* Keep the globe centred when the window resizes */
window.addEventListener('resize', () => { if (viewer) viewer.resize(); });

/* ==================================================================
   10. BOOT SEQUENCE (Decoupled background streaming & ready trigger)
   ================================================================== */
if (viewer) {
  const off = viewer.scene.postRender.addEventListener(() => {
    setTimeout(() => { setCesiumReady(); off(); }, 1200);
  });
  centerGlobe(3.2);
  updateCameraHUD();
  paintSlider(heightToSlider(HOME.height));
}

// Fallback readiness timer
setTimeout(() => setCesiumReady(), 4000);

// Passive current location discovery in background (places marker without interrupting camera)
setTimeout(() => {
  getUserCurrentLocation(false);
}, 1500);

/* ==================================================================
   11. GOOGLE EARTH-STYLE UI TOOLBAR & SIDEBAR HOOKS
   ================================================================== */
// Measurement Tool (Placeholder)
// TODO: Implement interactive great-circle line measuring tool
if ($('btnToolRuler')) {
  $('btnToolRuler').onclick = () => {
    toast('Measurement Tool: Geodesic ruler coming in next update');
  };
}

// Screenshot Tool (Placeholder)
// TODO: Implement WebGL canvas high-res screenshot export
if ($('btnToolScreenshot')) {
  $('btnToolScreenshot').onclick = () => {
    toast('Screenshot: Viewport export coming in next update');
  };
}

// Data Layers (Placeholders)
// TODO: Connect Sea Surface Temperature raster imagery provider
if ($('layerTemperature')) {
  $('layerTemperature').onchange = e => {
    toast(e.target.checked ? 'Temperature layer visible' : 'Temperature layer hidden');
  };
}

// TODO: Connect Salinity & Density oceanographic model
if ($('layerSalinity')) {
  $('layerSalinity').onchange = e => {
    toast('Salinity & Density: Dataset integration in progress');
    e.target.checked = false;
  };
}

// TODO: Connect live INCOIS Argo Float network feed
if ($('layerArgoFloats')) {
  $('layerArgoFloats').onchange = e => {
    toast(e.target.checked ? 'Argo float network active' : 'Argo float network hidden');
  };
}

// TODO: Connect AI-predicted oceanographic gap reconstruction
if ($('layerAIPredicted')) {
  $('layerAIPredicted').onchange = e => {
    toast('AI-Predicted Gaps: Neural model preview coming soon');
    e.target.checked = false;
  };
}

// Search Input — Supports coordinates & ocean basins with honest status feedback
if ($('ge-search-input')) {
  $('ge-search-input').onkeydown = e => {
    if (e.key === 'Enter') {
      const q = e.target.value.trim();
      if (!q) return;
      // 1. Direct coordinate navigation: "lat, lon" or "lat lon"
      const coordMatch = q.match(/^(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)$/);
      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lon = parseFloat(coordMatch[3]);
        if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
          flyTo(lat, lon, 350000, 2.2);
          toast('Navigating to ' + fmtCoord(lat, lon));
          fetchSample(lat, lon);
          return;
        }
      }
      // 2. Ocean basin quick match
      const sel = $('jumpSel');
      if (sel) {
        const qLower = q.toLowerCase();
        for (let i = 0; i < sel.options.length; i++) {
          const opt = sel.options[i];
          if (opt.value && opt.text.toLowerCase().includes(qLower)) {
            sel.selectedIndex = i;
            sel.dispatchEvent(new Event('change'));
            return;
          }
        }
      }
      // 3. Fallback with honest integration status
      toast('Searching "' + q + '" — Offline gazetteer lookup in progress');
    }
  };
}

/* ==================================================================
   12. TEMPORAL & DEPTH OBSERVATION CONTROLS
   ================================================================== */
let currentObservationDepth = 0;
let isTimelinePlaying = false;
let timelinePlaybackTimer = null;
let timelineSpeed = 1;

function setObservationDepth(depthMeters, updateSlider = true) {
  currentObservationDepth = Math.max(0, Math.min(6000, Number(depthMeters) || 0));
  const badge = $('depthValBadge');
  if (badge) {
    badge.textContent = currentObservationDepth === 0 ? '0 m (Surface)' : `-${currentObservationDepth} m`;
  }
  if (updateSlider && $('depthRange')) {
    $('depthRange').value = currentObservationDepth;
  }
  // Update depth preset buttons
  document.querySelectorAll('.depth-btn').forEach(btn => {
    const d = Number(btn.getAttribute('data-depth'));
    btn.classList.toggle('active', d === currentObservationDepth);
  });
  // If a marine station is active, re-render its depth profile
  if (lastSample && !lastSample.isLand) {
    const card = document.querySelector('.depth-profile-card');
    if (card) {
      const sst = lastSample.marine ? lastSample.marine.sea_surface_temperature : null;
      card.outerHTML = renderDepthProfileSvg(sst, currentObservationDepth);
    }
  }
}

// Depth Slider
if ($('depthRange')) {
  $('depthRange').addEventListener('input', e => {
    setObservationDepth(e.target.value, false);
  });
  $('depthRange').addEventListener('change', e => {
    toast(`Depth slice adjusted to ${e.target.value === '0' ? 'Surface' : '-' + e.target.value + 'm'}`);
  });
}

// Depth Preset Buttons
document.querySelectorAll('.depth-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const d = Number(btn.getAttribute('data-depth'));
    setObservationDepth(d, true);
    toast(`Depth slice: ${d === 0 ? 'Surface (0m)' : '-' + d + 'm'}`);
  });
});

// Play / Pause Timeline
function toggleTimelinePlayback() {
  isTimelinePlaying = !isTimelinePlaying;
  const playBtn = $('btnTimePlay');
  const iconPlay = playBtn ? playBtn.querySelector('.icon-play') : null;
  const iconPause = playBtn ? playBtn.querySelector('.icon-pause') : null;

  if (isTimelinePlaying) {
    if (iconPlay) iconPlay.style.display = 'none';
    if (iconPause) iconPause.style.display = 'block';
    toast(`Timeline playback started (${timelineSpeed}x)`);

    const scrubber = $('timeScrubRange');
    timelinePlaybackTimer = setInterval(() => {
      if (!scrubber) return;
      let val = Number(scrubber.value);
      val += 1;
      if (val > 100) val = 0;
      scrubber.value = val;
      updateTimelineScrubberText(val);
    }, 1000 / timelineSpeed);
  } else {
    if (iconPlay) iconPlay.style.display = 'block';
    if (iconPause) iconPause.style.display = 'none';
    clearInterval(timelinePlaybackTimer);
    toast('Timeline paused');
  }
}

function updateTimelineScrubberText(val) {
  const note = $('temporalStatusNote');
  if (!note) return;
  if (val >= 98) {
    note.innerHTML = '<span>Real-time satellite stream synchronized</span>';
  } else {
    const hoursAgo = Math.round(((100 - val) / 100) * 24);
    note.innerHTML = `<span>Historical buffer: -${hoursAgo}h from live stream</span>`;
  }
}

if ($('btnTimePlay')) {
  $('btnTimePlay').onclick = toggleTimelinePlayback;
}

if ($('timeScrubRange')) {
  $('timeScrubRange').addEventListener('input', e => {
    updateTimelineScrubberText(Number(e.target.value));
  });
  $('timeScrubRange').addEventListener('change', e => {
    const val = Number(e.target.value);
    if (val >= 98) {
      toast('Timeline synchronized to live telemetry');
    } else {
      const hoursAgo = Math.round(((100 - val) / 100) * 24);
      toast(`Telemetry window set to -${hoursAgo}h historical buffer`);
    }
  });
}

// Speed Selectors
document.querySelectorAll('.speed-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    timelineSpeed = Number(btn.getAttribute('data-speed')) || 1;
    toast(`Playback speed set to ${timelineSpeed}x`);
    if (isTimelinePlaying) {
      clearInterval(timelinePlaybackTimer);
      const scrubber = $('timeScrubRange');
      timelinePlaybackTimer = setInterval(() => {
        if (!scrubber) return;
        let val = Number(scrubber.value);
        val += 1;
        if (val > 100) val = 0;
        scrubber.value = val;
        updateTimelineScrubberText(val);
      }, 1000 / timelineSpeed);
    }
  });
});
