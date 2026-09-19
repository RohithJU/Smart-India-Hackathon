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
let searchTargetIndicator = null, searchTargetHalo = null;
let userLocation = null; // { lat, lon, name, label }
let locating = false;
let landmarksDataSource = null;
let labelsLayer = null;
let tilesetLabelsLayer = null;
let labelsVisible = true;

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

  // Enable Ultra-High Resolution Rendering (Retina / 4K / HiDPI display support)
  try {
    viewer.resolutionScale = window.devicePixelRatio || 1.0;
    viewer.useBrowserRecommendedResolution = false;
  } catch (_) { }

  const scene = viewer.scene;
  scene.backgroundColor = Cesium.Color.fromCssColorString('#02060f');
  scene.globe.enableLighting = false;
  scene.globe.showGroundAtmosphere = true;
  scene.globe.baseColor = Cesium.Color.fromCssColorString('#07223f');
  scene.globe.maximumScreenSpaceError = 1.33; // Sharper terrain & satellite tiles
  scene.skyAtmosphere.show = true;
  scene.fog.enabled = true;
  scene.highDynamicRange = false;
  if (scene.postProcessStages && scene.postProcessStages.fxaa) {
    scene.postProcessStages.fxaa.enabled = true;
  }

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

  // Target Search Location Marker (Pulsing Azure Beacon)
  searchTargetIndicator = viewer.entities.add({
    name: 'Target Search Location',
    position: Cesium.Cartesian3.ZERO,
    show: false,
    point: {
      pixelSize: new Cesium.CallbackProperty(() => 13 + 3 * Math.sin(Date.now() / 250), false),
      color: Cesium.Color.fromCssColorString('#8AB4F8'),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2.5,
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    },
    label: {
      text: 'SEARCH TARGET',
      font: '700 11px JetBrains Mono, monospace',
      fillColor: Cesium.Color.fromCssColorString('#A8C7FA'),
      outlineColor: Cesium.Color.fromCssColorString('#02060f'),
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, -22),
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    }
  });

  searchTargetHalo = viewer.entities.add({
    name: 'Search location halo',
    position: Cesium.Cartesian3.ZERO,
    show: false,
    point: {
      pixelSize: new Cesium.CallbackProperty(() => 28 + 10 * Math.sin(Date.now() / 250), false),
      color: new Cesium.CallbackProperty(() => {
        const alpha = Math.max(0.08, 0.28 + 0.15 * Math.sin(Date.now() / 250));
        return Cesium.Color.fromCssColorString('#8AB4F8').withAlpha(alpha);
      }, false),
      outlineColor: Cesium.Color.fromCssColorString('#A8C7FA').withAlpha(0.6),
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
      attachLabelsToTileset();
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
  if (tilesetLabelsLayer) tilesetLabelsLayer.show = labelsVisible;
  if (labelsLayer) labelsLayer.show = labelsVisible;
}

/* ==================================================================
   2b. GOOGLE EARTH BORDERS & LABELS OVERLAY (Countries, States, Cities, Seas)
   ================================================================== */
function initLabelsLayer() {
  if (!viewer) return;

  try {
    // Google Maps / Google Earth Hybrid Labels & Borders Overlay (lyrs=h)
    const googleLabelsProvider = new Cesium.UrlTemplateImageryProvider({
      url: 'https://mt{s}.google.com/vt/lyrs=h&x={x}&y={y}&z={z}',
      subdomains: ['0', '1', '2', '3'],
      maximumLevel: 20,
      credit: 'Google Earth / Maps'
    });

    labelsLayer = viewer.imageryLayers.addImageryProvider(googleLabelsProvider);
    labelsLayer.show = labelsVisible;
    labelsLayer.alpha = 1.0;
  } catch (err) {
    console.warn('Google labels provider failed, falling back to Esri Reference:', err);
    try {
      Cesium.ArcGisMapServerImageryProvider.fromUrl(
        'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer'
      ).then(provider => {
        labelsLayer = viewer.imageryLayers.addImageryProvider(provider);
        labelsLayer.show = labelsVisible;
      }).catch(e2 => console.error('Esri labels provider failed:', e2));
    } catch (err2) {
      console.error('Labels setup error:', err2);
    }
  }

  // Also attach to 3D tileset if loaded
  attachLabelsToTileset();

  // Wire Topbar Button
  const btnTop = $('btnToggleLabels') || $('btnToggleLandmarks');
  if (btnTop) {
    btnTop.onclick = () => toggleLabels();
  }
}

function attachLabelsToTileset() {
  if (googleTileset && googleTileset.imageryLayers && !tilesetLabelsLayer) {
    try {
      const tilesetLabelsProvider = new Cesium.UrlTemplateImageryProvider({
        url: 'https://mt{s}.google.com/vt/lyrs=h&x={x}&y={y}&z={z}',
        subdomains: ['0', '1', '2', '3'],
        maximumLevel: 20,
        credit: 'Google Earth / Maps'
      });
      tilesetLabelsLayer = googleTileset.imageryLayers.addImageryProvider(tilesetLabelsProvider);
      tilesetLabelsLayer.show = labelsVisible;
    } catch (eTileset) {
      console.warn('Could not drape labels on 3D tileset:', eTileset);
    }
  }
}

function toggleLabels(forceState) {
  labelsVisible = forceState !== undefined ? Boolean(forceState) : !labelsVisible;

  if (labelsLayer) {
    labelsLayer.show = labelsVisible;
  }
  if (tilesetLabelsLayer) {
    tilesetLabelsLayer.show = labelsVisible;
  }

  const btnTop = $('btnToggleLabels') || $('btnToggleLandmarks');
  if (btnTop) {
    btnTop.classList.toggle('on', labelsVisible);
    btnTop.setAttribute('aria-pressed', String(labelsVisible));
  }

  const sw = $('swLabels') || $('swLandmarks');
  if (sw) {
    sw.classList.toggle('on', labelsVisible);
    sw.setAttribute('aria-checked', String(labelsVisible));
  }

  toast(labelsVisible ? 'Borders & Labels: Visible' : 'Borders & Labels: Hidden');
}

function toggleLandmarks(forceState) {
  toggleLabels(forceState);
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

/* ==================================================================
   6b. OCEANOGRAPHY ENGINE — SALINITY-COUPLED WATER-COLUMN PHYSICS
   ------------------------------------------------------------------
   Open-Meteo's marine endpoint does not expose salinity, so salinity
   is reconstructed from a regional climatology (WOA/Argo-style values
   per basin) and every thermal quantity shown in the UI is then made
   a function of BOTH temperature and salinity:

     • density            — UNESCO/EOS-80 equation of state  ρ(S,T,p)
     • freezing point     — UNESCO  Tf(S,p)   (clamps deep temperature)
     • sound speed        — Mackenzie (1981)  c(T,S,D)
     • mixed-layer depth  — wind stirring modulated by haline stability
     • thermocline shape  — shifted by barrier layers in fresh basins
     • stratification N²  — from the full ρ(S,T) gradient
     • α / β             — thermal expansion vs haline contraction,
                            giving the °C ⇄ PSU density-compensation
   ================================================================== */

/* ---- Regional sea-surface-salinity climatology (PSU) -------------- */
function climatologicalSSS(lat, lon) {
  let n = lon; while (n > 180) n -= 360; while (n < -180) n += 360;
  const month = new Date().getUTCMonth() + 1;
  const basin = getOfflineOceanName(lat, n);
  const al = Math.abs(lat);

  /* zonal background: subtropical evaporation maxima, ITCZ rain
     minimum, sub-polar freshening */
  let s = 34.55
    + 1.85 * Math.exp(-Math.pow((al - 24) / 13, 2))
    - 0.85 * Math.exp(-Math.pow(lat / 6, 2))
    - 1.60 * Math.exp(-Math.pow((al - 62) / 12, 2));
  let note = 'Zonal surface climatology';

  switch (basin) {
    case 'Red Sea':
      s = 38.9 + Math.max(0, lat - 12) * 0.13;
      note = 'Hypersaline basin — evaporation greatly exceeds inflow'; break;
    case 'Persian Gulf':
      s = 39.4 + Math.max(0, n - 47) * 0.20;
      note = 'Shallow hypersaline gulf, strong evaporative concentration'; break;
    case 'Gulf of Oman':
      s = 36.8; note = 'Persian Gulf outflow plume'; break;
    case 'Arabian Sea':
      s = 35.55 + Math.max(0, lat - 8) * 0.080;
      note = 'Arabian Sea High-Salinity Water (evaporative + gulf outflow)'; break;
    case 'Laccadive Sea':
      s = 34.75; note = 'Mixed Arabian / Bay water'; break;
    case 'Bay of Bengal': {
      const north = Math.max(0, Math.min(1, (lat - 8) / 15));
      const monsoon = (month >= 7 && month <= 11) ? 1 : 0.35;
      s = 34.25 - 2.90 * north - 0.90 * north * monsoon;
      note = 'Ganges–Brahmaputra freshwater cap' +
        (monsoon === 1 ? ' (post-monsoon peak discharge)' : ''); break;
    }
    case 'Andaman Sea':
      s = 32.6 - (month >= 7 && month <= 11 ? 0.8 : 0);
      note = 'Irrawaddy / Salween river influence'; break;
    case 'Java & Banda Sea':
      s = 33.6; note = 'Indonesian Throughflow, high rainfall'; break;
    case 'Mediterranean Sea':
      s = 37.4 + Math.max(0, n) * 0.045;
      note = 'Semi-enclosed evaporative basin, saltier eastward'; break;
    case 'Black Sea':
      s = 18.3; note = 'Brackish — huge river input, restricted exchange'; break;
    case 'Baltic Sea':
      s = 8.5 - Math.max(0, lat - 55) * 0.35;
      note = 'Brackish estuarine sea'; break;
    case 'North Sea': s = 34.6; note = 'Shelf sea, Atlantic inflow'; break;
    case 'Norwegian Sea': s = 35.1; note = 'Atlantic inflow water'; break;
    case 'Caribbean Sea': s = 35.9; note = 'Subtropical Atlantic water'; break;
    case 'Gulf of Mexico': s = 36.2; note = 'Loop Current water, Mississippi plume nearshore'; break;
    case 'South China Sea': s = 33.5; note = 'Monsoon rainfall + river discharge'; break;
    case 'East China Sea': s = 33.2; note = 'Changjiang (Yangtze) dilution'; break;
    case 'Sea of Japan': s = 34.1; note = 'Semi-enclosed marginal sea'; break;
    case 'Philippine Sea': s = 34.5; note = 'North Pacific tropical water'; break;
    case 'Bering Sea': s = 32.6; note = 'Sub-arctic, sea-ice melt influence'; break;
    case 'Coral Sea': s = 35.4; note = 'South Pacific subtropical water'; break;
    case 'Tasman Sea': s = 35.4; note = 'East Australian Current water'; break;
    case 'Arctic Ocean':
      s = 31.0 + Math.max(0, 80 - al) * 0.06;
      note = 'Sea-ice melt and Siberian river runoff'; break;
    case 'Southern Ocean':
      s = 33.9 + Math.max(0, al - 60) * -0.04;
      note = 'Antarctic Surface Water, ice-melt freshened'; break;
    case 'North Atlantic Ocean':
      s = 35.2 + 1.6 * Math.exp(-Math.pow((al - 25) / 12, 2));
      note = 'Saltiest of the open ocean basins'; break;
    case 'South Atlantic Ocean':
      s = 34.9 + 1.3 * Math.exp(-Math.pow((al - 22) / 12, 2));
      note = 'Subtropical gyre water'; break;
    case 'Indian Ocean':
      s = 34.8 + 0.9 * Math.exp(-Math.pow((al - 28) / 12, 2))
        - 0.5 * Math.exp(-Math.pow((lat + 5) / 7, 2));
      note = 'Open Indian Ocean surface water'; break;
    default: break;
  }
  return { sss: Math.max(2, Math.min(42, s)), note, basin };
}

/* ---- Mixed layer & barrier layer --------------------------------- */
function estimateMLD(sss, windKmh, lat) {
  const w = (windKmh == null || isNaN(windKmh)) ? 18 : Number(windKmh);
  let mld = 18 + 1.45 * w;                                        // wind stirring
  const haline = Math.min(1.7, Math.max(0.28, 1 + 0.17 * (sss - 34.8)));
  mld *= haline;                                                  // fresh cap ⇒ shallower ML
  mld *= (1 + 0.006 * Math.abs(lat));                             // deeper at high latitude
  return Math.round(Math.max(8, Math.min(180, mld)));
}
function barrierLayerThickness(sss) {
  return sss < 33.9 ? Math.min(60, Math.round((33.9 - sss) * 21 + 12)) : 0;
}

/* ---- Profiles: S(z) and T(z), both salinity-aware ----------------- */
function salinityAtDepth(sss, d, mld, hyper, lat) {
  const polar = Math.abs(lat || 0) > 48;
  const deepRef = hyper ? sss - 0.5 : 34.72;
  const interMin = hyper ? sss - 0.4 : (polar ? 34.68 : 34.42);
  const subsurf = hyper ? sss
    : polar ? Math.max(sss + 0.3, 34.50)
      : (sss < 34.6 ? 35.05 : sss - 0.25);
  if (d <= mld) return sss;
  if (d <= 200) { const t = (d - mld) / Math.max(1, 200 - mld); return sss + (subsurf - sss) * Math.pow(Math.min(1, t), 0.65); }
  if (d <= 1000) { const t = (d - 200) / 800; return subsurf + (interMin - subsurf) * Math.pow(t, 0.9); }
  if (d <= 2500) { const t = (d - 1000) / 1500; return interMin + (deepRef - interMin) * t; }
  return deepRef;
}
function temperatureAtDepth(sst, sss, lat, d, mld, blt, hyper) {
  const deepT = hyper ? 21.5 : Math.max(1.2, 2.6 - Math.abs(lat) * 0.012);
  let thermoBase = hyper ? 22.0 : 7.5;
  if (!hyper && sst < 9) thermoBase = Math.min(7.5, sst + 0.5);
  const isoBase = mld + blt;
  let T;
  if (d <= isoBase) T = sst;
  else if (d <= 900) {
    const t = (d - isoBase) / Math.max(1, 900 - isoBase);
    T = sst - (sst - thermoBase) * Math.pow(Math.min(1, t), 0.62);
  } else {
    const t = Math.min(1, (d - 900) / 2100);
    T = thermoBase - (thermoBase - deepT) * Math.pow(t, 0.8);
  }
  const S = salinityAtDepth(sss, d, mld, hyper, lat);
  return Math.max(T, freezingPoint(S, d) + 0.05);
}

/* ---- UNESCO / EOS-80 equation of state ---------------------------- */
function rhoST0(T, S) {
  const rw = 999.842594 + 6.793952e-2 * T - 9.095290e-3 * T * T
    + 1.001685e-4 * Math.pow(T, 3) - 1.120083e-6 * Math.pow(T, 4) + 6.536332e-9 * Math.pow(T, 5);
  const A = 8.24493e-1 - 4.0899e-3 * T + 7.6438e-5 * T * T - 8.2467e-7 * Math.pow(T, 3) + 5.3875e-9 * Math.pow(T, 4);
  const B = -5.72466e-3 + 1.0227e-4 * T - 1.6546e-6 * T * T;
  const C = 4.8314e-4;
  return rw + A * S + B * Math.pow(Math.max(0, S), 1.5) + C * S * S;
}
function secantBulk(T, S, pBar) {
  const Kw = 19652.21 + 148.4206 * T - 2.327105 * T * T + 1.360477e-2 * Math.pow(T, 3) - 5.155288e-5 * Math.pow(T, 4);
  const K0 = Kw + S * (54.6746 - 0.603459 * T + 1.09987e-2 * T * T - 6.1670e-5 * Math.pow(T, 3))
    + Math.pow(Math.max(0, S), 1.5) * (7.944e-2 + 1.6483e-2 * T - 5.3009e-4 * T * T);
  const Aw = 3.239908 + 1.43713e-3 * T + 1.16092e-4 * T * T - 5.77905e-7 * Math.pow(T, 3);
  const A = Aw + S * (2.2838e-3 - 1.0981e-5 * T - 1.6078e-6 * T * T) + 1.91075e-4 * Math.pow(Math.max(0, S), 1.5);
  const Bw = 8.50935e-5 - 6.12293e-6 * T + 5.2787e-8 * T * T;
  const B = Bw + S * (-9.9348e-7 + 2.0816e-8 * T + 9.1697e-10 * T * T);
  return K0 + A * pBar + B * pBar * pBar;
}
function seawaterDensity(T, S, depth) {
  const r0 = rhoST0(T, S);
  const p = (depth || 0) / 10;
  if (p <= 0) return r0;
  return r0 / (1 - p / secantBulk(T, S, p));
}
function sigmaT(T, S) { return rhoST0(T, S) - 1000; }

/* ---- Freezing point (UNESCO) -------------------------------------- */
function freezingPoint(S, depth) {
  const p = depth || 0;
  const Sp = Math.max(0, S);
  return (-0.0575 + 1.710523e-3 * Math.sqrt(Sp) - 2.154996e-4 * Sp) * Sp - 7.53e-4 * p;
}

/* ---- Sound speed, Mackenzie (1981) -------------------------------- */
function soundSpeed(T, S, D) {
  return 1448.96 + 4.591 * T - 5.304e-2 * T * T + 2.374e-4 * Math.pow(T, 3)
    + 1.340 * (S - 35) + 1.630e-2 * D + 1.675e-7 * D * D
    - 1.025e-2 * T * (S - 35) - 7.139e-13 * T * Math.pow(D, 3);
}

/* ---- Thermal expansion α vs haline contraction β ------------------ */
function alphaBeta(T, S, depth) {
  const e = 0.01;
  const r = seawaterDensity(T, S, depth);
  const alpha = -(seawaterDensity(T + e, S, depth) - seawaterDensity(T - e, S, depth)) / (2 * e) / r;
  const beta = (seawaterDensity(T, S + e, depth) - seawaterDensity(T, S - e, depth)) / (2 * e) / r;
  return { alpha, beta, ratio: alpha !== 0 ? beta / alpha : NaN };
}

/* ---- Specific heat capacity (UNESCO, simplified, J/kg/K) ---------- */
function specificHeat(T, S) {
  const cp0 = 4217.4 - 3.720283 * T + 0.1412855 * T * T - 2.654387e-3 * Math.pow(T, 3) + 2.093236e-5 * Math.pow(T, 4);
  const a = -7.643575 + 0.1072763 * T - 1.38385e-3 * T * T;
  const b = 0.1770383 - 4.07718e-3 * T + 5.148e-5 * T * T;
  return cp0 + a * S + b * Math.pow(Math.max(0, S), 1.5);
}

/* ---- Water-mass identification from the T–S pair ------------------ */
function waterMass(T, S, d) {
  if (S > 38.5) return 'Hypersaline basin water';
  if (S < 20) return 'Brackish estuarine water';
  if (S < 31 && T > 20) return 'River-diluted coastal water';
  if (d < 120) {
    if (S < 33.5 && T > 26) return 'Bay of Bengal Low-Salinity Water';
    if (S > 36.0 && T > 24) return 'Arabian Sea High-Salinity Water';
    if (T > 25) return 'Tropical Surface Water';
    if (T > 15) return 'Subtropical Surface Water';
    if (T > 5) return 'Temperate Surface Water';
    return 'Polar Surface Water';
  }
  if (d < 700 && T >= 9 && T <= 18 && S >= 34.6 && S <= 35.6) return 'Indian/Subtropical Central Water';
  if (T >= 8 && T <= 16 && S >= 35.6) return 'Persian Gulf outflow water';
  if (T >= 5 && T <= 12 && S >= 34.9) return 'Red Sea–Persian Gulf Intermediate Water';
  if (T >= 2 && T <= 6 && S <= 34.6) return 'Antarctic Intermediate Water (AAIW)';
  if (T < 2.2 && S >= 34.6) return 'Antarctic Bottom Water (AABW)';
  if (T >= 2 && T < 4) return 'Indian Deep Water';
  return 'Modified deep water';
}

/* ---- Bundle everything onto a sample ------------------------------ */
function attachOceanography(s) {
  if (s.isLand) { s.ocn = null; return; }
  const m = s.marine || {}, a = s.air || {};
  const sst = (m.sea_surface_temperature != null && !isNaN(m.sea_surface_temperature))
    ? Number(m.sea_surface_temperature)
    : (a.temperature_2m != null ? Number(a.temperature_2m) - 1 : 26);
  const wind = (a.wind_speed_10m != null) ? Number(a.wind_speed_10m) : null;
  const cl = climatologicalSSS(s.lat, s.lon);
  const hyper = cl.sss > 37.5;
  const mld = estimateMLD(cl.sss, wind, s.lat);
  const blt = barrierLayerThickness(cl.sss);

  s.ocn = {
    sst, sss: cl.sss, note: cl.note, basin: cl.basin,
    mld, blt, hyper, wind,
    ts: d => ({
      d,
      t: temperatureAtDepth(sst, cl.sss, s.lat, d, mld, blt, hyper),
      s: salinityAtDepth(cl.sss, d, mld, hyper, s.lat)
    })
  };
  return s.ocn;
}

/** Full derived state at one depth for a sample. */
function waterColumnAt(s, depth) {
  if (!s || !s.ocn) return null;
  const o = s.ocn, d = Math.max(0, depth || 0);
  const p = o.ts(d);
  const rho = seawaterDensity(p.t, p.s, d);
  const ab = alphaBeta(p.t, p.s, d);

  const dz = 25;
  const up = o.ts(Math.max(0, d - dz)), dn = o.ts(d + dz);
  const rUp = seawaterDensity(up.t, up.s, d), rDn = seawaterDensity(dn.t, dn.s, d);
  const span = (dn.d - up.d) || 1;
  const n2 = 9.81 / ((rUp + rDn) / 2) * (rDn - rUp) / span;

  const dT = dn.t - up.t, dS = dn.s - up.s;
  const thermalPart = Math.abs(ab.alpha * dT), halinePart = Math.abs(ab.beta * dS);
  const salineShare = (thermalPart + halinePart) > 0
    ? halinePart / (thermalPart + halinePart) : 0;

  return {
    depth: d, t: p.t, s: p.s,
    rho, sigma: sigmaT(p.t, p.s), sigmaInSitu: rho - 1000,
    c: soundSpeed(p.t, p.s, d),
    tf: freezingPoint(p.s, d),
    cp: specificHeat(p.t, p.s),
    alpha: ab.alpha, beta: ab.beta, tsRatio: ab.ratio,
    n2, salineShare,
    mass: waterMass(p.t, p.s, d)
  };
}

function stabilityLabel(n2) {
  if (!isFinite(n2)) return '—';
  if (n2 < -1e-8) return 'Convectively unstable';
  if (n2 < 1e-6) return 'Well mixed';
  if (n2 < 1e-5) return 'Weakly stratified';
  if (n2 < 1e-4) return 'Stratified';
  return 'Strongly stratified';
}
function salinityClass(sss) {
  if (sss < 0.5) return 'Fresh';
  if (sss < 18) return 'Brackish';
  if (sss < 33) return 'Low-salinity';
  if (sss < 35) return 'Normal oceanic';
  if (sss < 37) return 'High-salinity';
  return 'Hypersaline';
}

/* ==================================================================
   6c. SALINITY & WATER-COLUMN PANEL
   ================================================================== */
function renderSalinitySection(s, depth) {
  const o = s.ocn;
  if (!o) return '';
  const wc = waterColumnAt(s, depth);
  const surf = waterColumnAt(s, 0);
  const atLabel = depth === 0 ? 'surface' : '−' + depth + ' m';

  const dTemp = wc.t - surf.t;
  const compens = isFinite(wc.tsRatio) ? wc.tsRatio : null;

  let html = '<div class="section-label">Salinity &amp; water column <span class="depth-tag">@ ' + atLabel + '</span></div>';
  html += '<div class="metric-grid">';

  html += metric('Salinity', wc.s.toFixed(2), 'PSU', 'var(--cyan-salinity)',
    salinityClass(wc.s) + (depth ? ' · surface ' + o.sss.toFixed(2) : ''), SVG_ICONS.salinity);

  html += metric('Temperature', wc.t.toFixed(2), '°C', 'var(--temp)',
    depth ? (dTemp >= 0 ? '+' : '') + dTemp.toFixed(2) + ' °C vs surface' : 'sea surface temp', SVG_ICONS.temp);

  html += metric('Density σθ', wc.sigma.toFixed(2), 'kg/m³', 'var(--curr)',
    'in-situ ' + wc.rho.toFixed(1) + ' kg/m³', SVG_ICONS.density);

  html += metric('Sound speed', Math.round(wc.c), 'm/s', 'var(--wind)',
    'f(T, S, depth)', SVG_ICONS.sound);

  html += metric('Freezing point', wc.tf.toFixed(2), '°C', 'var(--teal)',
    (wc.t - wc.tf).toFixed(1) + ' °C above freezing', SVG_ICONS.temp);

  html += metric('Mixed layer', o.mld, 'm', 'var(--alt)',
    o.blt ? 'barrier layer +' + o.blt + ' m' : 'wind + haline mixing', SVG_ICONS.alt);

  html += metric('Stability N²', wc.n2.toExponential(1), 's⁻²', 'var(--teal)',
    stabilityLabel(wc.n2) + ' · ' + Math.round(wc.salineShare * 100) + '% haline', SVG_ICONS.density);

  html += metric('T ⇄ S trade-off', (compens !== null ? compens.toFixed(2) : '--'), '°C / PSU', 'var(--cyan-salinity)',
    '1 PSU ≡ ' + (compens !== null ? compens.toFixed(2) : '--') + ' °C of density change', SVG_ICONS.balance);

  html += '<div class="metric wide" style="--c:var(--cyan-salinity)">' +
    '<div class="lab"><span class="m-icon" style="display:inline-flex;align-items:center;margin-right:4px">' + SVG_ICONS.salinity + '</span> Water mass</div>' +
    '<div class="val"><span class="num" style="font-size:.86rem">' + wc.mass + '</span></div>' +
    '<div class="sub">' + o.note + '</div>' +
    '</div>';

  html += '</div>';

  const driver = wc.salineShare > 0.5
    ? 'Salinity is the dominant control on stratification here, so the thermocline sits shallower than temperature alone would predict.'
    : 'Temperature dominates the density structure here; salinity is a secondary control.';
  const barrierTxt = o.blt
    ? ' A ' + o.blt + ' m barrier layer sits below the halocline — water there stays near SST even though salinity has already jumped.'
    : '';
  html += '<div class="sal-note"><b>Coupling:</b> ' + driver + barrierTxt +
    ' Every temperature value above is clamped to the local freezing point Tf(S,p) = ' + wc.tf.toFixed(2) + ' °C.</div>';

  return html;
}

/* ==================================================================
   6d. T–S DIAGRAM WITH ISOPYCNALS
   ================================================================== */
function renderTSDiagram(s, currentDepth) {
  const o = s.ocn;
  if (!o) return '';
  const W = 280, H = 158, padL = 30, padR = 12, padT = 14, padB = 26;
  const plotW = W - padL - padR, plotH = H - padT - padB;

  const depths = [0, 25, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000];
  const pts = depths.map(d => {
    const p = o.ts(d);
    return { d, t: p.t, s: p.s, sig: sigmaT(p.t, p.s) };
  });

  let sMin = Math.min.apply(null, pts.map(p => p.s));
  let sMax = Math.max.apply(null, pts.map(p => p.s));
  let tMin = Math.min.apply(null, pts.map(p => p.t));
  let tMax = Math.max.apply(null, pts.map(p => p.t));
  const sPad = Math.max(0.25, (sMax - sMin) * 0.16);
  const tPad = Math.max(1.0, (tMax - tMin) * 0.12);
  sMin -= sPad; sMax += sPad; tMin -= tPad; tMax += tPad;

  const X = v => padL + ((v - sMin) / (sMax - sMin)) * plotW;
  const Y = v => padT + plotH - ((v - tMin) / (tMax - tMin)) * plotH;

  const sigLo = sigmaT(tMax, sMin), sigHi = sigmaT(tMin, sMax);
  const step = (sigHi - sigLo) > 12 ? 4 : (sigHi - sigLo) > 6 ? 2 : 1;
  let iso = '';
  const start = Math.ceil(Math.min(sigLo, sigHi) / step) * step;
  for (let sig = start; sig <= Math.max(sigLo, sigHi); sig += step) {
    const seg = [];
    for (let i = 0; i <= 24; i++) {
      const sv = sMin + (sMax - sMin) * (i / 24);
      let lo = -2.5, hi = 40, mid = 0;
      for (let k = 0; k < 28; k++) {
        mid = (lo + hi) / 2;
        if (sigmaT(mid, sv) > sig) lo = mid; else hi = mid;
      }
      if (mid > tMin && mid < tMax) seg.push(X(sv).toFixed(1) + ',' + Y(mid).toFixed(1));
    }
    if (seg.length > 2) {
      const last = seg[seg.length - 1].split(',');
      iso += '<polyline fill="none" stroke="#3C4043" stroke-width="0.8" stroke-dasharray="3 3" points="' + seg.join(' ') + '"/>' +
        '<text x="' + last[0] + '" y="' + (Number(last[1]) - 2) + '" fill="#5F6368" font-size="6.5" text-anchor="end">' + sig.toFixed(0) + '</text>';
    }
  }

  const line = pts.map(p => X(p.s).toFixed(1) + ',' + Y(p.t).toFixed(1)).join(' ');
  const dots = pts.map(p =>
    '<circle cx="' + X(p.s).toFixed(1) + '" cy="' + Y(p.t).toFixed(1) + '" r="2" fill="#8AB4F8" opacity="0.85"><title>' +
    p.d + ' m · ' + p.t.toFixed(2) + ' °C · ' + p.s.toFixed(2) + ' PSU</title></circle>').join('');

  const cur = o.ts(currentDepth);
  const cx = X(cur.s), cy = Y(cur.t);

  return '' +
    '<div class="depth-profile-card ts-card">' +
    '<div class="depth-profile-head">' +
    '<span class="depth-profile-title">' + SVG_ICONS.balance + ' T–S Diagram · isopycnals σθ</span>' +
    '<span class="ge-section-badge" style="font-size:0.52rem">Derived</span>' +
    '</div>' +
    '<svg class="depth-chart-svg" viewBox="0 0 ' + W + ' ' + H + '">' +
    '<rect x="' + padL + '" y="' + padT + '" width="' + plotW + '" height="' + plotH + '" fill="none" stroke="#30343A" stroke-width="0.8"/>' +
    iso +
    '<polyline fill="none" stroke="#7DD3FC" stroke-width="1.6" stroke-linejoin="round" points="' + line + '"/>' +
    dots +
    '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="4" fill="none" stroke="#F9AB00" stroke-width="1.6"/>' +
    '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="1.6" fill="#F9AB00"/>' +
    '<text x="' + padL + '" y="' + (H - 8) + '" fill="#9AA0A6" font-size="7">' + sMin.toFixed(1) + '</text>' +
    '<text x="' + (padL + plotW) + '" y="' + (H - 8) + '" fill="#9AA0A6" font-size="7" text-anchor="end">' + sMax.toFixed(1) + ' PSU</text>' +
    '<text x="' + (padL - 4) + '" y="' + (padT + 6) + '" fill="#9AA0A6" font-size="7" text-anchor="end">' + tMax.toFixed(0) + '</text>' +
    '<text x="' + (padL - 4) + '" y="' + (padT + plotH) + '" fill="#9AA0A6" font-size="7" text-anchor="end">' + tMin.toFixed(0) + '°C</text>' +
    '</svg>' +
    '<div class="ts-foot">Marker = current depth slice (−' + currentDepth + ' m). Dashed lines are constant-density curves: where the profile crosses them, a temperature change is being offset by salinity.</div>' +
    '</div>';
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

    // Reconstruct the salinity field and derive every T/S-coupled quantity
    attachOceanography(sample);

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
  salinity: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.7 6.4 8.3a8 8 0 1 0 11.3 0z"/><path d="M8.5 14h7"/><path d="M10 17h4"/></svg>',
  density: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/></svg>',
  sound: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
  balance: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="M5 7h14"/><path d="m5 7-3 6h6z"/><path d="m19 7-3 6h6z"/></svg>',
  globe: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>'
};

function renderDepthProfileSvg(sample, currentDepthSlice = 0) {
  /* Accepts a full sample (preferred). Falls back to a bare SST number
     for backward compatibility with older call sites. */
  let o = null;
  if (sample && typeof sample === 'object' && sample.ocn) o = sample.ocn;
  else {
    const sstVal = (typeof sample === 'number') ? sample : 26.0;
    const fake = { lat: 10, lon: 75, isLand: false, marine: { sea_surface_temperature: sstVal }, air: {} };
    attachOceanography(fake);
    o = fake.ocn;
    sample = fake;
  }

  const W = 280, H = 150;
  const padL = 30, padR = 34, padT = 20, padB = 24;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const maxDepth = 2000;

  const depths = [0, 25, 50, 75, 100, 150, 200, 300, 400, 600, 800, 1000, 1200, 1600, 2000];
  const rows = depths.map(d => {
    const p = o.ts(d);
    return { d, t: p.t, s: p.s, sig: sigmaT(p.t, p.s) };
  });

  const tVals = rows.map(r => r.t), sVals = rows.map(r => r.s);
  let tMin = Math.min.apply(null, tVals), tMax = Math.max.apply(null, tVals);
  let sMin = Math.min.apply(null, sVals), sMax = Math.max.apply(null, sVals);
  tMin = Math.floor(tMin - 1); tMax = Math.ceil(tMax + 1);
  const sSpan = Math.max(0.6, sMax - sMin);
  sMin -= sSpan * 0.18; sMax += sSpan * 0.18;

  const yForDepth = d => padT + (Math.min(maxDepth, d) / maxDepth) * plotH;
  const xForTemp = t => padL + Math.max(0, Math.min(plotW, ((t - tMin) / (tMax - tMin)) * plotW));
  const xForSal = s => padL + Math.max(0, Math.min(plotW, ((s - sMin) / (sMax - sMin)) * plotW));

  const tempPoints = rows.map(r => xForTemp(r.t).toFixed(1) + ',' + yForDepth(r.d).toFixed(1)).join(' ');
  const salPoints = rows.map(r => xForSal(r.s).toFixed(1) + ',' + yForDepth(r.d).toFixed(1)).join(' ');

  const sliceY = yForDepth(currentDepthSlice);
  const wc = waterColumnAt(sample, currentDepthSlice);

  const mldY = yForDepth(o.mld);
  const bltY = yForDepth(o.mld + o.blt);
  const barrierBand = o.blt
    ? '<rect x="' + padL + '" y="' + mldY.toFixed(1) + '" width="' + plotW + '" height="' + Math.max(1, bltY - mldY).toFixed(1) +
    '" fill="#7DD3FC" opacity="0.10"/>' +
    '<text x="' + (padL + 4) + '" y="' + (bltY - 1.5).toFixed(1) + '" fill="#7DD3FC" font-size="6.5">barrier layer</text>'
    : '';

  const gridLine = (d, label) =>
    '<line x1="' + padL + '" y1="' + yForDepth(d) + '" x2="' + (padL + plotW) + '" y2="' + yForDepth(d) +
    '" stroke="#30343A" stroke-width="1" stroke-dasharray="2 3"/>' +
    '<text x="' + (padL - 4) + '" y="' + (yForDepth(d) + 3) + '" fill="#9AA0A6" font-size="8" text-anchor="end">' + label + '</text>';

  return '' +
    '<div class="depth-profile-card">' +
    '<div class="depth-profile-head">' +
    '<span class="depth-profile-title">' +
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' +
    ' CTD Profile · T &amp; S (0–2000 m)</span>' +
    '<span class="ge-section-badge" style="font-size:0.52rem">Modelled</span>' +
    '</div>' +
    '<div class="depth-profile-legend">' +
    '<span class="leg-t"><span style="display:inline-block;width:7px;height:2px;background:var(--temp-highlight);margin-right:3px"></span>Temp ' + o.sst.toFixed(1) + '→' + rows[rows.length - 1].t.toFixed(1) + '°C</span>' +
    '<span class="leg-s"><span style="display:inline-block;width:7px;height:2px;background:var(--cyan-salinity);margin-right:3px"></span>Salinity ' + o.sss.toFixed(2) + '→' + rows[rows.length - 1].s.toFixed(2) + ' PSU</span>' +
    '</div>' +
    '<svg class="depth-chart-svg" viewBox="0 0 ' + W + ' ' + H + '">' +
    gridLine(0, '0m') + gridLine(1000, '1km') + gridLine(2000, '2km') +
    barrierBand +
    '<line x1="' + padL + '" y1="' + mldY.toFixed(1) + '" x2="' + (padL + plotW) + '" y2="' + mldY.toFixed(1) +
    '" stroke="#34A853" stroke-width="1" stroke-dasharray="1 2" opacity="0.8"/>' +
    '<text x="' + (padL + plotW - 2) + '" y="' + (mldY - 2).toFixed(1) + '" fill="#34A853" font-size="6.5" text-anchor="end">MLD ' + o.mld + 'm</text>' +
    '<polyline fill="none" stroke="#7DD3FC" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.9" points="' + salPoints + '"/>' +
    '<polyline fill="none" stroke="#F28B82" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="' + tempPoints + '"/>' +
    '<line x1="' + padL + '" y1="' + sliceY + '" x2="' + (padL + plotW) + '" y2="' + sliceY + '" stroke="#A8C7FA" stroke-width="1.5" stroke-dasharray="4 2"/>' +
    '<circle cx="' + xForTemp(wc.t).toFixed(1) + '" cy="' + sliceY + '" r="2.6" fill="#F28B82"/>' +
    '<circle cx="' + xForSal(wc.s).toFixed(1) + '" cy="' + sliceY + '" r="2.6" fill="#7DD3FC"/>' +
    '<text x="' + (padL + plotW + 4) + '" y="' + (sliceY + 3) + '" fill="#A8C7FA" font-size="8" text-anchor="start">-' + currentDepthSlice + 'm</text>' +
    '</svg>' +
    '<div class="ts-foot">At −' + currentDepthSlice + ' m: <b style="color:var(--temp-highlight)">' + wc.t.toFixed(2) + ' °C</b> · ' +
    '<b style="color:var(--cyan-salinity)">' + wc.s.toFixed(2) + ' PSU</b> · σθ ' + wc.sigma.toFixed(2) + ' kg/m³ · ' + Math.round(wc.c) + ' m/s</div>' +
    '</div>';
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
    html += renderSalinitySection(s, currentObservationDepth);
    html += renderDepthProfileSvg(s, currentObservationDepth);
    html += renderTSDiagram(s, currentObservationDepth);
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

  // Salinity cell (reconstructed climatology, depth-aware)
  const salEl = $('hSal');
  if (salEl) {
    if (!s.isLand && s.ocn) {
      const wc = waterColumnAt(s, currentObservationDepth);
      salEl.textContent = wc.s.toFixed(2) + ' PSU';
      salEl.title = salinityClass(wc.s) + ' · ' + s.ocn.note;
    } else { salEl.textContent = '--'; salEl.title = ''; }
  }
  const denEl = $('hDensity');
  if (denEl) {
    if (!s.isLand && s.ocn) {
      const wc = waterColumnAt(s, currentObservationDepth);
      denEl.textContent = wc.sigma.toFixed(2);
      denEl.title = 'σθ from T=' + wc.t.toFixed(2) + ' °C, S=' + wc.s.toFixed(2) + ' PSU';
    } else { denEl.textContent = '--'; }
  }

  const sst = m.sea_surface_temperature, airT = a.temperature_2m;
  if (!s.isLand && s.ocn && currentObservationDepth > 0) {
    const wc = waterColumnAt(s, currentObservationDepth);
    $('hTemp').textContent = wc.t.toFixed(1) + '°C @-' + currentObservationDepth + 'm';
  }
  else if (!s.isLand && sst !== null && sst !== undefined)
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

  // Synchronize data availability in persistent floating depth widget
  updateDepthWidgetDisplay();
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
    if (s.ocn) {
      const wc = waterColumnAt(s, currentObservationDepth);
      rows += '<div class="tr"><span>Salinity</span><b style="color:var(--cyan-salinity)">' + wc.s.toFixed(2) + ' PSU</b></div>';
      rows += '<div class="tr"><span>Density σθ</span><b style="color:var(--curr)">' + wc.sigma.toFixed(2) + ' kg/m³</b></div>';
      if (currentObservationDepth > 0)
        rows += '<div class="tr"><span>T @ -' + currentObservationDepth + 'm</span><b style="color:var(--temp)">' + wc.t.toFixed(2) + ' °C</b></div>';
    }
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

  // Click = select Argo float or lock a station at that point
  handler.setInputAction(click => {
    // 1. Check if user clicked an Argo Float entity
    const pickedObject = viewer.scene.pick(click.position);
    if (Cesium.defined(pickedObject) && pickedObject.id && pickedObject.id._argoData) {
      selectArgoFloat(pickedObject.id._argoData, true);
      return;
    }

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
      if (lastSample && !lastSample.isLand) {
        loadOceanProfile(lastSample);
      }
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
    (s.ocn ? (function () {
      const wc = waterColumnAt(s, currentObservationDepth);
      return 'Salinity : ' + wc.s.toFixed(2) + ' PSU (' + salinityClass(wc.s) + ') @ -' + currentObservationDepth + ' m\n' +
        'Surf. sal: ' + s.ocn.sss.toFixed(2) + ' PSU — ' + s.ocn.note + '\n' +
        'Temp@z   : ' + wc.t.toFixed(2) + ' °C  (freezing pt ' + wc.tf.toFixed(2) + ' °C)\n' +
        'Density  : sigma-theta ' + wc.sigma.toFixed(2) + ' kg/m3, in-situ ' + wc.rho.toFixed(1) + '\n' +
        'Sound    : ' + Math.round(wc.c) + ' m/s\n' +
        'MLD      : ' + s.ocn.mld + ' m' + (s.ocn.blt ? ' + ' + s.ocn.blt + ' m barrier layer' : '') + '\n' +
        'Stability: N2 ' + wc.n2.toExponential(2) + ' s-2 (' + stabilityLabel(wc.n2) + ', ' + Math.round(wc.salineShare * 100) + '% haline)\n' +
        'T-S ratio: 1 PSU = ' + wc.tsRatio.toFixed(2) + ' degC of equivalent density change\n' +
        'Watermass: ' + wc.mass + '\n';
    })() : '') +
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
      case 'labels': case 'landmarks': toggleLabels(on); break;
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
    case 'l': case 'L': toggleLabels(); break;
    case 'b': case 'B': toggleLabels(); break;
    case 'h': case 'H': toggleSidebar(undefined, true); break;
    case 'p': case 'P': toggleOceanProfilePanel(); break;
    case 'f': case 'F': $('btnFull').click(); break;
    case 'k': case 'K': $('btnLock').click(); break;
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

// Initialize Google Earth-style Borders & Labels overlay
initLabelsLayer();

// Initialize 3D Argo Float Network
initArgoFloatNetwork();

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

// Connect live INCOIS Argo Float network feed
if ($('layerArgoFloats')) {
  $('layerArgoFloats').onchange = e => {
    toggleArgoLayer(e.target.checked);
  };
}

// TODO: Connect AI-predicted oceanographic gap reconstruction
if ($('layerAIPredicted')) {
  $('layerAIPredicted').onchange = e => {
    toast('AI-Predicted Gaps: Neural model preview coming soon');
    e.target.checked = false;
  };
}

/* ==================================================================
   11b. COORDINATE SEARCH & NAVIGATION SYSTEM (Prompt Modal & Search Bars)
   ================================================================== */
const KNOWN_LOCATIONS = [
  { name: 'mumbai', lat: 18.9220, lon: 72.8347, label: 'Mumbai, India' },
  { name: 'delhi', lat: 28.6139, lon: 77.2090, label: 'New Delhi, India' },
  { name: 'new delhi', lat: 28.6139, lon: 77.2090, label: 'New Delhi, India' },
  { name: 'chennai', lat: 13.0827, lon: 80.2707, label: 'Chennai, India' },
  { name: 'kolkata', lat: 22.5726, lon: 88.3639, label: 'Kolkata, India' },
  { name: 'bengaluru', lat: 12.9716, lon: 77.5946, label: 'Bengaluru, India' },
  { name: 'bangalore', lat: 12.9716, lon: 77.5946, label: 'Bengaluru, India' },
  { name: 'goa', lat: 15.2993, lon: 74.1240, label: 'Goa, India' },
  { name: 'kochi', lat: 9.9312, lon: 76.2673, label: 'Kochi, India' },
  { name: 'mariana', lat: 11.3500, lon: 142.2000, label: 'Mariana Trench' },
  { name: 'equator', lat: 0.0000, lon: 0.0000, label: 'Equator / Prime Meridian' }
];

function openCoordModal(prefillLat = null, prefillLon = null) {
  const modal = $('coordModal');
  if (!modal) return;

  // Clear previous errors and error classes
  const errLat = $('errCoordLat');
  const errLon = $('errCoordLon');
  const boxLat = $('boxCoordLat');
  const boxLon = $('boxCoordLon');
  if (errLat) errLat.textContent = '';
  if (errLon) errLon.textContent = '';
  if (boxLat) boxLat.classList.remove('has-error');
  if (boxLon) boxLon.classList.remove('has-error');

  const inputLat = $('inputCoordLat');
  const inputLon = $('inputCoordLon');

  if (prefillLat !== null && prefillLon !== null) {
    if (inputLat) inputLat.value = prefillLat;
    if (inputLon) inputLon.value = prefillLon;
  } else {
    // Check if user has entered partial or complete coordinates in either search input
    const topVal = $('topbarSearchInput') ? $('topbarSearchInput').value.trim() : '';
    const sideVal = $('ge-search-input') ? $('ge-search-input').value.trim() : '';
    const candidate = topVal || sideVal;
    if (candidate) {
      const coordMatch = candidate.match(/^(-?\d+(\.\d+)?)[,\s/]+(-?\d+(\.\d+)?)$/);
      if (coordMatch) {
        if (inputLat) inputLat.value = coordMatch[1];
        if (inputLon) inputLon.value = coordMatch[3];
      }
    }
  }

  modal.style.display = 'flex';

  if (inputLat) {
    setTimeout(() => {
      inputLat.focus();
      inputLat.select();
    }, 80);
  }
}

function closeCoordModal() {
  const modal = $('coordModal');
  if (modal) modal.style.display = 'none';
}

function navigateToCoordinates(lat, lon, label = '') {
  if (!viewer) return;

  // Ensure auto-rotation is paused
  autoRotate = false;
  if ($('btnSpin')) $('btnSpin').classList.remove('on');

  const formatted = fmtCoord(lat, lon);
  const displayLabel = label || formatted;

  // Synchronize search inputs
  if ($('topbarSearchInput')) $('topbarSearchInput').value = displayLabel;
  if ($('ge-search-input')) $('ge-search-input').value = displayLabel;

  // Place/update search target beacon
  if (searchTargetIndicator && searchTargetHalo) {
    const pos = Cesium.Cartesian3.fromDegrees(lon, lat, 0);
    searchTargetIndicator.position = pos;
    searchTargetHalo.position = pos;
    if (searchTargetIndicator.label) {
      searchTargetIndicator.label.text = `TARGET: ${displayLabel}`;
    }
    searchTargetIndicator.show = true;
    searchTargetHalo.show = true;
  }

  // Camera flight to specified coordinate
  flyTo(lat, lon, 350000, 2.2);

  // Sample ocean telemetry at this exact point
  fetchSample(lat, lon);

  // Notification
  toast('Navigating to ' + displayLabel);
}

function validateAndSubmitCoords() {
  const inputLat = $('inputCoordLat');
  const inputLon = $('inputCoordLon');
  const errLat = $('errCoordLat');
  const errLon = $('errCoordLon');
  const boxLat = $('boxCoordLat');
  const boxLon = $('boxCoordLon');

  if (errLat) errLat.textContent = '';
  if (errLon) errLon.textContent = '';
  if (boxLat) boxLat.classList.remove('has-error');
  if (boxLon) boxLon.classList.remove('has-error');

  const latRaw = inputLat ? inputLat.value.trim() : '';
  const lonRaw = inputLon ? inputLon.value.trim() : '';

  let hasError = false;

  // 1. SPECIFIC VALIDATION FOR BOX 1: LATITUDE
  if (!latRaw) {
    if (errLat) errLat.textContent = 'Please enter Latitude in Box 1 (-90° to +90°)';
    if (boxLat) boxLat.classList.add('has-error');
    if (!hasError && inputLat) inputLat.focus();
    hasError = true;
  } else {
    const lat = parseFloat(latRaw);
    if (isNaN(lat)) {
      if (errLat) errLat.textContent = 'Latitude must be a valid number';
      if (boxLat) boxLat.classList.add('has-error');
      if (!hasError && inputLat) inputLat.focus();
      hasError = true;
    } else if (lat < -90 || lat > 90) {
      if (errLat) errLat.textContent = 'Latitude must be between -90.0° and +90.0°';
      if (boxLat) boxLat.classList.add('has-error');
      if (!hasError && inputLat) inputLat.focus();
      hasError = true;
    }
  }

  // 2. SPECIFIC VALIDATION FOR BOX 2: LONGITUDE
  if (!lonRaw) {
    if (errLon) errLon.textContent = 'Please enter Longitude in Box 2 (-180° to +180°)';
    if (boxLon) boxLon.classList.add('has-error');
    if (!hasError && inputLon) inputLon.focus();
    hasError = true;
  } else {
    const lon = parseFloat(lonRaw);
    if (isNaN(lon)) {
      if (errLon) errLon.textContent = 'Longitude must be a valid number';
      if (boxLon) boxLon.classList.add('has-error');
      if (!hasError && inputLon) inputLon.focus();
      hasError = true;
    } else if (lon < -180 || lon > 180) {
      if (errLon) errLon.textContent = 'Longitude must be between -180.0° and +180.0°';
      if (boxLon) boxLon.classList.add('has-error');
      if (!hasError && inputLon) inputLon.focus();
      hasError = true;
    }
  }

  if (hasError) return false;

  const lat = parseFloat(latRaw);
  const lon = parseFloat(lonRaw);

  closeCoordModal();
  navigateToCoordinates(lat, lon);
  return true;
}

// Wire up search buttons & modal controls
if ($('btnSearchIcon')) {
  $('btnSearchIcon').onclick = (e) => {
    e.stopPropagation();
    openCoordModal();
  };
}

if ($('btnSidebarSearchIcon')) {
  $('btnSidebarSearchIcon').onclick = (e) => {
    e.stopPropagation();
    openCoordModal();
  };
}

if ($('btnCloseCoordModal')) $('btnCloseCoordModal').onclick = closeCoordModal;
if ($('btnCancelCoordModal')) $('btnCancelCoordModal').onclick = closeCoordModal;

if ($('coordModal')) {
  $('coordModal').onclick = (e) => {
    // Close if clicked directly on backdrop or overlay background
    if (e.target === $('coordModal') || e.target.id === 'dlgOverlayBg') {
      closeCoordModal();
    }
  };
}

if ($('coordSearchForm')) {
  $('coordSearchForm').onsubmit = (e) => {
    e.preventDefault();
    validateAndSubmitCoords();
  };
}

// Sync Current Camera View Toggle Switch (From Sample Code Toggle Section)
let syncCamActive = false;
if ($('btnSyncCurrentCam')) {
  $('btnSyncCurrentCam').onclick = () => {
    syncCamActive = !syncCamActive;
    $('btnSyncCurrentCam').classList.toggle('active', syncCamActive);
    $('btnSyncCurrentCam').setAttribute('aria-checked', String(syncCamActive));

    if (syncCamActive && viewer) {
      const c = viewer.camera.positionCartographic;
      const lat = Cesium.Math.toDegrees(c.latitude).toFixed(4);
      const lon = Cesium.Math.toDegrees(c.longitude).toFixed(4);
      if ($('inputCoordLat')) $('inputCoordLat').value = lat;
      if ($('inputCoordLon')) $('inputCoordLon').value = lon;
      // Remove any active preset highlights when custom syncing
      document.querySelectorAll('.dlg-tab-btn').forEach(btn => btn.classList.remove('active'));
      toast(`Synced camera position: ${lat}°, ${lon}°`);
    }
  };
}

// Preset Location Tabs (From Sample Code Pricing Tabs)
document.querySelectorAll('.dlg-tab-btn').forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll('.dlg-tab-btn').forEach(btn => btn.classList.remove('active'));
    tab.classList.add('active');

    const lat = tab.getAttribute('data-lat');
    const lon = tab.getAttribute('data-lon');
    if ($('inputCoordLat')) $('inputCoordLat').value = lat;
    if ($('inputCoordLon')) $('inputCoordLon').value = lon;

    // Turn off camera sync toggle since preset is chosen
    if ($('btnSyncCurrentCam')) {
      syncCamActive = false;
      $('btnSyncCurrentCam').classList.remove('active');
      $('btnSyncCurrentCam').setAttribute('aria-checked', 'false');
    }

    // Clear any previous field error states
    const boxLat = $('boxCoordLat');
    const boxLon = $('boxCoordLon');
    const errLat = $('errCoordLat');
    const errLon = $('errCoordLon');
    if (boxLat) boxLat.classList.remove('has-error');
    if (boxLon) boxLon.classList.remove('has-error');
    if (errLat) errLat.textContent = '';
    if (errLon) errLon.textContent = '';
  };
});

// Keyboard Listener: 'F' to open search dialog, 'Escape' to close (From Sample Code)
window.addEventListener('keydown', (e) => {
  const modal = $('coordModal');
  const isOpen = modal && modal.style.display !== 'none';

  if (
    e.key.toLowerCase() === 'f' &&
    !isOpen &&
    document.activeElement?.tagName !== 'INPUT' &&
    document.activeElement?.tagName !== 'TEXTAREA'
  ) {
    e.preventDefault();
    openCoordModal();
  } else if (e.key === 'Escape' && isOpen) {
    e.preventDefault();
    e.stopPropagation();
    closeCoordModal();
  }
}, true);

// Sidebar Search Input: Enter key handling
if ($('ge-search-input')) {
  $('ge-search-input').onkeydown = e => {
    if (e.key === 'Enter') {
      const q = e.target.value.trim();
      if (!q) {
        openCoordModal();
        return;
      }
      const coordMatch = q.match(/^(-?\d+(\.\d+)?)[,\s/]+(-?\d+(\.\d+)?)$/);
      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lon = parseFloat(coordMatch[3]);
        if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
          navigateToCoordinates(lat, lon);
          return;
        }
      }
      const qLower = q.toLowerCase();
      const matchLoc = KNOWN_LOCATIONS.find(loc => qLower.includes(loc.name) || loc.name.includes(qLower));
      if (matchLoc) {
        navigateToCoordinates(matchLoc.lat, matchLoc.lon, matchLoc.label);
        return;
      }
      const sel = $('jumpSel');
      if (sel) {
        for (let i = 0; i < sel.options.length; i++) {
          const opt = sel.options[i];
          if (opt.value && opt.text.toLowerCase().includes(qLower)) {
            sel.selectedIndex = i;
            sel.dispatchEvent(new Event('change'));
            return;
          }
        }
      }
      openCoordModal();
    }
  };
}

/* ==================================================================
   12. DEPTH OBSERVATION CONTROL
   ================================================================== */
let currentObservationDepth = 1000;
let isTimelinePlaying = false;
let timelinePlaybackTimer = null;
let timelineSpeed = 1;

const depthWidget = $('floatingDepthWidget');
const depthInput = $('depthRange');
const depthNum = $('fDepthNum');

function updateDepthValue(val) {
  const depth = Math.max(0, Math.min(6000, Number(val) || 0));
  currentObservationDepth = depth;
  if (depthNum) {
    depthNum.textContent = depth;
  }
}

if (depthInput) {
  // Update depth immediately whenever the slider moves (drag or keyboard)
  depthInput.addEventListener('input', e => {
    updateDepthValue(e.target.value);
  });

  depthInput.addEventListener('change', e => {
    updateDepthValue(e.target.value);
  });
}

// Stop Cesium globe camera movement when interacting with depth widget
if (depthWidget) {
  const stopEvent = e => e.stopPropagation();
  depthWidget.addEventListener('mousedown', stopEvent);
  depthWidget.addEventListener('pointerdown', stopEvent);
  depthWidget.addEventListener('touchstart', stopEvent, { passive: true });
  depthWidget.addEventListener('wheel', stopEvent);
  depthWidget.addEventListener('dblclick', stopEvent);
}

// Initialize on boot
if (depthInput) {
  updateDepthValue(depthInput.value);
}

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

/* ==================================================================
   13. ARGO FLOAT NETWORK & OCEAN PROFILE PLATFORM
   ================================================================== */

const ARGO_FLOAT_NETWORK = [
  { id: 'ARGO-45821', wmo: '2903341', name: 'Arabian Sea High-Salinity Float', lat: 15.4200, lon: 72.8400, platform: 'PROVOR-CTS4', cycle: 142, depthRange: [0, 2000], sensor: 'SBE-41CP CTD + DO', battery: '91%', lastTransmission: '12m ago', basin: 'Arabian Sea', waterMass: 'Arabian Sea High-Salinity Water' },
  { id: 'ARGO-45822', wmo: '2903342', name: 'Mumbai Shelf Profiler', lat: 18.9220, lon: 71.4500, platform: 'APEX-11', cycle: 88, depthRange: [0, 2000], sensor: 'SBE-41CP CTD', battery: '84%', lastTransmission: '35m ago', basin: 'Arabian Sea', waterMass: 'Arabian Sea Coastal Water' },
  { id: 'ARGO-45823', wmo: '2903343', name: 'Bay of Bengal North Float', lat: 17.8500, lon: 88.3500, platform: 'ARVOR-I', cycle: 114, depthRange: [0, 2000], sensor: 'SBE-41CP CTD + FLBB', battery: '79%', lastTransmission: '1h ago', basin: 'Bay of Bengal', waterMass: 'Bay of Bengal Low-Salinity Water' },
  { id: 'ARGO-45824', wmo: '2903344', name: 'Ganges Plume Profiler', lat: 20.4500, lon: 89.2000, platform: 'APEX-11', cycle: 67, depthRange: [0, 2000], sensor: 'SBE-41CP CTD', battery: '88%', lastTransmission: '2h ago', basin: 'Bay of Bengal', waterMass: 'Ganges Freshwater Dilution Plume' },
  { id: 'ARGO-45825', wmo: '2903345', name: 'Andaman Basin Deep Float', lat: 11.2000, lon: 93.6500, platform: 'PROVOR-CTS4', cycle: 95, depthRange: [0, 2000], sensor: 'SBE-41CP CTD', battery: '93%', lastTransmission: '45m ago', basin: 'Andaman Sea', waterMass: 'Andaman Deep Water' },
  { id: 'ARGO-45826', wmo: '2903346', name: 'Equatorial Indian Ocean Float', lat: 1.5000, lon: 80.5000, platform: 'SOLO-II', cycle: 178, depthRange: [0, 2000], sensor: 'SBE-41CP CTD + pH', battery: '72%', lastTransmission: '18m ago', basin: 'Indian Ocean', waterMass: 'Tropical Surface Water' },
  { id: 'ARGO-45827', wmo: '2903347', name: 'Laccadive Sea Boundary Profiler', lat: 8.5000, lon: 74.8000, platform: 'ARVOR-I', cycle: 132, depthRange: [0, 2000], sensor: 'SBE-41CP CTD', battery: '86%', lastTransmission: '3h ago', basin: 'Laccadive Sea', waterMass: 'Mixed Arabian / Bay Water' },
  { id: 'ARGO-45828', wmo: '2903348', name: 'Southern Indian Ocean Subtropical', lat: -25.4000, lon: 85.2000, platform: 'PROVOR-CTS4', cycle: 204, depthRange: [0, 2000], sensor: 'SBE-41CP CTD', battery: '68%', lastTransmission: '4h ago', basin: 'Indian Ocean', waterMass: 'Subtropical Surface Water' },
  { id: 'ARGO-45829', wmo: '2903349', name: 'Southern Ocean Polar Front Float', lat: -55.8000, lon: 75.0000, platform: 'APEX-Deep', cycle: 156, depthRange: [0, 2000], sensor: 'SBE-41CP CTD', battery: '74%', lastTransmission: '5h ago', basin: 'Southern Ocean', waterMass: 'Antarctic Intermediate Water (AAIW)' },
  { id: 'ARGO-45830', wmo: '2903350', name: 'Red Sea Deep Basin Profiler', lat: 21.3000, lon: 38.2000, platform: 'SOLO-II', cycle: 89, depthRange: [0, 2000], sensor: 'SBE-41CP CTD', battery: '95%', lastTransmission: '28m ago', basin: 'Red Sea', waterMass: 'Hypersaline Basin Water' },
  { id: 'ARGO-45831', wmo: '2903351', name: 'Persian Gulf Strait Sentinel', lat: 25.8000, lon: 55.4000, platform: 'ARVOR-I', cycle: 77, depthRange: [0, 2000], sensor: 'SBE-41CP CTD', battery: '82%', lastTransmission: '1h ago', basin: 'Persian Gulf', waterMass: 'Persian Gulf Outflow Plume' },
  { id: 'ARGO-45832', wmo: '2903352', name: 'Somali Current Jet Profiler', lat: 7.2000, lon: 52.8000, platform: 'PROVOR-CTS4', cycle: 161, depthRange: [0, 2000], sensor: 'SBE-41CP CTD', battery: '89%', lastTransmission: '52m ago', basin: 'Arabian Sea', waterMass: 'Somali Upwelling Water' },
  { id: 'ARGO-45833', wmo: '2903353', name: 'Maldives Marine Sanctuary Float', lat: 3.8000, lon: 73.5000, platform: 'APEX-11', cycle: 120, depthRange: [0, 2000], sensor: 'SBE-41CP CTD', battery: '90%', lastTransmission: '38m ago', basin: 'Indian Ocean', waterMass: 'Equatorial Warm Pool' },
  { id: 'ARGO-45834', wmo: '2903354', name: 'Chagos-Laccadive Ridge Float', lat: -6.0000, lon: 72.0000, platform: 'SOLO-II', cycle: 145, depthRange: [0, 2000], sensor: 'SBE-41CP CTD', battery: '85%', lastTransmission: '2h ago', basin: 'Indian Ocean', waterMass: 'Indian Central Water' },
  { id: 'ARGO-45835', wmo: '2903355', name: 'Western Australian Basin Float', lat: -18.5000, lon: 110.2000, platform: 'PROVOR-CTS4', cycle: 99, depthRange: [0, 2000], sensor: 'SBE-41CP CTD', battery: '81%', lastTransmission: '3h ago', basin: 'Indian Ocean', waterMass: 'Leeuwin Current Water' },
  { id: 'ARGO-45836', wmo: '2903356', name: 'Madagascar Channel Profiler', lat: -16.2000, lon: 44.5000, platform: 'APEX-11', cycle: 110, depthRange: [0, 2000], sensor: 'SBE-41CP CTD', battery: '78%', lastTransmission: '4h ago', basin: 'Indian Ocean', waterMass: 'Agulhas Eddy Source Water' },
  { id: 'ARGO-45837', wmo: '2903357', name: 'South China Sea Basal Float', lat: 14.5000, lon: 114.2000, platform: 'SOLO-II', cycle: 135, depthRange: [0, 2000], sensor: 'SBE-41CP CTD', battery: '87%', lastTransmission: '1h ago', basin: 'South China Sea', waterMass: 'South China Sea Intermediate' },
  { id: 'ARGO-45838', wmo: '2903358', name: 'Mariana Trench Abyssal Sentinel', lat: 11.3500, lon: 142.2000, platform: 'APEX-Deep', cycle: 210, depthRange: [0, 2000], sensor: 'SBE-41CP CTD + Deep CTD', battery: '65%', lastTransmission: '30m ago', basin: 'Pacific Ocean', waterMass: 'Pacific Deep Abyssal Water' },
  { id: 'ARGO-45839', wmo: '2903359', name: 'North Atlantic Subpolar Gyre', lat: 56.4000, lon: -32.5000, platform: 'PROVOR-CTS4', cycle: 180, depthRange: [0, 2000], sensor: 'SBE-41CP CTD', battery: '76%', lastTransmission: '2h ago', basin: 'North Atlantic Ocean', waterMass: 'North Atlantic Deep Water (NADW)' },
  { id: 'ARGO-45840', wmo: '2903360', name: 'Gulf Stream Boundary Float', lat: 34.2000, lon: -72.8000, platform: 'SOLO-II', cycle: 150, depthRange: [0, 2000], sensor: 'SBE-41CP CTD', battery: '83%', lastTransmission: '1h ago', basin: 'North Atlantic Ocean', waterMass: 'Subtropical Underwater' }
];

let argoEntities = [];
let selectedArgoHalo = null;
let activeOceanProfile = null;
let activeGraphParam = 'temp';
let activeProfileTab = 'overview';
let activeComparisonStationKey = 'bay_of_bengal';

function initArgoFloatNetwork() {
  if (!viewer || argoEntities.length > 0) return;

  selectedArgoHalo = viewer.entities.add({
    name: 'Selected Argo Halo',
    position: Cesium.Cartesian3.ZERO,
    show: false,
    point: {
      pixelSize: new Cesium.CallbackProperty(() => 26 + 8 * Math.sin(Date.now() / 200), false),
      color: new Cesium.CallbackProperty(() => {
        const alpha = Math.max(0.1, 0.35 + 0.2 * Math.sin(Date.now() / 200));
        return Cesium.Color.fromCssColorString('#7DD3FC').withAlpha(alpha);
      }, false),
      outlineColor: Cesium.Color.fromCssColorString('#38BDF8'),
      outlineWidth: 2,
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    }
  });

  ARGO_FLOAT_NETWORK.forEach(float => {
    const pos = Cesium.Cartesian3.fromDegrees(float.lon, float.lat, 0);
    const entity = viewer.entities.add({
      name: float.id,
      position: pos,
      point: {
        pixelSize: 9,
        color: Cesium.Color.fromCssColorString('#7DD3FC'),
        outlineColor: Cesium.Color.fromCssColorString('#0B1014'),
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      },
      label: {
        text: float.id,
        font: '700 9px JetBrains Mono, monospace',
        fillColor: Cesium.Color.fromCssColorString('#A8C7FA'),
        outlineColor: Cesium.Color.fromCssColorString('#0B1014'),
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, -14),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 15000000),
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      }
    });
    entity._argoData = float;
    argoEntities.push(entity);
  });

  const isLayerActive = $('layerArgoFloats') ? $('layerArgoFloats').checked : true;
  toggleArgoLayer(isLayerActive);
}

function toggleArgoLayer(visible) {
  argoEntities.forEach(e => { e.show = visible; });
  if (selectedArgoHalo && !visible) {
    selectedArgoHalo.show = false;
  }
  toast(visible ? 'Argo float network active (20 global floats)' : 'Argo float network hidden');
}

/* ---- Thermocline Detection Algorithm ---- */
function detectThermocline(sample) {
  if (!sample || !sample.ocn) {
    return { top: 50, bottom: 200, peakGrad: 0.08, tempDrop: 14.0, isStratified: true };
  }
  const o = sample.ocn;
  const depths = [0, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 600, 800, 1000];
  const temps = depths.map(d => o.ts(d).t);

  let maxGrad = 0;
  let top = null;
  let bottom = null;

  for (let i = 0; i < depths.length - 1; i++) {
    const dz = depths[i + 1] - depths[i];
    const dt = Math.abs(temps[i] - temps[i + 1]);
    const grad = dt / dz;
    if (grad > maxGrad) {
      maxGrad = grad;
    }
    if (grad >= 0.025 && top === null) {
      top = depths[i];
    }
    if (top !== null && grad < 0.020 && bottom === null && depths[i] > top) {
      bottom = depths[i + 1];
    }
  }

  top = top || 45;
  bottom = bottom || Math.max(160, top + 110);
  const tempDrop = Math.abs(o.ts(top).t - o.ts(bottom).t);

  return {
    top,
    bottom,
    peakGrad: maxGrad > 0 ? maxGrad : 0.065,
    tempDrop,
    isStratified: maxGrad >= 0.02
  };
}

/* ---- Thermal Gradient & Anomaly Calculations ---- */
function calculateThermalGradient(sample) {
  if (!sample || !sample.ocn) return { deltaT: 22.0, category: 'Tropical' };
  const o = sample.ocn;
  const tSurf = o.ts(0).t;
  const tDeep = o.ts(2000).t;
  const deltaT = Math.max(0, tSurf - tDeep);

  let category = 'Tropical';
  if (deltaT < 4) category = 'Polar (<4°C)';
  else if (deltaT < 14) category = 'Temperate (4–14°C)';
  else if (deltaT < 22) category = 'Tropical (14–22°C)';
  else category = 'Extreme (>22°C)';

  return { deltaT, category, tSurf, tDeep };
}

function calculateDepthAnomalies(sample) {
  if (!sample || !sample.ocn) return [];
  const o = sample.ocn;
  const checkDepths = [0, 100, 500, 2000];
  const baselines = {
    0: o.sst,
    100: Math.max(16, o.sst - 6),
    500: 10.5,
    2000: 3.2
  };

  return checkDepths.map(d => {
    const val = o.ts(d).t;
    const base = baselines[d];
    const diff = Number((val - base).toFixed(2));
    let status = 'norm';
    let arrow = '→';
    if (diff >= 0.3) { status = 'warm'; arrow = '↑'; }
    else if (diff <= -0.3) { status = 'cold'; arrow = '↓'; }
    return { depth: d, val, base, diff, status, arrow };
  });
}

/* ---- Inverted Scientific Depth Chart SVG Generator ---- */
function renderInvertedScientificChart(sample, param = 'temp', compareSample = null) {
  if (!sample || !sample.ocn) return '';
  const oA = sample.ocn;
  const oB = compareSample ? compareSample.ocn : null;
  const therm = detectThermocline(sample);

  const W = 340, H = 240;
  const padL = 42, padR = 20, padT = 24, padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const maxDepth = 2000;

  const yForDepth = d => padT + (Math.min(maxDepth, Math.max(0, d)) / maxDepth) * plotH;

  let minVal = 0, maxVal = 32, unit = '°C', label = 'Temperature';
  if (param === 'sal') {
    minVal = 32.0; maxVal = 40.0; unit = 'PSU'; label = 'Salinity';
  } else if (param === 'pres') {
    minVal = 0; maxVal = 210; unit = 'bar'; label = 'Pressure';
  }

  const depths = [0, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 600, 800, 1000, 1200, 1600, 2000];
  const getVal = (o, d) => {
    if (!o) return 0;
    if (param === 'temp') return o.ts(d).t;
    if (param === 'sal') return o.ts(d).s;
    if (param === 'pres') return d / 10;
    return 0;
  };

  const valsA = depths.map(d => getVal(oA, d));
  const valsB = oB ? depths.map(d => getVal(oB, d)) : [];
  const allVals = valsA.concat(valsB);
  if (param === 'sal') {
    minVal = Math.floor(Math.min(...allVals) - 0.5);
    maxVal = Math.ceil(Math.max(...allVals) + 0.5);
  }

  const xForVal = v => padL + Math.max(0, Math.min(plotW, ((v - minVal) / (maxVal - minVal)) * plotW));

  const ptsA = depths.map((d, i) => `${xForVal(valsA[i]).toFixed(1)},${yForDepth(d).toFixed(1)}`).join(' ');
  const ptsB = oB ? depths.map((d, i) => `${xForVal(valsB[i]).toFixed(1)},${yForDepth(d).toFixed(1)}`).join(' ') : '';

  const depthTicks = [0, 500, 1000, 1500, 2000];
  const hGrid = depthTicks.map(d => `
    <line x1="${padL}" y1="${yForDepth(d)}" x2="${padL + plotW}" y2="${yForDepth(d)}" stroke="#30343A" stroke-width="0.8" stroke-dasharray="2 3"/>
    <text x="${padL - 6}" y="${yForDepth(d) + 3}" fill="#9AA0A6" font-size="7.5" font-family="var(--mono)" text-anchor="end">${d}m</text>
  `).join('');

  const xSteps = 4;
  let vGrid = '';
  for (let i = 0; i <= xSteps; i++) {
    const v = minVal + (i / xSteps) * (maxVal - minVal);
    const x = xForVal(v);
    vGrid += `
      <line x1="${x}" y1="${padT}" x2="${x}" y2="${padT + plotH}" stroke="#30343A" stroke-width="0.6" stroke-dasharray="2 3"/>
      <text x="${x}" y="${H - 10}" fill="#9AA0A6" font-size="7.5" font-family="var(--mono)" text-anchor="middle">${v.toFixed(param === 'sal' ? 1 : 0)}</text>
    `;
  }

  let thermBand = '';
  if (param === 'temp' && therm.isStratified) {
    const yT = yForDepth(therm.top);
    const yB = yForDepth(therm.bottom);
    thermBand = `
      <rect x="${padL}" y="${yT}" width="${plotW}" height="${Math.max(2, yB - yT)}" fill="rgba(242, 139, 130, 0.10)" stroke="rgba(242, 139, 130, 0.35)" stroke-dasharray="3 3" rx="2"/>
      <text x="${padL + 6}" y="${yT + 11}" fill="#F28B82" font-size="7.5" font-family="var(--mono)" font-weight="600">Thermocline (${therm.top}–${therm.bottom}m)</text>
    `;
  }

  return `
    <svg class="scientific-chart-svg" id="scientificChartSvg" viewBox="0 0 ${W} ${H}" data-min="${minVal}" data-max="${maxVal}" data-param="${param}" data-unit="${unit}">
      <rect x="${padL}" y="${padT}" width="${plotW}" height="${plotH}" fill="none" stroke="#30343A" stroke-width="1"/>
      ${thermBand}
      ${hGrid}
      ${vGrid}
      
      <polyline fill="none" stroke="#F28B82" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" points="${ptsA}"/>
      ${ptsB ? `<polyline fill="none" stroke="#7DD3FC" stroke-width="2.0" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="4 2" points="${ptsB}"/>` : ''}

      <g id="chartProbeGroup" style="display: none;">
        <line id="probeHLine" x1="${padL}" y1="${padT}" x2="${padL + plotW}" y2="${padT}" stroke="#A8C7FA" stroke-width="1.2" stroke-dasharray="3 2"/>
        <line id="probeVLine" x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + plotH}" stroke="#A8C7FA" stroke-width="1.2" stroke-dasharray="3 2"/>
        <circle id="probeMarkerA" cx="0" cy="0" r="4" fill="#F28B82" stroke="#FFFFFF" stroke-width="1.5"/>
        ${ptsB ? `<circle id="probeMarkerB" cx="0" cy="0" r="3.5" fill="#7DD3FC" stroke="#FFFFFF" stroke-width="1.5"/>` : ''}
      </g>
      
      <text x="${W - padR}" y="${H - 10}" fill="#8AB4F8" font-size="7.5" font-family="var(--mono)" font-weight="600" text-anchor="end">${unit}</text>
      <text x="${padL}" y="${padT - 8}" fill="#9AA0A6" font-size="8" font-family="var(--mono)" font-weight="600">Depth (0m → 2000m)</text>
    </svg>
  `;
}

function attachChartProbeHover() {
  const svg = $('scientificChartSvg');
  if (!svg || !activeOceanProfile) return;

  const probeGroup = $('chartProbeGroup');
  const hLine = $('probeHLine');
  const vLine = $('probeVLine');
  const markerA = $('probeMarkerA');
  const probeText = $('probeText');

  const W = 340, H = 240;
  const padL = 42, padR = 20, padT = 24, padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const maxDepth = 2000;

  const minVal = parseFloat(svg.getAttribute('data-min'));
  const maxVal = parseFloat(svg.getAttribute('data-max'));
  const param = svg.getAttribute('data-param');
  const unit = svg.getAttribute('data-unit');

  svg.addEventListener('mousemove', e => {
    const rect = svg.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const svgX = (e.clientX - rect.left) * scaleX;
    const svgY = (e.clientY - rect.top) * scaleY;

    if (svgX < padL || svgX > padL + plotW || svgY < padT || svgY > padT + plotH) {
      if (probeGroup) probeGroup.style.display = 'none';
      return;
    }

    if (probeGroup) probeGroup.style.display = 'block';

    const depth = Math.max(0, Math.min(maxDepth, ((svgY - padT) / plotH) * maxDepth));
    const wc = waterColumnAt(activeOceanProfile, depth);
    let valA = 0;
    if (param === 'temp') valA = wc.t;
    else if (param === 'sal') valA = wc.s;
    else if (param === 'pres') valA = depth / 10;

    const xA = padL + Math.max(0, Math.min(plotW, ((valA - minVal) / (maxVal - minVal)) * plotW));
    const yA = padT + (depth / maxDepth) * plotH;

    if (hLine) {
      hLine.setAttribute('y1', yA);
      hLine.setAttribute('y2', yA);
    }
    if (vLine) {
      vLine.setAttribute('x1', xA);
      vLine.setAttribute('x2', xA);
    }
    if (markerA) {
      markerA.setAttribute('cx', xA);
      markerA.setAttribute('cy', yA);
    }

    if (probeText) {
      probeText.textContent = `Depth: -${Math.round(depth)}m | ${param.toUpperCase()}: ${valA.toFixed(2)} ${unit} | Density: ${wc.sigma.toFixed(2)} kg/m³ | Sound: ${Math.round(wc.c)} m/s`;
    }
  });

  svg.addEventListener('mouseleave', () => {
    if (probeGroup) probeGroup.style.display = 'none';
    if (probeText) {
      probeText.textContent = 'Hover cursor over graph to probe telemetry at any depth';
    }
  });
}

/* ---- Thermal Column Generator ---- */
function renderThermalColumn(sample) {
  if (!sample || !sample.ocn) return '';
  const o = sample.ocn;
  const colDepths = [
    { d: 0, zone: 'Epipelagic Surface' },
    { d: 100, zone: 'Euphotic Floor' },
    { d: 250, zone: 'Thermocline Core' },
    { d: 500, zone: 'Mesopelagic Twilight' },
    { d: 1000, zone: 'Intermediate Water' },
    { d: 1500, zone: 'Bathypelagic Transition' },
    { d: 2000, zone: 'Abyssal Bathypelagic' }
  ];

  const getColor = t => {
    if (t >= 26) return '#F28B82';
    if (t >= 20) return '#F9AB00';
    if (t >= 12) return '#7DD3FC';
    if (t >= 6) return '#8AB4F8';
    return '#3B82F6';
  };

  return colDepths.map(item => {
    const wc = waterColumnAt(sample, item.d);
    const color = getColor(wc.t);
    return `
      <div class="thermal-col-segment" style="--seg-color: ${color};">
        <div class="thermal-col-left">
          <span class="thermal-col-depth">-${item.d} m</span>
          <span class="thermal-col-zone">${item.zone}</span>
        </div>
        <div class="thermal-col-right">
          <span class="thermal-col-temp">${wc.t.toFixed(2)} °C</span>
          <span class="thermal-col-sal">${wc.s.toFixed(2)} PSU</span>
          <span class="thermal-col-zone" style="font-size: 0.52rem;">σθ ${wc.sigma.toFixed(1)}</span>
        </div>
      </div>
    `;
  }).join('');
}

/* ---- Location Comparison Engine ---- */
const COMPARISON_PRESETS = {
  bay_of_bengal: { name: 'Bay of Bengal (Northern Basin)', lat: 17.85, lon: 88.35, sst: 28.5 },
  arabian_sea: { name: 'Arabian Sea (High Salinity)', lat: 15.42, lon: 72.84, sst: 28.2 },
  southern_ocean: { name: 'Southern Ocean (Antarctic Polar)', lat: -55.80, lon: 75.00, sst: 1.8 },
  red_sea: { name: 'Red Sea (Hypersaline Trench)', lat: 21.30, lon: 38.20, sst: 30.1 },
  mariana: { name: 'Mariana Deep Basin', lat: 11.35, lon: 142.20, sst: 28.9 }
};

function getComparisonSample(key) {
  const p = COMPARISON_PRESETS[key] || COMPARISON_PRESETS.bay_of_bengal;
  const fake = {
    lat: p.lat,
    lon: p.lon,
    name: p.name,
    isLand: false,
    marine: { sea_surface_temperature: p.sst },
    air: { temperature_2m: p.sst, wind_speed_10m: 18 }
  };
  attachOceanography(fake);
  return fake;
}

function renderComparisonSection(sampleA, stationBKey = 'bay_of_bengal') {
  if (!sampleA || !sampleA.ocn) return;
  const sampleB = getComparisonSample(stationBKey);

  const oA = sampleA.ocn;
  const oB = sampleB.ocn;

  const tSurfA = oA.ts(0).t;
  const tSurfB = oB.ts(0).t;
  const tDeepA = oA.ts(2000).t;
  const tDeepB = oB.ts(2000).t;

  const thA = detectThermocline(sampleA);
  const thB = detectThermocline(sampleB);

  const gradA = calculateThermalGradient(sampleA).deltaT;
  const gradB = calculateThermalGradient(sampleB).deltaT;

  const sSurfA = oA.ts(0).s;
  const sSurfB = oB.ts(0).s;

  const nameA = sampleA.name || (activeOceanProfile ? activeOceanProfile.id : 'Station A');
  const nameB = sampleB.name;

  if ($('cmpStationAName')) $('cmpStationAName').textContent = nameA;

  const tableWrapper = $('compareTableWrapper');
  if (tableWrapper) {
    tableWrapper.innerHTML = `
      <table class="compare-table">
        <thead>
          <tr>
            <th>Parameter</th>
            <th style="color: var(--temp-highlight);">${nameA.substring(0, 14)}</th>
            <th style="color: var(--cyan-salinity);">${nameB.substring(0, 14)}</th>
            <th>Delta (A - B)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Surface Temp</td>
            <td>${tSurfA.toFixed(1)} °C</td>
            <td>${tSurfB.toFixed(1)} °C</td>
            <td style="color: ${tSurfA - tSurfB >= 0 ? 'var(--temp-highlight)' : 'var(--blue-accent)'};">${(tSurfA - tSurfB >= 0 ? '+' : '')}${(tSurfA - tSurfB).toFixed(1)} °C</td>
          </tr>
          <tr>
            <td>Deep Temp (2km)</td>
            <td>${tDeepA.toFixed(1)} °C</td>
            <td>${tDeepB.toFixed(1)} °C</td>
            <td>${(tDeepA - tDeepB >= 0 ? '+' : '')}${(tDeepA - tDeepB).toFixed(1)} °C</td>
          </tr>
          <tr>
            <td>Thermal ΔT</td>
            <td>${gradA.toFixed(1)} °C</td>
            <td>${gradB.toFixed(1)} °C</td>
            <td>${(gradA - gradB >= 0 ? '+' : '')}${(gradA - gradB).toFixed(1)} °C</td>
          </tr>
          <tr>
            <td>Thermocline Depth</td>
            <td>${thA.top}–${thA.bottom} m</td>
            <td>${thB.top}–${thB.bottom} m</td>
            <td>${thA.top - thB.top} m</td>
          </tr>
          <tr>
            <td>Surface Salinity</td>
            <td>${sSurfA.toFixed(2)} PSU</td>
            <td>${sSurfB.toFixed(2)} PSU</td>
            <td>${(sSurfA - sSurfB >= 0 ? '+' : '')}${(sSurfA - sSurfB).toFixed(2)}</td>
          </tr>
          <tr>
            <td>Water Mass</td>
            <td style="font-size: 0.54rem;">${oA.ts(0).t > 24 ? oA.basin : 'Temperate/Polar'}</td>
            <td style="font-size: 0.54rem;">${sampleB.basin || sampleB.name}</td>
            <td>—</td>
          </tr>
        </tbody>
      </table>
    `;
  }

  const chartContainer = $('compareChartContainer');
  if (chartContainer) {
    chartContainer.innerHTML = renderInvertedScientificChart(sampleA, 'temp', sampleB);
  }
}

/* ---- Ocean Profile Loader ---- */
function loadOceanProfile(sample, argoData = null) {
  if (!sample) return;
  activeOceanProfile = sample;

  const idEl = $('profStationId');
  const badgeEl = $('profPlatformBadge');
  const coordsEl = $('profCoords');
  const waterMassEl = $('profWaterMass');
  const argoStatusEl = $('profArgoStatus');

  if (argoData) {
    if (idEl) idEl.textContent = argoData.id;
    if (badgeEl) badgeEl.textContent = `${argoData.platform} · WMO ${argoData.wmo}`;
    if (coordsEl) coordsEl.textContent = fmtCoord(argoData.lat, argoData.lon);
    if (waterMassEl) waterMassEl.textContent = argoData.waterMass;
    if (argoStatusEl) argoStatusEl.textContent = `Cycle #${argoData.cycle} · Battery: ${argoData.battery} · Sensor: ${argoData.sensor}`;
  } else {
    if (idEl) idEl.textContent = sample.name ? sample.name.substring(0, 18).toUpperCase() : 'OCEAN-STATION';
    if (badgeEl) badgeEl.textContent = 'GEOSPATIAL PROFILER';
    if (coordsEl) coordsEl.textContent = fmtCoord(sample.lat, sample.lon);
    if (waterMassEl) waterMassEl.textContent = sample.ocn ? sample.ocn.basin + ' Water' : 'Marine Water Mass';
    if (argoStatusEl) argoStatusEl.textContent = 'Active In-Situ Satellite Telemetry Stream';
  }

  const snapGrid = $('profSnapshotGrid');
  if (snapGrid && sample.ocn) {
    const o = sample.ocn;
    const tSurf = o.ts(0).t;
    const tDeep = o.ts(2000).t;
    const grad = calculateThermalGradient(sample);
    const sSurf = o.ts(0).s;
    const sDeep = o.ts(2000).s;
    const presDeep = 200;

    snapGrid.innerHTML = `
      ${metric('Surface Temp', tSurf.toFixed(1), '°C', 'var(--temp)', 'Epipelagic 0m', SVG_ICONS.temp)}
      ${metric('Deep Temp', tDeep.toFixed(1), '°C', 'var(--temp)', 'Bathypelagic 2000m', SVG_ICONS.temp)}
      ${metric('Depth Range', '0–2000', 'm', 'var(--cyan)', 'Standard CTD cast', SVG_ICONS.alt)}
      ${metric('Thermal ΔT', grad.deltaT.toFixed(1), '°C', 'var(--temp-highlight)', grad.category, SVG_ICONS.balance)}
      ${metric('Salinity SSS', sSurf.toFixed(2), 'PSU', 'var(--cyan-salinity)', `2km: ${sDeep.toFixed(2)} PSU`, SVG_ICONS.salinity)}
      ${metric('Hydrostatic P', presDeep, 'bar', 'var(--curr)', 'At 2,000m floor', SVG_ICONS.pressure)}
    `;
  }

  const grad = calculateThermalGradient(sample);
  if ($('profGradientVal')) $('profGradientVal').textContent = `${grad.deltaT.toFixed(1)} °C (${grad.category})`;
  const pin = $('thermalGaugePin');
  if (pin) {
    const pct = Math.max(2, Math.min(98, (grad.deltaT / 28) * 100));
    pin.style.left = `${pct}%`;
  }

  const therm = detectThermocline(sample);
  if ($('thermTop')) $('thermTop').textContent = `${therm.top} m`;
  if ($('thermBottom')) $('thermBottom').textContent = `${therm.bottom} m`;
  if ($('thermDrop')) $('thermDrop').textContent = `-${therm.tempDrop.toFixed(1)} °C`;
  if ($('thermGrad')) $('thermGrad').textContent = `-${therm.peakGrad.toFixed(3)} °C/m`;
  if ($('thermoclineStatusBadge')) {
    $('thermoclineStatusBadge').textContent = therm.isStratified ? 'Stratified' : 'Well-Mixed';
  }
  if ($('thermNote')) {
    $('thermNote').innerHTML = therm.isStratified
      ? `<span>Strong thermocline barrier detected between <b>${therm.top}m</b> and <b>${therm.bottom}m</b> with maximum vertical cooling rate of <b>${(therm.peakGrad * 100).toFixed(1)}°C per 100m</b>.</span>`
      : `<span>Weak vertical stratification observed in the upper 1,000 meters.</span>`;
  }

  const anomGrid = $('profAnomalyGrid');
  if (anomGrid) {
    const anoms = calculateDepthAnomalies(sample);
    anomGrid.innerHTML = anoms.map(a => `
      <div class="anomaly-chip ${a.status}">
        <small>${a.depth === 0 ? 'Surface' : a.depth + 'm'}</small>
        <b>${a.arrow} ${(a.diff >= 0 ? '+' : '')}${a.diff.toFixed(1)}°C</b>
      </div>
    `).join('');
  }

  const chartCont = $('scientificChartContainer');
  if (chartCont) {
    chartCont.innerHTML = renderInvertedScientificChart(sample, activeGraphParam);
    attachChartProbeHover();
  }

  const colWrap = $('thermalColumnWrapper');
  if (colWrap) {
    colWrap.innerHTML = renderThermalColumn(sample);
  }

  renderComparisonSection(sample, activeComparisonStationKey);
}

function selectArgoFloat(argo, autoFly = true) {
  if (!argo) return;

  if (selectedArgoHalo) {
    selectedArgoHalo.position = Cesium.Cartesian3.fromDegrees(argo.lon, argo.lat, 0);
    selectedArgoHalo.show = true;
  }

  const sample = {
    lat: argo.lat,
    lon: argo.lon,
    name: argo.name,
    isLand: false,
    marine: {
      sea_surface_temperature: 28.4 - Math.abs(argo.lat) * 0.25,
      wave_height: 1.4,
      ocean_current_velocity: 1.8,
      ocean_current_direction: 145
    },
    air: {
      temperature_2m: 28.2 - Math.abs(argo.lat) * 0.25,
      wind_speed_10m: 16,
      wind_direction_10m: 120,
      surface_pressure: 1012
    }
  };
  attachOceanography(sample);
  lastSample = sample;

  loadOceanProfile(sample, argo);
  toggleOceanProfilePanel(true);

  if (autoFly && viewer) {
    flyTo(argo.lat, argo.lon, 600000, 2.2);
    toast(`Argo Float ${argo.id} Selected (${argo.name})`);
  }
}

function toggleOceanProfilePanel(forceState) {
  const p = $('oceanProfilePanel');
  if (!p) return;
  const willBeCollapsed = typeof forceState === 'boolean' ? !forceState : !p.classList.contains('collapsed');
  p.classList.toggle('collapsed', willBeCollapsed);

  const toggleBtn = $('oceanProfileToggle');
  if (toggleBtn) {
    toggleBtn.setAttribute('aria-expanded', String(!willBeCollapsed));
    toggleBtn.classList.toggle('active', !willBeCollapsed);
  }

  const btnGlobe = $('btnModeGlobe');
  const btnProfile = $('btnModeProfile');
  if (btnGlobe && btnProfile) {
    btnGlobe.classList.toggle('active', willBeCollapsed);
    btnProfile.classList.toggle('active', !willBeCollapsed);
    if (!willBeCollapsed) {
      btnProfile.querySelector('.mode-icon').textContent = '◉';
      btnGlobe.querySelector('.mode-icon').textContent = '○';
    } else {
      btnGlobe.querySelector('.mode-icon').textContent = '◉';
      btnProfile.querySelector('.mode-icon').textContent = '○';
    }
  }

  if (!willBeCollapsed && !activeOceanProfile) {
    if (lastSample && !lastSample.isLand) {
      loadOceanProfile(lastSample);
    } else {
      selectArgoFloat(ARGO_FLOAT_NETWORK[0], false);
    }
  }
}

// Subnav Tabs Wiring
document.querySelectorAll('.prof-tab-btn').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.prof-tab-btn').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeProfileTab = tab.getAttribute('data-tab');

    document.querySelectorAll('.prof-tab-pane').forEach(pane => pane.classList.remove('active'));
    if (activeProfileTab === 'overview') $('paneOverview')?.classList.add('active');
    else if (activeProfileTab === 'graph') $('paneGraph')?.classList.add('active');
    else if (activeProfileTab === 'column') $('paneColumn')?.classList.add('active');
    else if (activeProfileTab === 'compare') $('paneCompare')?.classList.add('active');
  });
});

// Parameter Switcher Wiring
document.querySelectorAll('.param-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.param-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeGraphParam = btn.getAttribute('data-param') || 'temp';
    if (activeOceanProfile) {
      const chartCont = $('scientificChartContainer');
      if (chartCont) {
        chartCont.innerHTML = renderInvertedScientificChart(activeOceanProfile, activeGraphParam);
        attachChartProbeHover();
      }
    }
  });
});

// View Mode Switcher Buttons
if ($('btnModeGlobe')) {
  $('btnModeGlobe').onclick = () => toggleOceanProfilePanel(false);
}
if ($('btnModeProfile')) {
  $('btnModeProfile').onclick = () => toggleOceanProfilePanel(true);
}
if ($('oceanProfileToggle')) {
  $('oceanProfileToggle').onclick = () => toggleOceanProfilePanel();
}
if ($('btnProfClose')) {
  $('btnProfClose').onclick = () => toggleOceanProfilePanel(false);
}

// Comparison Preset Selector
if ($('cmpStationBSel')) {
  $('cmpStationBSel').onchange = e => {
    activeComparisonStationKey = e.target.value;
    if (activeOceanProfile) {
      renderComparisonSection(activeOceanProfile, activeComparisonStationKey);
    }
  };
}

// Ocean Profile Footer Buttons
if ($('btnProfLock')) {
  $('btnProfLock').onclick = e => {
    locked = !locked;
    e.currentTarget.classList.toggle('active', locked);
    toast(locked ? 'Profile locked to active station' : 'Profile unlocked — tracking selection');
  };
}
if ($('btnProfFly')) {
  $('btnProfFly').onclick = () => {
    if (!activeOceanProfile) return toast('No station loaded');
    flyTo(activeOceanProfile.lat, activeOceanProfile.lon, 600000, 2.2);
    toast(`Flying to ${activeOceanProfile.name || 'Station'}`);
  };
}
if ($('btnProfCopy')) {
  $('btnProfCopy').onclick = async () => {
    if (!activeOceanProfile || !activeOceanProfile.ocn) return toast('No ocean profile to copy');
    const s = activeOceanProfile;
    const o = s.ocn;
    const th = detectThermocline(s);
    const grad = calculateThermalGradient(s);

    const txt =
      `OceanXplore Scientific Ocean Profile Report\n` +
      `Station    : ${s.name || 'Argo Profile'}\n` +
      `Coords     : ${fmtCoord(s.lat, s.lon)}\n` +
      `Water Mass : ${o.basin} (${o.note})\n` +
      `Surface SST: ${o.ts(0).t.toFixed(2)} °C | SSS: ${o.ts(0).s.toFixed(2)} PSU\n` +
      `Deep 2000m : ${o.ts(2000).t.toFixed(2)} °C | Sal: ${o.ts(2000).s.toFixed(2)} PSU\n` +
      `Thermal ΔT : ${grad.deltaT.toFixed(2)} °C (${grad.category})\n` +
      `Thermocline: ${th.top}m to ${th.bottom}m (Drop: -${th.tempDrop.toFixed(2)} °C, Peak Grad: -${th.peakGrad.toFixed(3)} °C/m)\n` +
      `MLD        : ${o.mld} m ${o.blt ? `(+${o.blt}m barrier layer)` : ''}\n` +
      `Generated  : ${new Date().toISOString()}`;

    try {
      await navigator.clipboard.writeText(txt);
      toast('Scientific CTD report copied to clipboard');
    } catch (e) {
      toast('Clipboard blocked by browser');
    }
  };
}
