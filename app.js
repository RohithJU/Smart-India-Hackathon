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
  b.innerHTML = '<span>⚠️</span><span>' + html + '</span>';
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

  // Hover marker
  targetIndicator = viewer.entities.add({
    name: 'Sampling coordinate',
    position: Cesium.Cartesian3.ZERO, show: false,
    point: {
      pixelSize: 9, color: Cesium.Color.fromCssColorString('#00f2fe'),
      outlineColor: Cesium.Color.WHITE, outlineWidth: 2,
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
      text: '📍 MY LOCATION',
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

function renderLoading(lat, lon) {
  if (locked) return;
  setPill('load', 'SAMPLING');
  $('stIcon').textContent = '🔍';
  $('stTitle').textContent = 'Sampling Station';
  $('locBanner').className = 'loc-banner';
  $('locIcon').textContent = '🔍';
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
  $('locIcon').textContent = '⚠️';
  $('locText').textContent = 'Connection issue';
  $('stContent').innerHTML =
    '<div class="msgbox error"><div style="font-size:1.2rem">⚠️</div><div class="mt">' + msg + '</div></div>';
}

function metric(label, value, unit, colorVar, sub) {
  return '<div class="metric" style="--c:' + colorVar + '">' +
    '<div class="lab">' + label + '</div>' +
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
    $('stIcon').textContent = '📍';
    $('stTitle').textContent = 'Land Station';
    $('locBanner').className = 'loc-banner land';
    $('locIcon').textContent = '📍';
  } else {
    setPill('ocean', 'OCEANIC');
    $('stIcon').textContent = '🌊';
    $('stTitle').textContent = 'Marine Station';
    $('locBanner').className = 'loc-banner ocean';
    $('locIcon').textContent = '🌊';
  }
  $('locText').textContent = s.name;
  $('locText').title = s.name;

  /* ---- Marine block ---- */
  if (!s.isLand) {
    html += '<div class="section-label">Marine conditions</div><div class="metric-grid">';
    html += metric('🌡️ Sea temp', sst !== null ? sst.toFixed(1) : '--', '°C', 'var(--temp)');
    html += metric('🌊 Wave height', wave !== null ? wave.toFixed(2) : '--', 'm', 'var(--wave)',
      wavePer !== null ? wavePer.toFixed(1) + ' s period' : null);
    const dirSub = dir !== null ? Math.round(dir) + '° ' + compassLabel(dir) : null;
    html += '<div class="metric wide" style="--c:var(--curr)">' +
      '<div class="lab">🧭 Surface current</div>' +
      '<div class="val" style="justify-content:space-between;width:100%">' +
      '<div><span class="num">' + (vel !== null ? vel.toFixed(1) : '--') + '</span><span class="unit"> km/h</span></div>' +
      '<div style="display:flex;align-items:center;gap:6px">' +
      '<span class="unit" style="font-family:var(--mono);font-weight:600">' + (dirSub || '--') + '</span>' +
      '<div class="compass" style="transform:rotate(' + (dir !== null ? dir : 0) + 'deg)">' +
      '<svg viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>' +
      '</div></div></div></div>';
    if (waveDir !== null) {
      html += metric('↗️ Wave dir', Math.round(waveDir) + '°', compassLabel(waveDir), 'var(--wave)');
      html += metric('🌊 Sea state', wave === null ? '--' : (wave < 0.5 ? 'Calm' : wave < 1.25 ? 'Slight' : wave < 2.5 ? 'Moderate' : wave < 4 ? 'Rough' : 'Very rough'), '', 'var(--wave)');
    }
    html += '</div>';
  }

  /* ---- Atmosphere + position block ---- */
  html += '<div class="section-label">Atmosphere &amp; position</div><div class="metric-grid">';
  html += metric('🌡️ Air temp', airT !== null ? airT.toFixed(1) : '--', '°C', 'var(--temp)');
  html += metric('💨 Wind speed', wind !== null ? wind.toFixed(1) : '--', 'km/h', 'var(--wind)',
    windDir !== null ? Math.round(windDir) + '° ' + compassLabel(windDir) : null);
  html += metric('⛰️ Elevation', s.elevation !== null ? Math.round(s.elevation) : '--', 'm', 'var(--alt)',
    s.isLand ? 'above mean sea level' : 'model surface');
  html += metric('💧 Humidity', hum !== null ? Math.round(hum) : '--', '%', 'var(--teal)');
  html += metric('🔽 Pressure', pres !== null ? Math.round(pres) : '--', 'hPa', 'var(--teal)');
  html += metric('🛰️ Eye altitude', fmtDist(camHeight()), '', 'var(--cyan)', 'camera above surface');
  html += '</div>';

  if (s.isLand && s.geo) {
    const g = s.geo;
    html += '<div class="section-label">Gazetteer</div><div class="metric-grid">';
    if (g.country) html += metric('🏳️ Country', g.country, '', 'var(--alt)');
    if (g.continent) html += metric('🌍 Continent', g.continent, '', 'var(--alt)');
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
    $('hSpeed').textContent = Number(vel).toFixed(1) + ' km/h ⇢';
  else if (wind !== null && wind !== undefined)
    $('hSpeed').textContent = Number(wind).toFixed(1) + ' km/h 💨';
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

  if (!sliderBusy) {
    const v = heightToSlider(h);
    zoomRange.value = v;
    paintSlider(v);
  }
}

/* ---- Hover tooltip ---- */
const tip = $('tip');
function showTip() { tip.classList.add('on'); }
function hideTip() { tip.classList.remove('on'); }
function positionTip(x, y) {
  const w = 232, hgt = 150, pad = 12;
  let px = x + 20, py = y + 20;
  if (px + w > window.innerWidth - pad) px = x - w - 20;
  if (py + hgt > window.innerHeight - pad) py = y - hgt - 20;
  tip.style.left = Math.max(pad, px) + 'px';
  tip.style.top = Math.max(pad, py) + 'px';
}
function tipQuick(lat, lon) {
  $('tipCoord').textContent = '🌐 ' + fmtCoord(lat, lon);
  $('tipName').textContent = getOfflineOceanName(lat, lon);
  $('tipRows').innerHTML = '<div class="tr"><span>Status</span><b style="color:var(--teal)">sampling…</b></div>';
}
function tipFromSample(s) {
  const m = s.marine || {}, a = s.air || {};
  $('tipCoord').textContent = '🌐 ' + fmtCoord(s.lat, s.lon);
  $('tipName').textContent = s.name;
  let rows = '';
  if (!s.isLand) {
    if (m.sea_surface_temperature != null) rows += '<div class="tr"><span>Sea temp</span><b style="color:var(--temp)">' + Number(m.sea_surface_temperature).toFixed(1) + ' °C</b></div>';
    if (m.wave_height != null) rows += '<div class="tr"><span>Wave</span><b style="color:var(--wave)">' + Number(m.wave_height).toFixed(2) + ' m</b></div>';
    if (m.ocean_current_velocity != null) rows += '<div class="tr"><span>Current</span><b style="color:var(--curr)">' + Number(m.ocean_current_velocity).toFixed(1) + ' km/h</b></div>';
  }
  if (a.temperature_2m != null) rows += '<div class="tr"><span>Air temp</span><b style="color:var(--temp)">' + Number(a.temperature_2m).toFixed(1) + ' °C</b></div>';
  if (a.wind_speed_10m != null) rows += '<div class="tr"><span>Wind</span><b style="color:var(--wind)">' + Number(a.wind_speed_10m).toFixed(1) + ' km/h</b></div>';
  if (s.elevation != null) rows += '<div class="tr"><span>Elevation</span><b style="color:var(--alt)">' + Math.round(s.elevation) + ' m</b></div>';
  $('tipRows').innerHTML = rows || '<div class="tr"><span>No model data</span><b>--</b></div>';
}

/* ==================================================================
   8. HOVER / CLICK INTERACTION
   ================================================================== */
let hoverTimer = null, lastLat = null, lastLon = null;

if (viewer) {
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

  handler.setInputAction(mv => {
    positionTip(mv.endPosition.x, mv.endPosition.y);

    const cart = viewer.camera.pickEllipsoid(mv.endPosition, viewer.scene.globe.ellipsoid);
    if (!cart) {
      clearTimeout(hoverTimer); abortActive(); hideTip();
      targetIndicator.show = false;
      $('hCoord').textContent = '— space —';
      return;
    }
    const carto = Cesium.Cartographic.fromCartesian(cart);
    const lon = Cesium.Math.toDegrees(carto.longitude);
    const lat = Cesium.Math.toDegrees(carto.latitude);

    targetIndicator.position = cart;
    targetIndicator.show = true;
    $('hCoord').textContent = fmtCoord(lat, lon);

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
    targetIndicator.show = false;
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
        currentLocationIndicator.label.text = '📍 ' + locName.toUpperCase();
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

let panelsOn = true;
$('btnPanels').onclick = e => {
  panelsOn = !panelsOn;
  $('station').classList.toggle('collapsed', !panelsOn);
  $('layersPanel').classList.toggle('collapsed', !panelsOn);
  e.currentTarget.classList.toggle('on', panelsOn);
};

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
    case 'h': case 'H': $('btnPanels').click(); break;
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
