/* ==================================================================
   OceanXplore — Marine Command Platform
   Interactive Marine Mapping System & 3D Geospatial Engine
   ================================================================== */

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
    btnExplore.classList.remove('status-idle');
    btnExplore.classList.add('status-loading');
    btnExplore.disabled = true;
    if (statusEl) statusEl.textContent = 'Synchronizing 3D telemetry…';

    setTimeout(() => {
      btnExplore.classList.remove('status-loading');
      btnExplore.classList.add('status-success');
      if (statusEl) statusEl.textContent = 'Ready • Launching Explorer';

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
  if (!t) return;
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('on'), 2200);
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
let locationHighlightIndicator = null, locationHighlightHalo = null;
let userLocation = null;
let locating = false;
let labelsLayer = null;
let tilesetLabelsLayer = null;
let labelsVisible = true;
let baseImageryLayer = null;

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

  // Enable Ultra-High Resolution Rendering
  try {
    viewer.resolutionScale = window.devicePixelRatio || 1.0;
    viewer.useBrowserRecommendedResolution = false;
  } catch (_) { }

  const scene = viewer.scene;
  scene.backgroundColor = Cesium.Color.fromCssColorString('#02060f');
  scene.globe.enableLighting = false;
  scene.globe.showGroundAtmosphere = true;
  scene.globe.baseColor = Cesium.Color.fromCssColorString('#07223f');
  scene.globe.maximumScreenSpaceError = 1.33;
  scene.skyAtmosphere.show = true;
  scene.fog.enabled = true;
  scene.highDynamicRange = false;
  if (scene.postProcessStages && scene.postProcessStages.fxaa) {
    scene.postProcessStages.fxaa.enabled = true;
  }

  // Camera behaviour limits
  const ssc = scene.screenSpaceCameraController;
  ssc.minimumZoomDistance = MIN_H;
  ssc.maximumZoomDistance = MAX_H;
  ssc.enableCollisionDetection = true;
  ssc.inertiaSpin = 0.85;
  ssc.inertiaZoom = 0.75;
  ssc.inertiaTranslate = 0.85;

  // Base imagery (World Imagery / Natural Earth II)
  (async function addBaseImagery() {
    try {
      baseImageryLayer = await Cesium.ImageryLayer.fromWorldImagery({});
      viewer.imageryLayers.add(baseImageryLayer);
    } catch (e) {
      try {
        const prov = await Cesium.TileMapServiceImageryProvider.fromUrl(
          Cesium.buildModuleUrl('Assets/Textures/NaturalEarthII')
        );
        baseImageryLayer = viewer.imageryLayers.add(new Cesium.ImageryLayer(prov));
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

  // Selected Location Highlight Indicator (Pulsing Cyan Beacon on click)
  locationHighlightIndicator = viewer.entities.add({
    name: 'Selected Location Marker',
    position: Cesium.Cartesian3.ZERO,
    show: false,
    point: {
      pixelSize: new Cesium.CallbackProperty(() => 14 + 3 * Math.sin(Date.now() / 200), false),
      color: Cesium.Color.fromCssColorString('#38BDF8'),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2.5,
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    },
    label: {
      text: 'SELECTED POINT',
      font: '700 10px JetBrains Mono, monospace',
      fillColor: Cesium.Color.fromCssColorString('#A8C7FA'),
      outlineColor: Cesium.Color.fromCssColorString('#02060f'),
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, -22),
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    }
  });

  locationHighlightHalo = viewer.entities.add({
    name: 'Selected Location Halo',
    position: Cesium.Cartesian3.ZERO,
    show: false,
    point: {
      pixelSize: new Cesium.CallbackProperty(() => 32 + 12 * Math.sin(Date.now() / 200), false),
      color: new Cesium.CallbackProperty(() => {
        const alpha = Math.max(0.1, 0.35 + 0.18 * Math.sin(Date.now() / 200));
        return Cesium.Color.fromCssColorString('#38BDF8').withAlpha(alpha);
      }, false),
      outlineColor: Cesium.Color.fromCssColorString('#7DD3FC').withAlpha(0.7),
      outlineWidth: 2,
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
      $('swTiles')?.classList.remove('on');
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
      setCesiumReady();
    } catch (err) {
      console.error('Google 3D Tiles failed:', err);
      showErrorBanner('Google 3D Tiles unavailable — falling back to satellite imagery.');
      $('swTiles')?.classList.remove('on');
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

function applyTilesMode(on) {
  if (!viewer) return;
  if (googleTileset) googleTileset.show = on;
  viewer.scene.globe.show = !on || !googleTileset;
  if (tilesetLabelsLayer) tilesetLabelsLayer.show = labelsVisible;
  if (labelsLayer) labelsLayer.show = labelsVisible;
}

/* ==================================================================
   2b. GOOGLE EARTH BORDERS & LABELS OVERLAY
   ================================================================== */
function initLabelsLayer() {
  if (!viewer) return;

  try {
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

  attachLabelsToTileset();

  const btnTop = $('btnToggleLabels');
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

  if (labelsLayer) labelsLayer.show = labelsVisible;
  if (tilesetLabelsLayer) tilesetLabelsLayer.show = labelsVisible;

  const btnTop = $('btnToggleLabels');
  if (btnTop) {
    btnTop.classList.toggle('on', labelsVisible);
    btnTop.setAttribute('aria-pressed', String(labelsVisible));
  }

  const sw = $('swLabels');
  if (sw) {
    sw.classList.toggle('on', labelsVisible);
    sw.setAttribute('aria-checked', String(labelsVisible));
  }

  toast(labelsVisible ? 'Borders & Labels: Visible' : 'Borders & Labels: Hidden');
}

/* ==================================================================
   3. CAMERA CONTROL LAYER (zoom / tilt / rotate / spin / centre)
   ================================================================== */
let autoRotate = false;

function camHeight() { return viewer ? viewer.camera.positionCartographic.height : HOME.height; }

function centerGlobe(duration = 2.0) {
  if (!viewer) return;
  autoRotate = false;
  $('btnSpin')?.classList.remove('on');
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

function zoomStep(dir) {
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
  if (!zoomRange) return;
  const pct = 100 - (v / 1000) * 100;
  zoomRange.style.background =
    'linear-gradient(90deg, rgba(255,255,255,.12) 0%, rgba(255,255,255,.12) ' + (100 - pct) + '%, var(--cyan) ' + (100 - pct) + '%, var(--cyan) 100%)';
}

if (zoomRange) {
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
}

/* ==================================================================
   3b. TRACKPAD & GESTURE NAVIGATION
   ================================================================== */
const TRACKPAD_ZOOM_SENSITIVITY = 0.005;

function initTrackpadGestures() {
  if (!viewer || !viewer.scene || !viewer.scene.canvas) return;
  const canvas = viewer.scene.canvas;

  canvas.addEventListener('wheel', e => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    if (!viewer) return;
    const h = camHeight();

    let rawDelta = e.deltaY;
    if (isNaN(rawDelta) || !isFinite(rawDelta)) return;
    if (e.deltaMode === 1) rawDelta *= 16;
    else if (e.deltaMode === 2) rawDelta *= 100;

    const clampedDelta = Math.max(-80, Math.min(80, rawDelta));
    if (Math.abs(clampedDelta) < 0.05) return;

    const factor = Math.min(Math.abs(clampedDelta) * TRACKPAD_ZOOM_SENSITIVITY, 0.15);
    const zoomAmount = Math.max(h * factor, 10);

    if (clampedDelta > 0) {
      if (h - zoomAmount >= MIN_H) viewer.camera.zoomIn(zoomAmount);
      else if (h > MIN_H) viewer.camera.zoomIn(h - MIN_H);
    } else {
      if (h + zoomAmount <= MAX_H) viewer.camera.zoomOut(zoomAmount);
      else if (h < MAX_H) viewer.camera.zoomOut(MAX_H - h);
    }
  }, { capture: true, passive: false });
}

initTrackpadGestures();

/* ==================================================================
   4. LAT / LON GRATICULE
   ================================================================== */
let gridEntities = [];

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
   5. OFFLINE OCEAN / LAND CLASSIFIERS & BATHYMETRY MODEL
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

/** Realistic Ocean Bathymetric Depth calculation across Earth's oceans */
function getBathymetryDepth(lat, lon) {
  let n = lon; while (n > 180) n -= 360; while (n < -180) n += 360;

  // Specific Deep Trenches (6000m+)
  if (Math.abs(lat - 11.35) < 3.5 && Math.abs(n - 142.2) < 4.0) return 10924; // Mariana Trench
  if (Math.abs(lat - 10.2) < 3.0 && Math.abs(n - 126.8) < 3.5) return 10540; // Philippine Trench
  if (Math.abs(lat - (-10.5)) < 3.0 && Math.abs(n - 110.0) < 5.0) return 7450; // Java/Sunda Trench
  if (Math.abs(lat - 19.8) < 3.0 && Math.abs(n - (-66.5)) < 4.0) return 8376; // Puerto Rico Trench
  if (Math.abs(lat - (-23.0)) < 3.0 && Math.abs(n - (-175.0)) < 4.0) return 10882; // Tonga Trench

  // Shallow Seas & Gulfs (0–200m / 200–1000m)
  if (lat >= 23 && lat <= 31 && n >= 47 && n <= 57) return 90; // Persian Gulf (very shallow)
  if (lat >= 53 && lat <= 66 && n >= 10 && n <= 30) return 110; // Baltic Sea
  if (lat >= 51 && lat <= 62 && n >= -4 && n <= 9) return 145; // North Sea
  if (lat >= 12 && lat <= 28 && n >= 34 && n <= 43) return 850; // Red Sea axial trough
  if (lat >= 30 && lat <= 45 && n >= -5 && n <= 36) return 1800; // Mediterranean Sea

  // Continental Shelf Margins (close to Indian, Asian, African coasts)
  if (lat >= 8 && lat <= 24 && n >= 69 && n <= 73) return 160; // Mumbai / Gujarat shelf
  if (lat >= 12 && lat <= 22 && n >= 80 && n <= 86) return 180; // Coromandel / Bengal coastal shelf
  if (lat >= 20 && lat <= 23 && n >= 87 && n <= 92) return 95; // Ganges delta mouth

  // Abyssal & Deep Ocean Basins
  const basin = getOfflineOceanName(lat, lon);
  switch (basin) {
    case 'Arabian Sea': return 3450;
    case 'Bay of Bengal': return 2950;
    case 'Indian Ocean': return 4100;
    case 'North Pacific Ocean': return 4800;
    case 'South Pacific Ocean': return 4650;
    case 'North Atlantic Ocean': return 3950;
    case 'South Atlantic Ocean': return 4200;
    case 'Southern Ocean': return 4400;
    case 'Arctic Ocean': return 1650;
    default: return 3800;
  }
}

/* ==================================================================
   6. DATA FETCHING (marine + atmospheric + reverse geocode)
   ================================================================== */
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}

let interactionMode = 'hover'; // 'hover' | 'search'
let selectedSearchResult = null;
const locationCache = new Map();
const marineCache = new Map();
let hoverAbortController = null;
let hoverRequestId = 0;

let activeController = null;

function abortActive() {
  if (activeController) { activeController.abort(); activeController = null; }
}

async function reverseGeocode(lat, lon, signal) {
  const latKey = lat.toFixed(3);
  const lonKey = lon.toFixed(3);
  const cacheKey = `${latKey},${lonKey}`;
  if (locationCache.has(cacheKey)) return locationCache.get(cacheKey);

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat.toFixed(5)}&lon=${lon.toFixed(5)}&zoom=10&addressdetails=1`;
    const r = await fetch(url, {
      signal,
      headers: { 'Accept': 'application/json' }
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();

    if (d && d.address && d.address.country) {
      const country = d.address.country || '';
      const state = d.address.state || d.address.region || d.address.province || d.address.state_district || '';
      const city = d.address.city || d.address.town || d.address.village || d.address.suburb || d.address.county || '';

      const parts = [];
      if (city && city !== country) parts.push(city);
      if (state && state !== country && !parts.includes(state)) parts.push(state);
      if (country) parts.push(country);

      const res = {
        isLand: true,
        country,
        state,
        city,
        name: parts.length ? parts.join(', ') : (country || getOfflineLandRegion(lat, lon)),
        landLocation: parts.length ? parts.join(', ') : getOfflineLandRegion(lat, lon),
        oceanName: ''
      };
      locationCache.set(cacheKey, res);
      return res;
    }

    // Water / Ocean coordinates
    const oceanName = (d && d.name) || getOfflineOceanName(lat, lon);
    const res = {
      isLand: false,
      country: '',
      state: '',
      city: '',
      name: oceanName,
      landLocation: '',
      oceanName: oceanName || getOfflineOceanName(lat, lon)
    };
    locationCache.set(cacheKey, res);
    return res;
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    // Fallback: offline ocean/sea classifier
    const oceanName = getOfflineOceanName(lat, lon);
    const res = {
      isLand: false,
      country: '',
      state: '',
      city: '',
      name: oceanName,
      landLocation: getOfflineLandRegion(lat, lon),
      oceanName
    };
    locationCache.set(cacheKey, res);
    return res;
  }
}

/* ==================================================================
   6b. OCEANOGRAPHY ENGINE — SALINITY-COUPLED WATER-COLUMN PHYSICS
   ================================================================== */
function climatologicalSSS(lat, lon) {
  let n = lon; while (n > 180) n -= 360; while (n < -180) n += 360;
  const month = new Date().getUTCMonth() + 1;
  const basin = getOfflineOceanName(lat, n);
  const al = Math.abs(lat);

  let s = 34.55
    + 1.85 * Math.exp(-Math.pow((al - 24) / 13, 2))
    - 0.85 * Math.exp(-Math.pow(lat / 6, 2))
    - 1.60 * Math.exp(-Math.pow((al - 62) / 12, 2));
  let note = 'Zonal surface climatology';

  switch (basin) {
    case 'Red Sea': s = 38.9 + Math.max(0, lat - 12) * 0.13; note = 'Hypersaline basin'; break;
    case 'Persian Gulf': s = 39.4 + Math.max(0, n - 47) * 0.20; note = 'Hypersaline gulf'; break;
    case 'Arabian Sea': s = 35.55 + Math.max(0, lat - 8) * 0.080; note = 'Arabian Sea High-Salinity Water'; break;
    case 'Bay of Bengal': {
      const north = Math.max(0, Math.min(1, (lat - 8) / 15));
      const monsoon = (month >= 7 && month <= 11) ? 1 : 0.35;
      s = 34.25 - 2.90 * north - 0.90 * north * monsoon;
      note = 'Ganges–Brahmaputra freshwater plume'; break;
    }
    case 'Andaman Sea': s = 32.6; note = 'River influence'; break;
    case 'Mediterranean Sea': s = 37.4 + Math.max(0, n) * 0.045; note = 'Evaporative basin'; break;
    case 'Arctic Ocean': s = 31.0; note = 'Ice-melt dilution'; break;
    case 'Southern Ocean': s = 33.9; note = 'Antarctic surface water'; break;
    case 'North Atlantic Ocean': s = 35.5; note = 'Subtropical Atlantic'; break;
    default: break;
  }
  return { sss: Math.max(2, Math.min(42, s)), note, basin };
}

function estimateMLD(sss, windKmh, lat) {
  const w = (windKmh == null || isNaN(windKmh)) ? 18 : Number(windKmh);
  let mld = 18 + 1.45 * w;
  const haline = Math.min(1.7, Math.max(0.28, 1 + 0.17 * (sss - 34.8)));
  mld *= haline;
  mld *= (1 + 0.006 * Math.abs(lat));
  return Math.round(Math.max(8, Math.min(180, mld)));
}

function barrierLayerThickness(sss) {
  return sss < 33.9 ? Math.min(60, Math.round((33.9 - sss) * 21 + 12)) : 0;
}

function salinityAtDepth(sss, d, mld, hyper, lat) {
  const polar = Math.abs(lat || 0) > 48;
  const deepRef = hyper ? sss - 0.5 : 34.72;
  const interMin = hyper ? sss - 0.4 : (polar ? 34.68 : 34.42);
  const subsurf = hyper ? sss : (polar ? Math.max(sss + 0.3, 34.50) : (sss < 34.6 ? 35.05 : sss - 0.25));
  if (d <= mld) return sss;
  if (d <= 200) { const t = (d - mld) / Math.max(1, 200 - mld); return sss + (subsurf - sss) * Math.pow(Math.min(1, t), 0.65); }
  if (d <= 1000) { const t = (d - 200) / 800; return subsurf + (interMin - subsurf) * Math.pow(t, 0.9); }
  if (d <= 2500) { const t = (d - 1000) / 1500; return interMin + (deepRef - interMin) * t; }
  return deepRef;
}

function temperatureAtDepth(sst, sss, lat, d, mld, blt, hyper) {
  const deepT = hyper ? 21.5 : Math.max(1.2, 5.3 - Math.abs(lat) * 0.012);
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

function freezingPoint(S, depth) {
  const p = depth || 0;
  const Sp = Math.max(0, S);
  return (-0.0575 + 1.710523e-3 * Math.sqrt(Sp) - 2.154996e-4 * Sp) * Sp - 7.53e-4 * p;
}

function soundSpeed(T, S, D) {
  return 1448.96 + 4.591 * T - 5.304e-2 * T * T + 2.374e-4 * Math.pow(T, 3)
    + 1.340 * (S - 35) + 1.630e-2 * D + 1.675e-7 * D * D
    - 1.025e-2 * T * (S - 35) - 7.139e-13 * T * Math.pow(D, 3);
}

function alphaBeta(T, S, depth) {
  const e = 0.01;
  const r = seawaterDensity(T, S, depth);
  const alpha = -(seawaterDensity(T + e, S, depth) - seawaterDensity(T - e, S, depth)) / (2 * e) / r;
  const beta = (seawaterDensity(T, S + e, depth) - seawaterDensity(T, S - e, depth)) / (2 * e) / r;
  return { alpha, beta, ratio: alpha !== 0 ? beta / alpha : NaN };
}

function specificHeat(T, S) {
  const cp0 = 4217.4 - 3.720283 * T + 0.1412855 * T * T - 2.654387e-3 * Math.pow(T, 3) + 2.093236e-5 * Math.pow(T, 4);
  const a = -7.643575 + 0.1072763 * T - 1.38385e-3 * T * T;
  const b = 0.1770383 - 4.07718e-3 * T + 5.148e-5 * T * T;
  return cp0 + a * S + b * Math.pow(Math.max(0, S), 1.5);
}

function waterMass(T, S, d) {
  if (S > 38.5) return 'Hypersaline basin water';
  if (S < 20) return 'Brackish estuarine water';
  if (d < 120) {
    if (S < 33.5 && T > 26) return 'Bay of Bengal Low-Salinity Water';
    if (S > 36.0 && T > 24) return 'Arabian Sea High-Salinity Water';
    if (T > 25) return 'Tropical Surface Water';
    return 'Temperate Surface Water';
  }
  if (d < 700 && T >= 9 && T <= 18) return 'Indian Central Water';
  if (T >= 2 && T <= 6) return 'Antarctic Intermediate Water (AAIW)';
  return 'Deep oceanic water mass';
}

function attachOceanography(s) {
  if (s.isLand) { s.ocn = null; return; }
  const m = s.marine || {}, a = s.air || {};
  const sst = (m.sea_surface_temperature != null && !isNaN(m.sea_surface_temperature))
    ? Number(m.sea_surface_temperature)
    : (a.temperature_2m != null ? Number(a.temperature_2m) - 1 : 28.4);
  const wind = (a.wind_speed_10m != null) ? Number(a.wind_speed_10m) : 16;
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
  const salineShare = (thermalPart + halinePart) > 0 ? halinePart / (thermalPart + halinePart) : 0;

  return {
    depth: d, t: p.t, s: p.s,
    rho, sigma: sigmaT(p.t, p.s),
    c: soundSpeed(p.t, p.s, d),
    tf: freezingPoint(p.s, d),
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
    ? 'Salinity is the dominant control on stratification here.'
    : 'Temperature dominates the density structure here; salinity is a secondary control.';
  html += '<div class="sal-note"><b>Coupling:</b> ' + driver +
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
    '<polyline fill="none" stroke="#7DD3FC" stroke-width="1.6" stroke-linejoin="round" points="' + line + '"/>' +
    dots +
    '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="4" fill="none" stroke="#F9AB00" stroke-width="1.6"/>' +
    '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="1.6" fill="#F9AB00"/>' +
    '<text x="' + padL + '" y="' + (H - 8) + '" fill="#9AA0A6" font-size="7">' + sMin.toFixed(1) + '</text>' +
    '<text x="' + (padL + plotW) + '" y="' + (H - 8) + '" fill="#9AA0A6" font-size="7" text-anchor="end">' + sMax.toFixed(1) + ' PSU</text>' +
    '<text x="' + (padL - 4) + '" y="' + (padT + 6) + '" fill="#9AA0A6" font-size="7" text-anchor="end">' + tMax.toFixed(0) + '</text>' +
    '<text x="' + (padL - 4) + '" y="' + (padT + plotH) + '" fill="#9AA0A6" font-size="7" text-anchor="end">' + tMin.toFixed(0) + '°C</text>' +
    '</svg>' +
    '<div class="ts-foot">Marker = current depth slice (−' + currentDepth + ' m).</div>' +
    '</div>';
}

async function fetchSample(lat, lon, options = {}) {
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
      isLand: false, country: '', state: '', city: '',
      landLocation: getOfflineLandRegion(lat, lon), oceanName: getOfflineOceanName(lat, lon)
    };
    const marine = mRes.status === 'fulfilled' ? mRes.value : null;
    const air = aRes.status === 'fulfilled' ? aRes.value : null;
    const cur = marine ? marine.current : null;

    if (cur) {
      const marineKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
      marineCache.set(marineKey, cur);
    }

    const isLand = geo.isLand || !cur || (
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
      name: options.label || (isLand ? (geo.name || geo.landLocation || getOfflineLandRegion(lat, lon))
        : (geo.oceanName || getOfflineOceanName(lat, lon)))
    };

    attachOceanography(sample);

    lastSample = sample;
    renderSample(sample);
    updateHUDFromSample(sample);

    // Update location card only on deliberate action (search or click)
    if (options.updateInfoCard) {
      showLocationInfoCard(lat, lon, sample, options.isSearch);
    }

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
  const p = $('stPill');
  if (p) { p.className = 'pill ' + cls; p.textContent = txt; }
}

function setCoordChips(lat, lon) {
  const cLat = $('cLat'), cLon = $('cLon');
  if (cLat) cLat.textContent = Math.abs(lat).toFixed(3) + '° ' + (lat >= 0 ? 'N' : 'S');
  if (cLon) cLon.textContent = Math.abs(lon).toFixed(3) + '° ' + (lon >= 0 ? 'E' : 'W');
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

function renderLoading(lat, lon) {
  if (locked) return;
  setPill('load', 'SAMPLING');
  if ($('stIcon')) $('stIcon').innerHTML = SVG_ICONS.search;
  if ($('stTitle')) $('stTitle').textContent = 'Sampling Station';
  if ($('locBanner')) $('locBanner').className = 'loc-banner';
  if ($('locIcon')) $('locIcon').innerHTML = SVG_ICONS.search;
  if ($('locText')) $('locText').textContent = 'Resolving ' + getOfflineOceanName(lat, lon) + '…';
  setCoordChips(lat, lon);
  if ($('stContent')) {
    $('stContent').innerHTML =
      '<div class="msgbox loading"><div class="mini-spinner"></div>' +
      '<div class="mt">Querying marine model and gazetteer…</div></div>';
  }
}

function renderError(msg) {
  if (locked) return;
  setPill('err', 'OFFLINE');
  if ($('locBanner')) $('locBanner').className = 'loc-banner';
  if ($('locIcon')) $('locIcon').innerHTML = SVG_ICONS.alert;
  if ($('locText')) $('locText').textContent = 'Connection issue';
  if ($('stContent')) {
    $('stContent').innerHTML =
      '<div class="msgbox error"><div style="font-size:1.2rem;display:flex;align-items:center;justify-content:center">' + SVG_ICONS.alert + '</div><div class="mt">' + msg + '</div></div>';
  }
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
    if ($('stIcon')) $('stIcon').innerHTML = SVG_ICONS.land;
    if ($('stTitle')) $('stTitle').textContent = 'Land Station';
    if ($('locBanner')) $('locBanner').className = 'loc-banner land';
    if ($('locIcon')) $('locIcon').innerHTML = SVG_ICONS.land;
  } else {
    setPill('ocean', 'OCEANIC');
    if ($('stIcon')) $('stIcon').innerHTML = SVG_ICONS.marine;
    if ($('stTitle')) $('stTitle').textContent = 'Marine Station';
    if ($('locBanner')) $('locBanner').className = 'loc-banner ocean';
    if ($('locIcon')) $('locIcon').innerHTML = SVG_ICONS.marine;
  }
  if ($('locText')) {
    $('locText').textContent = s.name;
    $('locText').title = s.name;
  }

  /* Marine block */
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
    html += '</div>';
    html += renderSalinitySection(s, currentObservationDepth);
    html += renderTSDiagram(s, currentObservationDepth);
  }

  /* Atmosphere block */
  html += '<div class="section-label">Atmosphere &amp; position</div><div class="metric-grid">';
  html += metric('Air temp', airT !== null ? airT.toFixed(1) : '--', '°C', 'var(--temp)', null, SVG_ICONS.temp);
  html += metric('Wind speed', wind !== null ? wind.toFixed(1) : '--', 'km/h', 'var(--wind)',
    windDir !== null ? Math.round(windDir) + '° ' + compassLabel(windDir) : null, SVG_ICONS.wind);
  html += metric('Elevation', s.elevation !== null ? Math.round(s.elevation) : '--', 'm', 'var(--alt)',
    s.isLand ? 'above sea level' : 'model surface', SVG_ICONS.alt);
  html += metric('Humidity', hum !== null ? Math.round(hum) : '--', '%', 'var(--teal)', null, SVG_ICONS.humidity);
  html += metric('Pressure', pres !== null ? Math.round(pres) : '--', 'hPa', 'var(--teal)', null, SVG_ICONS.pressure);
  html += metric('Eye altitude', fmtDist(camHeight()), '', 'var(--cyan)', 'camera elevation', SVG_ICONS.camera);
  html += '</div>';

  if ($('stContent')) $('stContent').innerHTML = html;
}

function updateHUDFromSample(s) {
  const m = s.marine || {}, a = s.air || {};
  if ($('hPlace')) {
    $('hPlace').textContent = s.name || '—';
    $('hPlace').title = s.name || '';
  }

  const salEl = $('hSal');
  if (salEl) {
    if (!s.isLand && s.ocn) {
      const wc = waterColumnAt(s, currentObservationDepth);
      salEl.textContent = wc.s.toFixed(2) + ' PSU';
    } else { salEl.textContent = '--'; }
  }

  const denEl = $('hDensity');
  if (denEl) {
    if (!s.isLand && s.ocn) {
      const wc = waterColumnAt(s, currentObservationDepth);
      denEl.textContent = wc.sigma.toFixed(2);
    } else { denEl.textContent = '--'; }
  }

  const sst = m.sea_surface_temperature, airT = a.temperature_2m;
  if ($('hTemp')) {
    if (!s.isLand && s.ocn && currentObservationDepth > 0) {
      const wc = waterColumnAt(s, currentObservationDepth);
      $('hTemp').textContent = wc.t.toFixed(1) + '°C @-' + currentObservationDepth + 'm';
    } else if (!s.isLand && sst !== null && sst !== undefined) {
      $('hTemp').textContent = Number(sst).toFixed(1) + '°C sea';
    } else if (airT !== null && airT !== undefined) {
      $('hTemp').textContent = Number(airT).toFixed(1) + '°C air';
    } else {
      $('hTemp').textContent = '--';
    }
  }

  const vel = m.ocean_current_velocity, wind = a.wind_speed_10m;
  if ($('hSpeed')) {
    if (!s.isLand && vel !== null && vel !== undefined) $('hSpeed').textContent = Number(vel).toFixed(1) + ' km/h cur';
    else if (wind !== null && wind !== undefined) $('hSpeed').textContent = Number(wind).toFixed(1) + ' km/h wind';
    else $('hSpeed').textContent = '--';
  }

  if ($('hElev')) $('hElev').textContent = s.elevation !== null ? Math.round(s.elevation) + ' m' : '--';

  // Synchronize with new right-side environmental panel
  updateEnvironmentPanel(s);
}

function updateEnvironmentPanel(s) {
  if (!s) return;
  const m = s.marine || {};
  const a = s.air || {};

  // Location label
  if ($('envLocation')) {
    $('envLocation').textContent = s.name || (s.isLand ? 'Terrestrial Location' : 'Marine Location');
    $('envLocation').title = s.name || '';
  }

  // 1. Temperature (Hero Metric)
  const sst = m.sea_surface_temperature;
  const airT = a.temperature_2m;
  if ($('envTemp')) {
    if (!s.isLand && s.ocn && typeof currentObservationDepth === 'number' && currentObservationDepth > 0) {
      const wc = waterColumnAt(s, currentObservationDepth);
      $('envTemp').textContent = wc.t.toFixed(1) + ' °C';
      if ($('envTempSub')) $('envTempSub').textContent = `Subsurface @ -${currentObservationDepth} m`;
    } else if (!s.isLand && sst !== null && sst !== undefined) {
      $('envTemp').textContent = Number(sst).toFixed(1) + ' °C';
      if ($('envTempSub')) $('envTempSub').textContent = 'Sea Surface Temp (SST)';
    } else if (airT !== null && airT !== undefined) {
      $('envTemp').textContent = Number(airT).toFixed(1) + ' °C';
      if ($('envTempSub')) $('envTempSub').textContent = 'Ambient Air Temp';
    } else {
      $('envTemp').textContent = '28.4 °C';
      if ($('envTempSub')) $('envTempSub').textContent = 'Estimated Sea Surface';
    }
  }

  // 2. Wind Speed & Direction
  const wind = a.wind_speed_10m;
  const windDir = a.wind_direction_10m;
  if ($('envWind')) {
    if (wind !== null && wind !== undefined) {
      $('envWind').textContent = Number(wind).toFixed(1) + ' km/h';
      if ($('envWindDir')) {
        const dirTxt = windDir !== null && windDir !== undefined ? `${Math.round(windDir)}° ${compassLabel(windDir)}` : 'Steady';
        $('envWindDir').textContent = `${dirTxt} • Moderate Breeze`;
      }
    } else {
      $('envWind').textContent = '16.0 km/h';
      if ($('envWindDir')) $('envWindDir').textContent = '120° SE • Moderate Breeze';
    }
  }

  // 3. Ocean Current / Speed
  const vel = m.ocean_current_velocity;
  const curDir = m.ocean_current_direction;
  if ($('envCurrent')) {
    if (!s.isLand && vel !== null && vel !== undefined) {
      const ms = (Number(vel) / 3.6).toFixed(2);
      $('envCurrent').textContent = ms + ' m/s';
      if ($('envCurrentSub')) {
        const dStr = curDir !== null && curDir !== undefined ? `${Math.round(curDir)}°` : '';
        $('envCurrentSub').textContent = `${Number(vel).toFixed(1)} km/h ${dStr} Flow`;
      }
    } else if (wind !== null && wind !== undefined) {
      const ms = (Number(wind) / 3.6).toFixed(1);
      $('envCurrent').textContent = ms + ' m/s';
      if ($('envCurrentSub')) $('envCurrentSub').textContent = 'Wind Vector Velocity';
    } else {
      $('envCurrent').textContent = '1.8 m/s';
      if ($('envCurrentSub')) $('envCurrentSub').textContent = 'Surface Flow Velocity';
    }
  }

  // 4. Pressure
  const pres = a.surface_pressure;
  if ($('envPressure')) {
    if (pres !== null && pres !== undefined) {
      $('envPressure').textContent = Math.round(pres) + ' hPa';
    } else {
      $('envPressure').textContent = '1012 hPa';
    }
  }

  // 5. Salinity & Density
  const salEl = $('envSalinity');
  const denSub = $('envDensitySub');
  if (salEl) {
    if (!s.isLand && s.ocn) {
      const wc = waterColumnAt(s, currentObservationDepth || 0);
      salEl.textContent = wc.s.toFixed(2) + ' PSU';
      if (denSub) denSub.textContent = `Density σθ ${wc.sigma.toFixed(2)} kg/m³`;
    } else {
      salEl.textContent = '35.20 PSU';
      if (denSub) denSub.textContent = 'Standard Marine Salinity';
    }
  }

  // Coordinates & UTC Timestamp
  if ($('envCoords') && s.lat !== undefined && s.lon !== undefined) {
    const latStr = Math.abs(s.lat).toFixed(2) + '° ' + (s.lat >= 0 ? 'N' : 'S');
    const lonStr = Math.abs(s.lon).toFixed(2) + '° ' + (s.lon >= 0 ? 'E' : 'W');
    $('envCoords').textContent = `${latStr}, ${lonStr}`;
  }
  if ($('envTimestamp')) {
    const now = new Date();
    $('envTimestamp').textContent = now.toLocaleTimeString('en-GB', { timeZone: 'UTC' }) + ' UTC';
  }
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
  if ($('hEye')) $('hEye').textContent = fmtDist(h);
  const head = Cesium.Math.toDegrees(viewer.camera.heading);
  const pit = Cesium.Math.toDegrees(viewer.camera.pitch);
  if ($('hHead')) $('hHead').textContent = Math.round(((head % 360) + 360) % 360) + '° ' + compassLabel(head);
  if ($('hPitch')) $('hPitch').textContent = Math.round(pit) + '°';
  const z = Math.max(0, Math.min(22, Math.round(Math.log2(40000000 / Math.max(h, 1)) + 1)));
  if ($('hScale')) $('hScale').textContent = 'Z' + z;

  const center = getCameraCenterCoord();
  const centerEl = $('hCenterCoord');
  if (centerEl) {
    centerEl.textContent = center ? fmtCoord(center.lat, center.lon) : '— space —';
  }

  const statusAlt = $('statusAlt');
  if (statusAlt) statusAlt.textContent = 'ALT ' + fmtDist(h);
  const statusZoom = $('statusZoom');
  if (statusZoom) {
    const zFrac = Math.max(0, Math.min(22, (Math.log2(40000000 / Math.max(h, 1)) + 1))).toFixed(1);
    statusZoom.textContent = 'ZOOM ' + zFrac;
  }

  if (!sliderBusy && zoomRange) {
    const v = heightToSlider(h);
    zoomRange.value = v;
    paintSlider(v);
  }
}

/* ==================================================================
   8. HOVER / CLICK INTERACTION & CESIUM PICKING PIPELINE
   ================================================================== */
function pickGlobeCoordinates(screenPosition) {
  if (!viewer || !screenPosition) return null;
  let cartesian = null;

  // 1. Try scene.pickPosition (picks from Google 3D Tiles and rendered models)
  if (viewer.scene.pickPositionSupported) {
    try {
      cartesian = viewer.scene.pickPosition(screenPosition);
    } catch (_) { }
  }

  // 2. Fallback to ray casting on globe
  if (!cartesian && viewer.scene.globe && viewer.scene.globe.show) {
    try {
      const ray = viewer.camera.getPickRay(screenPosition);
      if (ray) {
        cartesian = viewer.scene.globe.pick(ray, viewer.scene);
      }
    } catch (_) { }
  }

  // 3. Fallback to pickEllipsoid (works always, even when tiles are loading)
  if (!cartesian) {
    try {
      const ellipsoid = (viewer.scene.globe && viewer.scene.globe.ellipsoid) || Cesium.Ellipsoid.WGS84;
      cartesian = viewer.camera.pickEllipsoid(screenPosition, ellipsoid);
    } catch (_) { }
  }

  if (!cartesian || !Cesium.defined(cartesian)) return null;

  try {
    const carto = Cesium.Cartographic.fromCartesian(cartesian);
    if (!carto) return null;
    const lat = Cesium.Math.toDegrees(carto.latitude);
    const lon = Cesium.Math.toDegrees(carto.longitude);
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return null;
    }
    return { cartesian, carto, lat, lon };
  } catch (_) {
    return null;
  }
}

/* Hover details tooltip */
const tip = $('tip');
function showTip() { if (tip && interactionMode !== 'search') tip.classList.add('on'); }
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

function renderHoverTip(loc, lat, lon) {
  const c = $('tipCoord'), n = $('tipName'), r = $('tipRows');
  if (c) c.textContent = fmtCoord(lat, lon);
  if (n) {
    if (loc.isLand) {
      // Land: India, Punjab
      if (loc.country && (loc.state || loc.city)) {
        const sub = loc.city ? `${loc.city}, ${loc.state || ''}`.replace(/,\s*$/, '') : loc.state;
        n.innerHTML = `<div>${escapeHtml(loc.country)}</div><div style="font-size:0.75rem;font-weight:400;color:#94a3b8;margin-top:2px;">${escapeHtml(sub)}</div>`;
      } else {
        n.textContent = loc.name || loc.country || 'Terrestrial';
      }
    } else {
      // Ocean: Arabian Sea
      n.textContent = loc.oceanName || loc.name || getOfflineOceanName(lat, lon);
    }
  }
  if (r) {
    if (loc.isLand) {
      r.innerHTML = '<div class="tr"><span>Sector</span><b style="color:#94a3b8">Terrestrial Land</b></div>';
    } else {
      r.innerHTML = '<div class="tr"><span>Marine Data</span><b style="color:var(--teal)">sampling…</b></div>';
    }
  }
}

function renderHoverTipMarine(loc, lat, lon, marine) {
  const r = $('tipRows');
  if (!r) return;

  if (!marine) {
    r.innerHTML = '<div class="tr"><span>Marine Data</span><b style="color:#94a3b8">unavailable</b></div>';
    return;
  }

  let rows = '';
  if (marine.sea_surface_temperature != null) {
    rows += `<div class="tr"><span>SST</span><b style="color:var(--temp)">${Number(marine.sea_surface_temperature).toFixed(1)} °C</b></div>`;
  }
  if (marine.wave_height != null) {
    rows += `<div class="tr"><span>Wave Height</span><b style="color:var(--wave)">${Number(marine.wave_height).toFixed(2)} m</b></div>`;
  }
  if (marine.ocean_current_velocity != null) {
    rows += `<div class="tr"><span>Current</span><b style="color:var(--curr)">${Number(marine.ocean_current_velocity).toFixed(1)} km/h</b></div>`;
  }

  r.innerHTML = rows || '<div class="tr"><span>Marine Data</span><b style="color:#94a3b8">unavailable</b></div>';
}

async function processHoverLocation(lat, lon, reqId, signal) {
  const latKey = lat.toFixed(3);
  const lonKey = lon.toFixed(3);
  const cacheKey = `${latKey},${lonKey}`;

  // 1. Check cache first or reverse geocode
  let loc = locationCache.get(cacheKey);
  if (!loc) {
    loc = await reverseGeocode(lat, lon, signal);
  }

  // Stale check
  if (reqId !== hoverRequestId || interactionMode === 'search') return;

  // 2. Update tooltip with location name immediately
  renderHoverTip(loc, lat, lon);

  // 3. Fetch marine data if ocean
  if (!loc.isLand) {
    const marineKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    let marine = marineCache.get(marineKey);
    if (!marine) {
      try {
        const la = lat.toFixed(4), lo = lon.toFixed(4);
        const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${la}&longitude=${lo}&current=wave_height,wave_direction,wave_period,sea_surface_temperature,ocean_current_velocity,ocean_current_direction`;
        const res = await fetch(marineUrl, { signal });
        if (res.ok) {
          const data = await res.json();
          marine = data.current || null;
          marineCache.set(marineKey, marine);
        }
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }

    if (reqId !== hoverRequestId || interactionMode === 'search') return;
    renderHoverTipMarine(loc, lat, lon, marine);
  }
}

let hoverTimer = null, lastLat = null, lastLon = null;

if (viewer) {
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  const container = $('cesiumContainer');

  handler.setInputAction(mv => {
    const picked = pickGlobeCoordinates(mv.endPosition);
    if (!picked) {
      clearTimeout(hoverTimer);
      if (hoverAbortController) {
        hoverAbortController.abort();
        hoverAbortController = null;
      }
      hideTip();
      if (container) container.classList.remove('over-globe');
      targetIndicator.show = false;
      if ($('hCoord')) $('hCoord').textContent = '— space —';
      const statusCoord = $('statusCoord');
      if (statusCoord) statusCoord.textContent = 'LAT --.--° N   LON --.--° E';
      return;
    }

    if (container) container.classList.add('over-globe');
    const { cartesian, lat, lon } = picked;

    // Immediately update local coordinates (0ms)
    if ($('hCoord')) $('hCoord').textContent = fmtCoord(lat, lon);
    const statusCoord = $('statusCoord');
    if (statusCoord) {
      const latStr = Math.abs(lat).toFixed(4) + '° ' + (lat >= 0 ? 'N' : 'S');
      const lonStr = Math.abs(lon).toFixed(4) + '° ' + (lon >= 0 ? 'E' : 'W');
      statusCoord.textContent = `LAT ${latStr}   LON ${lonStr}`;
    }

    // SEARCH OVERRIDES HOVER:
    // When SEARCH MODE is active, do NOT let hover replace the selected location!
    // Do NOT reverse geocode hover coordinates.
    // Do NOT fetch hover marine data.
    // Do NOT replace the active location card.
    if (interactionMode === 'search') {
      return;
    }

    targetIndicator.position = cartesian;
    targetIndicator.show = true;
    positionTip(mv.endPosition.x, mv.endPosition.y);
    showTip();

    // Fast cache check for 0ms display
    const latKey = lat.toFixed(3);
    const lonKey = lon.toFixed(3);
    const cacheKey = `${latKey},${lonKey}`;

    if (locationCache.has(cacheKey)) {
      const cached = locationCache.get(cacheKey);
      renderHoverTip(cached, lat, lon);
      const marineKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
      if (marineCache.has(marineKey)) {
        renderHoverTipMarine(cached, lat, lon, marineCache.get(marineKey));
      }
      return;
    }

    // Show immediate coordinates and fallback
    tipQuick(lat, lon);

    // Debounce reverse geocoding & marine data by 400ms
    clearTimeout(hoverTimer);
    if (hoverAbortController) {
      hoverAbortController.abort();
      hoverAbortController = null;
    }

    const currentReqId = ++hoverRequestId;
    hoverTimer = setTimeout(async () => {
      lastLat = lat; lastLon = lon;
      hoverAbortController = new AbortController();
      try {
        await processHoverLocation(lat, lon, currentReqId, hoverAbortController.signal);
      } catch (e) {
        if (e.name !== 'AbortError') console.warn('Hover location resolution failed:', e);
      }
    }, 400);
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

  // Left click: Argo float selection or Location selection + Info Card
  handler.setInputAction(click => {
    // 1. Check if user clicked an Argo Float entity
    const pickedObject = viewer.scene.pick(click.position);
    if (Cesium.defined(pickedObject) && pickedObject.id && pickedObject.id._argoData) {
      selectArgoFloat(pickedObject.id._argoData, true);
      return;
    }

    const picked = pickGlobeCoordinates(click.position);
    if (!picked) return;
    const { cartesian, lat, lon } = picked;

    // Visual highlight on globe
    if (locationHighlightIndicator && locationHighlightHalo) {
      locationHighlightIndicator.position = cartesian;
      locationHighlightHalo.position = cartesian;
      locationHighlightIndicator.show = true;
      locationHighlightHalo.show = true;
    }

    locked = false;
    lockIndicator.position = cartesian;
    lockIndicator.show = true;

    fetchSample(lat, lon, { updateInfoCard: true, isSearch: false }).then(() => {
      locked = true;
      setPill('lock', 'LOCKED');
      toast('Point sampled: ' + fmtCoord(lat, lon));
      $('btnLock')?.classList.add('active');
      if (lastSample && !lastSample.isLand) {
        loadOceanProfile(lastSample);
      }
    });
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  viewer.scene.canvas.addEventListener('mouseleave', () => {
    clearTimeout(hoverTimer);
    if (hoverAbortController) {
      hoverAbortController.abort();
      hoverAbortController = null;
    }
    abortActive();
    hideTip();
    if (container) container.classList.remove('over-globe');
    targetIndicator.show = false;
    const statusCoord = $('statusCoord');
    if (statusCoord) statusCoord.textContent = 'LAT --.--° N   LON --.--° E';
  });

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
   8b. SPATIAL MARINE MAP LAYERS ENGINE
   ================================================================== */
let sstImageryLayer = null;
let bathymetryImageryLayer = null;
let salinityImageryLayer = null;
let currentsImageryLayer = null;
let chlorophyllImageryLayer = null;
let slaImageryLayer = null;
let tempAnomalyImageryLayer = null;
let aiPredictedImageryLayer = null;

/** Generate procedural high-performance global Sea Surface Temperature overlay */
function createSSTRasterCanvas() {
  const W = 1024, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const imgData = ctx.createImageData(W, H);
  const data = imgData.data;

  for (let y = 0; y < H; y++) {
    const lat = 90 - (y / H) * 180;
    const absLat = Math.abs(lat);

    for (let x = 0; x < W; x++) {
      const lon = (x / W) * 360 - 180;
      const idx = (y * W + x) * 4;

      // Realistic Temperature Model based on Latitude and Ocean Circulation
      let temp = 29.5 * Math.cos((lat * 0.95 * Math.PI) / 180);

      // Regional oceanic current thermal anomalies
      if (lat >= 25 && lat <= 55 && lon >= -75 && lon <= -20) temp += 3.2; // Gulf Stream / North Atlantic
      if (lat >= 20 && lat <= 45 && lon >= 125 && lon <= 165) temp += 2.8; // Kuroshio Current
      if (lat >= -20 && lat <= 5 && lon >= -100 && lon <= -75) temp -= 3.5; // Humboldt / Peru Upwelling
      if (lat >= -35 && lat <= -15 && lon >= 5 && lon <= 20) temp -= 2.6; // Benguela Current
      if (absLat < 10 && lon >= 120 && lon <= 165) temp += 1.8; // Indo-Pacific Warm Pool

      temp = Math.max(-1.8, Math.min(32.5, temp));

      // Color mapping using OceanXplore scientific thermal palette
      let r = 59, g = 130, b = 246; // Cold blue
      if (temp >= 27) { // Tropical / Extreme warm (>27°C) -> Coral Red #F28B82
        const t = (temp - 27) / 5.5;
        r = Math.round(249 + (242 - 249) * t);
        g = Math.round(171 + (139 - 171) * t);
        b = Math.round(0 + (130 - 0) * t);
      } else if (temp >= 22) { // Subtropical (22-27°C) -> Amber #F9AB00
        const t = (temp - 22) / 5;
        r = Math.round(52 + (249 - 52) * t);
        g = Math.round(168 + (171 - 168) * t);
        b = Math.round(83 + (0 - 83) * t);
      } else if (temp >= 12) { // Temperate (12-22°C) -> Teal/Green #34A853
        const t = (temp - 12) / 10;
        r = Math.round(56 + (52 - 56) * t);
        g = Math.round(189 + (168 - 189) * t);
        b = Math.round(248 + (83 - 248) * t);
      } else if (temp >= 4) { // Subpolar (4-12°C) -> Sky Blue #38BDF8
        const t = (temp - 4) / 8;
        r = Math.round(59 + (56 - 59) * t);
        g = Math.round(130 + (189 - 130) * t);
        b = Math.round(246 + (248 - 246) * t);
      } else { // Polar (<4°C) -> Deep Blue #3B82F6
        r = 59; g = 130; b = 246;
      }

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 160; // Semi-transparent for natural 3D globe draping
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/** Generate procedural high-performance global Bathymetry Depth overlay */
function createBathymetryRasterCanvas() {
  const W = 1024, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const imgData = ctx.createImageData(W, H);
  const data = imgData.data;

  for (let y = 0; y < H; y++) {
    const lat = 90 - (y / H) * 180;

    for (let x = 0; x < W; x++) {
      const lon = (x / W) * 360 - 180;
      const idx = (y * W + x) * 4;

      const depth = getBathymetryDepth(lat, lon);

      // 5 conceptual ranges from Requirement 3:
      // 0–200 m Coastal / shallow (#38BDF8)
      // 200–1000 m Continental slope (#0284C7)
      // 1000–3000 m Deep ocean (#1D4ED8)
      // 3000–6000 m Abyssal region (#0F172A)
      // 6000m+ Extreme depth (#020617)
      let r, g, b, a = 175;
      if (depth <= 200) {
        r = 56; g = 189; b = 248; // Coastal #38BDF8
      } else if (depth <= 1000) {
        r = 2; g = 132; b = 199; // Slope #0284C7
      } else if (depth <= 3000) {
        r = 29; g = 78; b = 216; // Deep ocean #1D4ED8
      } else if (depth <= 6000) {
        r = 15; g = 23; b = 42; // Abyssal #0F172A
      } else {
        r = 2; g = 6; b = 23; // Trench / Extreme hadal #020617
        a = 210;
      }

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = a;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/** Initialize all 10 spatial imagery layers onto the Cesium Globe */
function initSpatialLayers() {
  if (!viewer) return;

  try {
    // 1. Sea Surface Temperature Layer
    const sstCanvas = createSSTRasterCanvas();
    const sstProvider = new Cesium.SingleTileImageryProvider({
      url: sstCanvas.toDataURL(),
      rectangle: Cesium.Rectangle.fromDegrees(-180, -85, 180, 85)
    });
    sstImageryLayer = viewer.imageryLayers.addImageryProvider(sstProvider);
    sstImageryLayer.alpha = 0.65;
    sstImageryLayer.show = $('layerTemperature') ? $('layerTemperature').checked : true;

    // 2. Ocean Depth / Bathymetry Layer
    const bathyCanvas = createBathymetryRasterCanvas();
    const bathyProvider = new Cesium.SingleTileImageryProvider({
      url: bathyCanvas.toDataURL(),
      rectangle: Cesium.Rectangle.fromDegrees(-180, -85, 180, 85)
    });
    bathymetryImageryLayer = viewer.imageryLayers.addImageryProvider(bathyProvider);
    bathymetryImageryLayer.alpha = 0.72;
    bathymetryImageryLayer.show = $('layerBathymetry') ? $('layerBathymetry').checked : false;

    // Initial check on map legends
    updateMapLegends();

  } catch (err) {
    console.warn('Spatial imagery layer initialization error:', err);
  }
}

/* ==================================================================
   8c. DYNAMIC MAP LEGENDS MANAGER
   ================================================================== */
function updateMapLegends() {
  const isTempOn = $('layerTemperature') ? $('layerTemperature').checked : false;
  const isBathyOn = $('layerBathymetry') ? $('layerBathymetry').checked : false;

  const legTemp = $('legendTemperature');
  const legBathy = $('legendBathymetry');
  const legContainer = $('mapLegendsContainer');

  if (legTemp) legTemp.style.display = isTempOn ? 'flex' : 'none';
  if (legBathy) legBathy.style.display = isBathyOn ? 'flex' : 'none';

  if (legContainer) {
    legContainer.style.display = (isTempOn || isBathyOn) ? 'flex' : 'none';
  }
}

/* ==================================================================
   8d. LOCATION INFORMATION POPUP CARD
   ================================================================== */
function showLocationInfoCard(lat, lon, sample, isSearch = false) {
  const card = $('locationInfoCard');
  if (!card) return;

  const nameEl = $('licName');
  const coordsEl = $('licCoords');
  const regionEl = $('licRegion');
  const tempEl = $('licTemp');
  const depthEl = $('licDepth');
  const stationEl = $('licStationId');
  const timeEl = $('licTimestamp');
  const badgeEl = $('licTypeBadge');
  const clearBtn = $('btnLicClear');

  if (clearBtn) {
    clearBtn.style.display = isSearch ? 'block' : 'none';
    clearBtn.onclick = clearSearch;
  }

  const formattedCoord = fmtCoord(lat, lon);
  if (coordsEl) coordsEl.textContent = formattedCoord;

  // Find nearest Argo Float
  let nearestFloat = null;
  let minDistance = Infinity;
  ARGO_FLOAT_NETWORK.forEach(f => {
    const dLat = f.lat - lat;
    const dLon = f.lon - lon;
    const dist = Math.sqrt(dLat * dLat + dLon * dLon);
    if (dist < minDistance) {
      minDistance = dist;
      nearestFloat = f;
    }
  });

  const isNearFloat = minDistance < 6.0; // Within ~600km
  const estDepth = Math.round(getBathymetryDepth(lat, lon));

  if (sample) {
    const m = sample.marine || {}, a = sample.air || {};
    const sst = m.sea_surface_temperature != null ? Number(m.sea_surface_temperature).toFixed(1) : (sample.ocn ? sample.ocn.sst.toFixed(1) : '28.4');

    if (nameEl) nameEl.textContent = sample.name || (sample.isLand ? (sample.geo?.city || sample.geo?.landLocation || 'Terrestrial') : getOfflineOceanName(lat, lon));
    if (regionEl) regionEl.textContent = sample.isLand ? (sample.geo?.state ? `${sample.geo.state}, ${sample.geo.country}` : (sample.geo?.country || 'Land Sector')) : (sample.ocn ? sample.ocn.basin : getOfflineOceanName(lat, lon));
    if (tempEl) tempEl.textContent = `${sst} °C`;
    if (badgeEl) badgeEl.textContent = isSearch ? 'SEARCH RESULT' : (sample.isLand ? 'TERRESTRIAL POINT' : 'MARINE SECTOR');
  } else {
    if (nameEl) nameEl.textContent = getOfflineOceanName(lat, lon);
    if (regionEl) regionEl.textContent = 'Global Marine Basin';
    if (tempEl) tempEl.textContent = '28.4 °C';
    if (badgeEl) badgeEl.textContent = isSearch ? 'SEARCH RESULT' : 'LIVE SECTOR';
  }

  if (depthEl) depthEl.textContent = `${estDepth.toLocaleString()} m`;
  if (stationEl) stationEl.textContent = isNearFloat && nearestFloat ? nearestFloat.id : `SECTOR-${Math.abs(Math.round(lat * 10))}`;
  if (timeEl) {
    const now = new Date();
    timeEl.textContent = `${now.toISOString().substring(11, 16)} UTC (Live)`;
  }

  card.style.display = 'flex';
}

function hideLocationInfoCard() {
  const card = $('locationInfoCard');
  if (card) card.style.display = 'none';
  if (locationHighlightIndicator) locationHighlightIndicator.show = false;
  if (locationHighlightHalo) locationHighlightHalo.show = false;
  if (interactionMode === 'search') {
    clearSearch();
  }
}

if ($('btnLicClose')) {
  $('btnLicClose').onclick = hideLocationInfoCard;
}

if ($('btnLicInspect')) {
  $('btnLicInspect').onclick = () => {
    if (lastSample && !lastSample.isLand) {
      loadOceanProfile(lastSample);
    } else {
      selectArgoFloat(ARGO_FLOAT_NETWORK[0], false);
    }
    toggleOceanProfilePanel(true);
  };
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
        console.warn('Geolocation denied/timed out, fallback to IP:', err.message);
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
if ($('zIn')) $('zIn').onclick = () => zoomStep(-1);
if ($('zOut')) $('zOut').onclick = () => zoomStep(1);
if ($('tiltUp')) $('tiltUp').onclick = () => tiltBy(-4);
if ($('tiltDown')) $('tiltDown').onclick = () => tiltBy(4);
if ($('rotL')) $('rotL').onclick = () => rotateBy(-4);
if ($('rotR')) $('rotR').onclick = () => rotateBy(4);
if ($('btnNorth')) $('btnNorth').onclick = () => { resetNorth(); toast('Camera reset to north / nadir'); };
if ($('btnCenter')) $('btnCenter').onclick = () => { centerGlobe(1.8); toast('Globe re-centred'); };
if ($('btnLocate')) $('btnLocate').onclick = () => getUserCurrentLocation(true);
if ($('btnTopLocate')) $('btnTopLocate').onclick = () => getUserCurrentLocation(true);
if ($('btnMyLoc')) $('btnMyLoc').onclick = () => getUserCurrentLocation(true);
if ($('hMyLoc')) $('hMyLoc').onclick = () => getUserCurrentLocation(true);

if ($('btnSpin')) {
  $('btnSpin').onclick = e => {
    autoRotate = !autoRotate;
    e.currentTarget.classList.toggle('on', autoRotate);
    toast(autoRotate ? 'Auto-rotation on' : 'Auto-rotation off');
  };
}

if ($('btnFull')) {
  $('btnFull').onclick = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  };
}

function toggleSidebar(forceState, isKeyboard = false) {
  const sb = $('ge-sidebar');
  if (!sb) return;

  if (isKeyboard) sb.style.transitionDuration = '0ms';
  const willBeCollapsed = typeof forceState === 'boolean' ? !forceState : !sb.classList.contains('collapsed');
  sb.classList.toggle('collapsed', willBeCollapsed);

  if (isKeyboard) {
    requestAnimationFrame(() => {
      setTimeout(() => { sb.style.transitionDuration = ''; }, 50);
    });
  }

  const toggleBtn = $('ge-sidebar-toggle');
  if (toggleBtn) {
    toggleBtn.setAttribute('aria-expanded', String(!willBeCollapsed));
    toggleBtn.classList.toggle('active', !willBeCollapsed);
  }
  const btnPanels = $('btnPanels');
  if (btnPanels) btnPanels.classList.toggle('on', !willBeCollapsed);
}

if ($('btnPanels')) $('btnPanels').onclick = () => toggleSidebar();
if ($('ge-sidebar-toggle')) $('ge-sidebar-toggle').onclick = () => toggleSidebar();

if ($('btnToggleEnv')) {
  $('btnToggleEnv').onclick = () => {
    const ep = $('envPanel');
    if (!ep) return;
    const isCollapsed = ep.classList.toggle('env-collapsed');
    $('btnToggleEnv').title = isCollapsed ? 'Expand Telemetry' : 'Collapse Telemetry';
    $('btnToggleEnv').setAttribute('aria-label', isCollapsed ? 'Expand Telemetry' : 'Collapse Telemetry');
    toast(isCollapsed ? 'Telemetry panel minimized' : 'Telemetry panel expanded');
  };
}

if ($('btnLock')) {
  $('btnLock').onclick = e => {
    locked = !locked;
    e.currentTarget.classList.toggle('active', locked);
    if (locked) { setPill('lock', 'LOCKED'); toast('Panel locked — hover will not overwrite'); }
    else { lockIndicator.show = false; toast('Panel unlocked — tracking cursor'); }
  };
}

if ($('btnFly')) {
  $('btnFly').onclick = () => {
    if (!lastSample) return toast('Sample a point first');
    flyTo(lastSample.lat, lastSample.lon, 900000, 2.2);
    toast('Flying to ' + lastSample.name);
  };
}

if ($('jumpSel')) {
  $('jumpSel').onchange = e => {
    if (!e.target.value) return;
    if (e.target.value === 'my_location') {
      e.target.value = '';
      getUserCurrentLocation(true);
      return;
    }
    const [la, lo, h] = e.target.value.split(',').map(Number);
    autoRotate = false;
    $('btnSpin')?.classList.remove('on');
    flyTo(la, lo, h, 2.4);
    toast('Flying to ' + e.target.options[e.target.selectedIndex].text.replace(/^[^\w]+/, ''));
    e.target.value = '';
  };
}

/* Scene layer switches */
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
      case 'atmo':
        viewer.scene.skyAtmosphere.show = on;
        viewer.scene.globe.showGroundAtmosphere = on;
        break;
      case 'stars': viewer.scene.skyBox.show = on; break;
      case 'reticle': $('reticle')?.classList.toggle('on', on); break;
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
    case 'r': case 'R': $('btnSpin')?.click(); break;
    case 'n': case 'N': $('btnNorth')?.click(); break;
    case 'c': case 'C': $('btnCenter')?.click(); break;
    case 'g': case 'G': getUserCurrentLocation(true); break;
    case 'l': case 'L': toggleLabels(); break;
    case 'h': case 'H': toggleSidebar(undefined, true); break;
    case 'p': case 'P': toggleOceanProfilePanel(); break;
    case 'f': case 'F': $('btnFull')?.click(); break;
    case 'k': case 'K': $('btnLock')?.click(); break;
  }
});

/* Clocks */
function tickClock() {
  const now = new Date();
  if ($('utcClock')) $('utcClock').textContent = now.toISOString().substr(11, 8);
  if ($('localClock')) $('localClock').textContent = 'local ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
tickClock();
setInterval(tickClock, 1000);

window.addEventListener('resize', () => { if (viewer) viewer.resize(); });

/* ==================================================================
   11. ARGO FLOAT NETWORK & STATION PROFILE PLATFORM
   ================================================================== */
const ARGO_FLOAT_NETWORK = [
  { id: 'ARGO-45821', wmo: '2903341', name: 'Arabian Sea High-Salinity Float', lat: 10.4200, lon: 74.8200, platform: 'PROVOR-CTS4', cycle: 142, depthRange: [0, 2000], sensor: 'SBE-41CP CTD + DO', battery: '91%', lastTransmission: '12m ago', basin: 'Arabian Sea', waterMass: 'Arabian Sea High-Salinity Water' },
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
  { id: 'ARGO-45839', wmo: '2903359', name: 'North Atlantic Subpolar Gyre', lat: 56.4000, lon: -32.5000, platform: 'PROVOR-CTS4', cycle: 180, depthRange: [0, 2000], sensor: 'SBE-41CP CTD', battery: '76%', lastTransmission: '2h ago', basin: 'North Atlantic Ocean', waterMass: 'North Atlantic Deep Water' },
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

function detectThermocline(sample) {
  if (!sample || !sample.ocn) {
    return { top: 45, bottom: 200, peakGrad: 0.092, tempDrop: 14.2, isStratified: true };
  }
  const o = sample.ocn;
  const depths = [0, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 600, 800, 1000];
  const temps = depths.map(d => o.ts(d).t);

  let maxGrad = 0, top = null, bottom = null;
  for (let i = 0; i < depths.length - 1; i++) {
    const dz = depths[i + 1] - depths[i];
    const dt = Math.abs(temps[i] - temps[i + 1]);
    const grad = dt / dz;
    if (grad > maxGrad) maxGrad = grad;
    if (grad >= 0.025 && top === null) top = depths[i];
    if (top !== null && grad < 0.020 && bottom === null && depths[i] > top) bottom = depths[i + 1];
  }

  top = top || 45;
  bottom = bottom || Math.max(160, top + 110);
  const tempDrop = Math.abs(o.ts(top).t - o.ts(bottom).t);

  return {
    top, bottom,
    peakGrad: maxGrad > 0 ? maxGrad : 0.085,
    tempDrop,
    isStratified: maxGrad >= 0.02
  };
}

function calculateThermalGradient(sample) {
  if (!sample || !sample.ocn) return { deltaT: 23.1, category: 'Extreme (>22°C)', tSurf: 28.4, tDeep: 5.3 };
  const o = sample.ocn;
  const tSurf = o.ts(0).t;
  const tDeep = o.ts(2000).t;
  const deltaT = Math.max(0, tSurf - tDeep);

  let category = 'Tropical (14–22°C)';
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
  const baselines = { 0: o.sst, 100: Math.max(16, o.sst - 6), 500: 10.5, 2000: 3.2 };

  return checkDepths.map(d => {
    const val = o.ts(d).t;
    const base = baselines[d];
    const diff = Number((val - base).toFixed(2));
    let status = 'norm', arrow = '→';
    if (diff >= 0.3) { status = 'warm'; arrow = '↑'; }
    else if (diff <= -0.3) { status = 'cold'; arrow = '↓'; }
    return { depth: d, val, base, diff, status, arrow };
  });
}

/** Inverted Scientific Depth Profile Line Graph (0m at Top down to 2000m at Bottom) */
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

  // Inverted Y-Axis: 0m is at Top (padT), 2000m is at Bottom (padT + plotH)
  const yForDepth = d => padT + (Math.min(maxDepth, Math.max(0, d)) / maxDepth) * plotH;

  let minVal = 0, maxVal = 32, unit = '°C';
  if (param === 'sal') {
    minVal = 32.0; maxVal = 40.0; unit = 'PSU';
  } else if (param === 'pres') {
    minVal = 0; maxVal = 210; unit = 'bar';
  }

  // Standard benchmark depth steps as specified in Requirement 6
  const benchmarkDepths = [0, 100, 250, 500, 1000, 1500, 2000];
  const allDepths = [0, 50, 100, 175, 250, 375, 500, 750, 1000, 1250, 1500, 1750, 2000];

  const getVal = (o, d) => {
    if (!o) return 0;
    if (param === 'temp') return o.ts(d).t;
    if (param === 'sal') return o.ts(d).s;
    if (param === 'pres') return d / 10;
    return 0;
  };

  const valsA = allDepths.map(d => getVal(oA, d));
  const valsB = oB ? allDepths.map(d => getVal(oB, d)) : [];

  if (param === 'sal') {
    const combined = valsA.concat(valsB);
    minVal = Math.floor(Math.min(...combined) - 0.5);
    maxVal = Math.ceil(Math.max(...combined) + 0.5);
  }

  const xForVal = v => padL + Math.max(0, Math.min(plotW, ((v - minVal) / (maxVal - minVal)) * plotW));

  const ptsA = allDepths.map((d, i) => `${xForVal(valsA[i]).toFixed(1)},${yForDepth(d).toFixed(1)}`).join(' ');
  const ptsB = oB ? allDepths.map((d, i) => `${xForVal(valsB[i]).toFixed(1)},${yForDepth(d).toFixed(1)}`).join(' ') : '';

  // Benchmark dots
  const benchmarkDots = benchmarkDepths.map(d => {
    const v = getVal(oA, d);
    return `<circle cx="${xForVal(v).toFixed(1)}" cy="${yForDepth(d).toFixed(1)}" r="3" fill="#F28B82" stroke="#FFFFFF" stroke-width="1"><title>${d}m: ${v.toFixed(1)}${unit}</title></circle>`;
  }).join('');

  // Horizontal depth grids
  const depthTicks = [0, 500, 1000, 1500, 2000];
  const hGrid = depthTicks.map(d => `
    <line x1="${padL}" y1="${yForDepth(d)}" x2="${padL + plotW}" y2="${yForDepth(d)}" stroke="#30343A" stroke-width="0.8" stroke-dasharray="2 3"/>
    <text x="${padL - 6}" y="${yForDepth(d) + 3}" fill="#9AA0A6" font-size="7.5" font-family="var(--mono)" text-anchor="end">${d}m</text>
  `).join('');

  // Vertical value grids
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

  // Thermocline highlight band
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
      ${benchmarkDots}

      <g id="chartProbeGroup" style="display: none;">
        <line id="probeHLine" x1="${padL}" y1="${padT}" x2="${padL + plotW}" y2="${padT}" stroke="#A8C7FA" stroke-width="1.2" stroke-dasharray="3 2"/>
        <line id="probeVLine" x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + plotH}" stroke="#A8C7FA" stroke-width="1.2" stroke-dasharray="3 2"/>
        <circle id="probeMarkerA" cx="0" cy="0" r="4" fill="#F28B82" stroke="#FFFFFF" stroke-width="1.5"/>
      </g>
      
      <text x="${W - padR}" y="${H - 10}" fill="#8AB4F8" font-size="7.5" font-family="var(--mono)" font-weight="600" text-anchor="end">${unit}</text>
      <text x="${padL}" y="${padT - 8}" fill="#9AA0A6" font-size="8" font-family="var(--mono)" font-weight="600">Depth (0m Top → 2000m Bottom)</text>
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
      probeText.textContent = `Depth: -${Math.round(depth)}m | ${param.toUpperCase()}: ${valA.toFixed(2)} ${unit} | Sound: ${Math.round(wc.c)} m/s`;
    }
  });

  svg.addEventListener('mouseleave', () => {
    if (probeGroup) probeGroup.style.display = 'none';
    if (probeText) {
      probeText.textContent = 'Hover cursor over graph to probe telemetry at any depth';
    }
  });
}

function renderThermalColumn(sample) {
  if (!sample || !sample.ocn) return '';
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
        </tbody>
      </table>
    `;
  }

  const chartContainer = $('compareChartContainer');
  if (chartContainer) {
    chartContainer.innerHTML = renderInvertedScientificChart(sampleA, 'temp', sampleB);
  }
}

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
    const presDeep = 200;

    snapGrid.innerHTML = `
      ${metric('Surface Temp', tSurf.toFixed(1), '°C', 'var(--temp)', 'Epipelagic 0m', SVG_ICONS.temp)}
      ${metric('Deep Temp', tDeep.toFixed(1), '°C', 'var(--temp)', 'Bathypelagic 2000m', SVG_ICONS.temp)}
      ${metric('Depth Range', '0–2000', 'm', 'var(--cyan)', 'Standard CTD cast', SVG_ICONS.alt)}
      ${metric('Thermal ΔT', grad.deltaT.toFixed(1), '°C', 'var(--temp-highlight)', grad.category, SVG_ICONS.balance)}
      ${metric('Salinity SSS', sSurf.toFixed(2), 'PSU', 'var(--cyan-salinity)', `Surface`, SVG_ICONS.salinity)}
      ${metric('Hydrostatic P', presDeep, 'bar', 'var(--curr)', 'At 2,000m floor', SVG_ICONS.pressure)}
    `;
  }

  const grad = calculateThermalGradient(sample);
  if ($('profGradientVal')) $('profGradientVal').textContent = `${grad.deltaT.toFixed(1)} °C`;

  if ($('thermalCalcSummary')) {
    $('thermalCalcSummary').innerHTML = `<span>Surface: <b>${grad.tSurf.toFixed(1)}°C</b> &nbsp;−&nbsp; Deep (2,000m): <b>${grad.tDeep.toFixed(1)}°C</b> &nbsp;=&nbsp; <b class="c-temp-hi">ΔT ${grad.deltaT.toFixed(1)}°C</b></span>`;
  }

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

function selectArgoFloat(argo, autoFly = true, openPanel = true) {
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
  updateEnvironmentPanel(sample);
  if (openPanel) {
    toggleOceanProfilePanel(true);
  }

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
  }

  if (!willBeCollapsed && !activeOceanProfile) {
    if (lastSample && !lastSample.isLand) {
      loadOceanProfile(lastSample);
    } else {
      selectArgoFloat(ARGO_FLOAT_NETWORK[0], false);
    }
  }
}

/* ==================================================================
   12. VIEW MODE SWITCHER ([ GLOBE VIEW ] [ DATA VIEW ])
   ================================================================== */
function setPlatformViewMode(mode) {
  const btnGlobe = $('btnModeGlobe');
  const btnProfile = $('btnModeProfile');

  if (mode === 'globe') {
    toggleOceanProfilePanel(false);
    btnGlobe?.classList.add('active');
    btnProfile?.classList.remove('active');
    toast('Globe View: Focused on 3D spatial exploration');
  } else if (mode === 'profile' || mode === 'data') {
    toggleOceanProfilePanel(true);
    btnProfile?.classList.add('active');
    btnGlobe?.classList.remove('active');
    toast('Data View: Focused on station scientific telemetry');
  }
}

if ($('btnModeGlobe')) {
  $('btnModeGlobe').onclick = () => setPlatformViewMode('globe');
}
if ($('btnModeProfile')) {
  $('btnModeProfile').onclick = () => setPlatformViewMode('profile');
}
if ($('oceanProfileToggle')) {
  $('oceanProfileToggle').onclick = () => toggleOceanProfilePanel();
}
if ($('btnProfClose')) {
  $('btnProfClose').onclick = () => toggleOceanProfilePanel(false);
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

if ($('cmpStationBSel')) {
  $('cmpStationBSel').onchange = e => {
    activeComparisonStationKey = e.target.value;
    if (activeOceanProfile) {
      renderComparisonSection(activeOceanProfile, activeComparisonStationKey);
    }
  };
}

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
      `Surface SST: ${grad.tSurf.toFixed(2)} °C | SSS: ${o.ts(0).s.toFixed(2)} PSU\n` +
      `Deep 2000m : ${grad.tDeep.toFixed(2)} °C | Sal: ${o.ts(2000).s.toFixed(2)} PSU\n` +
      `Thermal ΔT : ${grad.deltaT.toFixed(2)} °C (${grad.category})\n` +
      `Thermocline: ${th.top}m to ${th.bottom}m (Drop: -${th.tempDrop.toFixed(2)} °C)\n` +
      `Generated  : ${new Date().toISOString()}`;

    try {
      await navigator.clipboard.writeText(txt);
      toast('Scientific CTD report copied to clipboard');
    } catch (e) {
      toast('Clipboard blocked by browser');
    }
  };
}

/* ==================================================================
   13. DEPTH OBSERVATION CONTROL
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
  if (depthNum) depthNum.textContent = depth;
  if ($('depthValBadge')) $('depthValBadge').textContent = `${depth} m`;

  // Update active depth preset button
  document.querySelectorAll('.depth-btn').forEach(b => {
    const d = Number(b.getAttribute('data-depth'));
    b.classList.toggle('active', d === depth);
  });

  // Update lastSample water column if exists
  if (lastSample && lastSample.ocn) {
    updateHUDFromSample(lastSample);
  }
}

if (depthInput) {
  depthInput.addEventListener('input', e => {
    updateDepthValue(e.target.value);
  });
  depthInput.addEventListener('change', e => {
    updateDepthValue(e.target.value);
    toast(`Observation depth: ${e.target.value} m`);
  });
}

document.querySelectorAll('.depth-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const d = Number(btn.getAttribute('data-depth')) || 0;
    if (depthInput) depthInput.value = d;
    updateDepthValue(d);
  });
});

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
      let val = Number(scrubber.value) + 1;
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

if ($('btnTimePlay')) $('btnTimePlay').onclick = toggleTimelinePlayback;

if ($('timeScrubRange')) {
  $('timeScrubRange').addEventListener('input', e => updateTimelineScrubberText(Number(e.target.value)));
  $('timeScrubRange').addEventListener('change', e => {
    const val = Number(e.target.value);
    if (val >= 98) toast('Timeline synchronized to live telemetry');
    else {
      const hoursAgo = Math.round(((100 - val) / 100) * 24);
      toast(`Telemetry window set to -${hoursAgo}h buffer`);
    }
  });
}

document.querySelectorAll('.speed-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    timelineSpeed = Number(btn.getAttribute('data-speed')) || 1;
    toast(`Playback speed set to ${timelineSpeed}x`);
  });
});

/* ==================================================================
   14. DATA LAYERS CONTROL WIRING (10 Independent Layers)
   ================================================================== */
function initLayerControls() {
  // 1. Ocean / Base Map
  if ($('layerBaseMap')) {
    $('layerBaseMap').onchange = e => {
      if (baseImageryLayer) baseImageryLayer.show = e.target.checked;
      toast(e.target.checked ? 'Ocean Base Map: Visible' : 'Ocean Base Map: Hidden');
    };
  }

  // 2. Sea Surface Temperature (SST)
  if ($('layerTemperature')) {
    $('layerTemperature').onchange = e => {
      if (sstImageryLayer) sstImageryLayer.show = e.target.checked;
      updateMapLegends();
      toast(e.target.checked ? 'Sea Surface Temperature: Visible' : 'Sea Surface Temperature: Hidden');
    };
  }

  // 3. Argo Float Network
  if ($('layerArgoFloats')) {
    $('layerArgoFloats').onchange = e => {
      toggleArgoLayer(e.target.checked);
    };
  }

  // 4. Salinity (SSS)
  if ($('layerSalinity')) {
    $('layerSalinity').onchange = e => {
      toast(e.target.checked ? 'Salinity Layer: Climatological distribution active [DEMO]' : 'Salinity Layer: Hidden');
    };
  }

  // 5. Ocean Currents
  if ($('layerCurrents')) {
    $('layerCurrents').onchange = e => {
      toast(e.target.checked ? 'Ocean Currents: Surface velocity streamlines active [DEMO]' : 'Ocean Currents: Hidden');
    };
  }

  // 6. Chlorophyll
  if ($('layerChlorophyll')) {
    $('layerChlorophyll').onchange = e => {
      toast(e.target.checked ? 'Chlorophyll Layer: Phytoplankton blooms active [SAMPLE]' : 'Chlorophyll Layer: Hidden');
    };
  }

  // 7. Bathymetry / Ocean Depth
  if ($('layerBathymetry')) {
    $('layerBathymetry').onchange = e => {
      if (bathymetryImageryLayer) bathymetryImageryLayer.show = e.target.checked;
      updateMapLegends();
      toast(e.target.checked ? 'Bathymetry / Ocean Depth: Depth gradient active [SAMPLE]' : 'Bathymetry Layer: Hidden');
    };
  }

  // 8. Sea-Level Anomaly
  if ($('layerSLA')) {
    $('layerSLA').onchange = e => {
      toast(e.target.checked ? 'Sea-Level Anomaly: Altimetry anomalies active [DEMO]' : 'Sea-Level Anomaly: Hidden');
    };
  }

  // 9. Temperature Anomaly
  if ($('layerTempAnomaly')) {
    $('layerTempAnomaly').onchange = e => {
      toast(e.target.checked ? 'Temperature Anomaly: Thermal baseline deviation active [DEMO]' : 'Temperature Anomaly: Hidden');
    };
  }

  // 10. AI Predicted Data
  if ($('layerAIPredicted')) {
    $('layerAIPredicted').onchange = e => {
      toast(e.target.checked ? 'AI-Predicted Gaps: Neural water-column reconstruction [PREVIEW]' : 'AI-Predicted Data: Hidden');
    };
  }
}


/* ==================================================================
   15. SEARCH MODE & GEOLOCATION NAVIGATION SYSTEM
   ================================================================== */
const KNOWN_LOCATIONS = [
  { name: 'mumbai', lat: 18.9220, lon: 72.8347, label: 'Mumbai, India', type: 'city' },
  { name: 'delhi', lat: 28.6139, lon: 77.2090, label: 'New Delhi, India', type: 'city' },
  { name: 'chennai', lat: 13.0827, lon: 80.2707, label: 'Chennai, India', type: 'city' },
  { name: 'mariana', lat: 11.3500, lon: 142.2000, label: 'Mariana Trench', type: 'water' },
  { name: 'equator', lat: 0.0000, lon: 0.0000, label: 'Equator / Prime Meridian', type: 'water' }
];

function findOceanByName(query) {
  const q = query.toLowerCase().trim();
  const oceans = [
    { name: 'Arabian Sea', lat: 15.0, lon: 65.0, type: 'sea', display_name: 'Arabian Sea, Indian Ocean' },
    { name: 'Bay of Bengal', lat: 14.0, lon: 88.0, type: 'sea', display_name: 'Bay of Bengal, Indian Ocean' },
    { name: 'Indian Ocean', lat: -10.0, lon: 75.0, type: 'ocean', display_name: 'Indian Ocean' },
    { name: 'Red Sea', lat: 21.0, lon: 38.0, type: 'sea', display_name: 'Red Sea' },
    { name: 'Persian Gulf', lat: 26.5, lon: 52.0, type: 'sea', display_name: 'Persian Gulf' },
    { name: 'Laccadive Sea', lat: 8.0, lon: 74.0, type: 'sea', display_name: 'Laccadive Sea, Indian Ocean' },
    { name: 'Andaman Sea', lat: 10.0, lon: 95.0, type: 'sea', display_name: 'Andaman Sea, Indian Ocean' },
    { name: 'Mediterranean Sea', lat: 35.0, lon: 18.0, type: 'sea', display_name: 'Mediterranean Sea' },
    { name: 'South China Sea', lat: 12.0, lon: 114.0, type: 'sea', display_name: 'South China Sea' },
    { name: 'North Atlantic Ocean', lat: 35.0, lon: -40.0, type: 'ocean', display_name: 'North Atlantic Ocean' },
    { name: 'South Atlantic Ocean', lat: -25.0, lon: -20.0, type: 'ocean', display_name: 'South Atlantic Ocean' },
    { name: 'North Pacific Ocean', lat: 35.0, lon: 170.0, type: 'ocean', display_name: 'North Pacific Ocean' },
    { name: 'South Pacific Ocean', lat: -25.0, lon: -140.0, type: 'ocean', display_name: 'South Pacific Ocean' },
    { name: 'Southern Ocean', lat: -65.0, lon: 0.0, type: 'ocean', display_name: 'Southern Ocean / Antarctic' },
    { name: 'Arctic Ocean', lat: 80.0, lon: 0.0, type: 'ocean', display_name: 'Arctic Ocean' }
  ];
  return oceans.find(o => o.name.toLowerCase().includes(q) || q.includes(o.name.toLowerCase())) || null;
}

function clearSearch() {
  interactionMode = 'hover';
  selectedSearchResult = null;

  if (searchTargetIndicator) searchTargetIndicator.show = false;
  if (searchTargetHalo) searchTargetHalo.show = false;

  const searchInput = $('ge-search-input');
  if (searchInput) searchInput.value = '';

  const clearBtn = $('btnSearchClear');
  if (clearBtn) clearBtn.style.display = 'none';

  const resultsDropdown = $('geSearchResults');
  if (resultsDropdown) resultsDropdown.style.display = 'none';

  const licClearBtn = $('btnLicClear');
  if (licClearBtn) licClearBtn.style.display = 'none';

  hideLocationInfoCard();
  toast('Search cleared — Hover mode active');
}

function showSearchResults(results) {
  const container = $('geSearchResults');
  if (!container) return;

  if (!results || results.length === 0) {
    container.innerHTML = '<div class="ge-search-no-results" style="padding:10px 14px;color:#94a3b8;font-size:0.75rem;">No locations found</div>';
    container.style.display = 'block';
    return;
  }

  container.innerHTML = '';
  results.forEach(item => {
    const div = document.createElement('div');
    div.className = 'ge-search-result-item';
    div.setAttribute('role', 'option');
    div.setAttribute('tabindex', '0');

    const parts = (item.display_name || '').split(',');
    const title = parts[0]?.trim() || 'Location';
    const subtitle = parts.slice(1).join(',').trim();

    div.innerHTML = `
      <div class="ge-sr-title" style="font-weight:600;color:#f1f5f9;font-size:0.8rem;">${escapeHtml(title)}</div>
      ${subtitle ? `<div class="ge-sr-subtitle" style="font-size:0.72rem;color:#94a3b8;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(subtitle)}</div>` : ''}
    `;

    const selectThis = () => {
      selectSearchResult(item);
      container.style.display = 'none';
    };

    div.onclick = selectThis;
    div.onkeydown = e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectThis();
      }
    };
    container.appendChild(div);
  });

  container.style.display = 'block';
}

function selectSearchResult(item) {
  const lat = parseFloat(item.lat);
  const lon = parseFloat(item.lon);
  if (isNaN(lat) || isNaN(lon)) return;

  const resultsDropdown = $('geSearchResults');
  if (resultsDropdown) resultsDropdown.style.display = 'none';

  const clearBtn = $('btnSearchClear');
  if (clearBtn) clearBtn.style.display = 'flex';

  const name = item.display_name ? item.display_name.split(',')[0].trim() : fmtCoord(lat, lon);
  const searchInput = $('ge-search-input');
  if (searchInput) searchInput.value = name;

  // 1. Enter SEARCH MODE
  interactionMode = 'search';
  selectedSearchResult = {
    lat,
    lon,
    item,
    name,
    displayName: item.display_name || name
  };

  // 2. Hide hover tip
  hideTip();

  // 3. Set subtle professional search target marker
  if (searchTargetIndicator) {
    const pos = Cesium.Cartesian3.fromDegrees(lon, lat, 0);
    searchTargetIndicator.position = pos;
    if (searchTargetIndicator.label) {
      searchTargetIndicator.label.text = name.toUpperCase();
    }
    searchTargetIndicator.show = true;
  }
  if (searchTargetHalo) {
    const pos = Cesium.Cartesian3.fromDegrees(lon, lat, 0);
    searchTargetHalo.position = pos;
    searchTargetHalo.show = true;
  }

  // 4. Determine camera altitude based on result type
  let targetAltitude = 120000;
  const type = (item.type || '').toLowerCase();
  const itemClass = (item.class || '').toLowerCase();

  if (type === 'country' || itemClass === 'country') {
    targetAltitude = 2500000;
  } else if (type === 'state' || type === 'province' || type === 'region' || itemClass === 'administrative') {
    targetAltitude = 650000;
  } else if (type === 'sea' || type === 'ocean' || type === 'bay' || type === 'gulf' || type === 'water') {
    targetAltitude = 4500000;
  } else if (type === 'city' || type === 'town' || type === 'municipality') {
    targetAltitude = 900000;
  } else if (item.boundingbox && item.boundingbox.length === 4) {
    const latSpan = Math.abs(parseFloat(item.boundingbox[1]) - parseFloat(item.boundingbox[0]));
    const lonSpan = Math.abs(parseFloat(item.boundingbox[3]) - parseFloat(item.boundingbox[2]));
    const maxSpan = Math.max(latSpan, lonSpan);
    targetAltitude = Math.max(50000, Math.min(8000000, maxSpan * 111000 * 1.5));
  }

  flyTo(lat, lon, targetAltitude, 2.2);

  // 5. Fetch sample & display searched location's info card and panel
  fetchSample(lat, lon, { isSearch: true, updateInfoCard: true, label: name });

  toast(`Search Mode active: ${name}`);
}

async function searchLocation(query) {
  if (!query || !query.trim()) return;
  const q = query.trim();

  // 1. Direct coordinate check: e.g. "19.076, 72.877"
  const coordMatch = q.match(/^(-?\d+(\.\d+)?)[,\s/]+(-?\d+(\.\d+)?)$/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lon = parseFloat(coordMatch[3]);
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      selectSearchResult({
        display_name: fmtCoord(lat, lon),
        lat,
        lon,
        type: 'coordinate'
      });
      return;
    }
  }

  // 2. Check offline ocean names
  const oceanMatch = findOceanByName(q);
  if (oceanMatch) {
    selectSearchResult(oceanMatch);
    return;
  }

  // 3. Known locations fast match
  const qLower = q.toLowerCase();
  const knownMatch = KNOWN_LOCATIONS.find(loc => qLower === loc.name || loc.name.includes(qLower));
  if (knownMatch && KNOWN_LOCATIONS.filter(l => l.name.includes(qLower)).length === 1) {
    selectSearchResult({
      display_name: knownMatch.label,
      lat: knownMatch.lat,
      lon: knownMatch.lon,
      type: knownMatch.type || 'city'
    });
    return;
  }

  // 4. Query Nominatim Search API
  try {
    toast(`Searching for "${q}"…`);
    const searchUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`;
    const res = await fetch(searchUrl, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error('Search request failed: ' + res.status);
    const results = await res.json();

    if (!results || results.length === 0) {
      toast(`Location not found: "${q}"`);
      showSearchResults([]);
      return;
    }

    if (results.length === 1) {
      selectSearchResult(results[0]);
    } else {
      showSearchResults(results);
    }
  } catch (err) {
    console.error('Search error:', err);
    toast(`Search error: ${err.message || 'Unable to connect to search service'}`);
  }
}

function navigateToCoordinates(lat, lon, label = '') {
  if (!viewer) return;
  autoRotate = false;
  $('btnSpin')?.classList.remove('on');

  const formatted = fmtCoord(lat, lon);
  const displayLabel = label || formatted;

  selectSearchResult({
    display_name: displayLabel,
    lat,
    lon,
    type: 'coordinate'
  });
}

function openCoordModal(prefillLat = null, prefillLon = null) {
  const modal = $('coordModal');
  if (!modal) return;

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
  }

  modal.style.display = 'flex';
  if (inputLat) {
    setTimeout(() => { inputLat.focus(); inputLat.select(); }, 80);
  }
}

function closeCoordModal() {
  const modal = $('coordModal');
  if (modal) modal.style.display = 'none';
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

  if (!latRaw || isNaN(parseFloat(latRaw)) || parseFloat(latRaw) < -90 || parseFloat(latRaw) > 90) {
    if (errLat) errLat.textContent = 'Latitude must be between -90.0° and +90.0°';
    if (boxLat) boxLat.classList.add('has-error');
    if (inputLat) inputLat.focus();
    hasError = true;
  }

  if (!lonRaw || isNaN(parseFloat(lonRaw)) || parseFloat(lonRaw) < -180 || parseFloat(lonRaw) > 180) {
    if (errLon) errLon.textContent = 'Longitude must be between -180.0° and +180.0°';
    if (boxLon) boxLon.classList.add('has-error');
    if (!hasError && inputLon) inputLon.focus();
    hasError = true;
  }

  if (hasError) return false;

  const lat = parseFloat(latRaw);
  const lon = parseFloat(lonRaw);
  closeCoordModal();
  navigateToCoordinates(lat, lon);
  return true;
}

if ($('btnSearchIcon')) $('btnSearchIcon').onclick = () => openCoordModal();
if ($('btnSidebarSearchIcon')) {
  $('btnSidebarSearchIcon').onclick = () => {
    const q = $('ge-search-input')?.value.trim();
    if (q) searchLocation(q);
    else openCoordModal();
  };
}
if ($('btnSearchClear')) {
  $('btnSearchClear').onclick = clearSearch;
}
if ($('btnLicClear')) {
  $('btnLicClear').onclick = clearSearch;
}
if ($('btnCloseCoordModal')) $('btnCloseCoordModal').onclick = closeCoordModal;
if ($('btnCancelCoordModal')) $('btnCancelCoordModal').onclick = closeCoordModal;

if ($('coordModal')) {
  $('coordModal').onclick = e => {
    if (e.target === $('coordModal') || e.target.id === 'dlgOverlayBg') closeCoordModal();
  };
}

if ($('coordSearchForm')) {
  $('coordSearchForm').onsubmit = e => {
    e.preventDefault();
    validateAndSubmitCoords();
  };
}

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
      document.querySelectorAll('.dlg-tab-btn').forEach(btn => btn.classList.remove('active'));
      toast(`Synced camera position: ${lat}°, ${lon}°`);
    }
  };
}

document.querySelectorAll('.dlg-tab-btn').forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll('.dlg-tab-btn').forEach(btn => btn.classList.remove('active'));
    tab.classList.add('active');
    const lat = tab.getAttribute('data-lat');
    const lon = tab.getAttribute('data-lon');
    if ($('inputCoordLat')) $('inputCoordLat').value = lat;
    if ($('inputCoordLon')) $('inputCoordLon').value = lon;
  };
});

window.addEventListener('keydown', e => {
  const modal = $('coordModal');
  const isOpen = modal && modal.style.display !== 'none';
  if (e.key.toLowerCase() === 'f' && !isOpen && document.activeElement?.tagName !== 'INPUT') {
    e.preventDefault();
    openCoordModal();
  } else if (e.key === 'Escape' && isOpen) {
    e.preventDefault();
    closeCoordModal();
  } else if (e.key === 'Escape') {
    const resultsDropdown = $('geSearchResults');
    if (resultsDropdown && resultsDropdown.style.display !== 'none') {
      resultsDropdown.style.display = 'none';
    }
  }
}, true);

// Close search dropdown on outside click
document.addEventListener('click', e => {
  const dropdown = $('geSearchResults');
  if (dropdown && dropdown.style.display !== 'none') {
    const searchBar = document.querySelector('.ge-search-bar');
    if (!dropdown.contains(e.target) && (!searchBar || !searchBar.contains(e.target))) {
      dropdown.style.display = 'none';
    }
  }
});

if ($('ge-search-input')) {
  $('ge-search-input').oninput = e => {
    const val = e.target.value.trim();
    const clearBtn = $('btnSearchClear');
    if (clearBtn) clearBtn.style.display = val ? 'flex' : 'none';
  };

  $('ge-search-input').onkeydown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = e.target.value.trim();
      if (!q) {
        openCoordModal();
        return;
      }
      searchLocation(q);
    }
  };
}

/* ==================================================================
   16. BOOT SEQUENCE
   ================================================================== */
if (viewer) {
  const off = viewer.scene.postRender.addEventListener(() => {
    setTimeout(() => { setCesiumReady(); off(); }, 1200);
  });
  centerGlobe(3.2);
  updateCameraHUD();
  if (zoomRange) paintSlider(heightToSlider(HOME.height));
}

initLabelsLayer();
initArgoFloatNetwork();
initSpatialLayers();
initLayerControls();

// Pre-load default Argo Float profile for Station Profile inspection (panel starts collapsed)
if (ARGO_FLOAT_NETWORK.length > 0) {
  selectArgoFloat(ARGO_FLOAT_NETWORK[0], false, false);
}

// Fallback readiness timer
setTimeout(() => setCesiumReady(), 3500);

// Passive GPS discovery
setTimeout(() => {
  getUserCurrentLocation(false);
}, 1500);
