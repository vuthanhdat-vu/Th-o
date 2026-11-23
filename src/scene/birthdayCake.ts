import * as THREE from 'three';

export interface BirthdayCakeRig {
  root: THREE.Group;
  heartPivot: THREE.Group; // Keep name for seamless drop-in compatibility with stage
  hitProxy: THREE.Mesh;
  triggerImpulse: () => void;
  update: (elapsed: number, delta: number, isHovered: boolean) => void;
  dispose: () => void;
}

/**
 * Creates a tear-drop 3D candle flame geometry.
 */
function createFlameGeometry(): THREE.BufferGeometry {
  const points: THREE.Vector2[] = [];
  const segments = 16;
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    // Teardrop profile: bottom rounded, top pointed
    const radius = Math.sin(t * Math.PI) * (1 - t * 0.5) * 0.06;
    const y = t * 0.22;
    points.push(new THREE.Vector2(Math.max(0, radius), y));
  }
  return new THREE.LatheGeometry(points, 16);
}

/**
 * Creates a strawberry geometry (tapered rounded cone).
 */
function createStrawberryGeometry(): THREE.BufferGeometry {
  const points: THREE.Vector2[] = [];
  const segments = 14;
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const r = Math.sin(t * Math.PI * 0.85) * (0.09 - t * 0.04);
    const y = (1 - t) * 0.18;
    points.push(new THREE.Vector2(Math.max(0, r), y));
  }
  return new THREE.LatheGeometry(points, 14);
}

/**
 * Procedural honed dark marble pedestal maps for the base plinth.
 */
function createMarblePedestalMaps(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 512;
  const aCanvas = document.createElement('canvas');
  aCanvas.width = size;
  aCanvas.height = size;
  const aCtx = aCanvas.getContext('2d');

  const rCanvas = document.createElement('canvas');
  rCanvas.width = size;
  rCanvas.height = size;
  const rCtx = rCanvas.getContext('2d');

  const bCanvas = document.createElement('canvas');
  bCanvas.width = size;
  bCanvas.height = size;
  const bCtx = bCanvas.getContext('2d');

  if (aCtx && rCtx && bCtx) {
    const baseGrad = aCtx.createLinearGradient(0, 0, size, size);
    baseGrad.addColorStop(0, '#1e1526');
    baseGrad.addColorStop(0.5, '#261a30');
    baseGrad.addColorStop(1, '#181020');
    aCtx.fillStyle = baseGrad;
    aCtx.fillRect(0, 0, size, size);

    rCtx.fillStyle = '#6e6e6e';
    rCtx.fillRect(0, 0, size, size);

    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, size, size);

    // Warm champagne-rose veins
    for (let v = 0; v < 18; v += 1) {
      let x = (v * 67) % size;
      let y = 0;
      aCtx.strokeStyle = v % 4 === 0 ? 'rgba(235, 185, 170, 0.22)' : 'rgba(210, 180, 220, 0.14)';
      aCtx.lineWidth = 1.6;
      aCtx.beginPath();
      aCtx.moveTo(x, y);

      for (let step = 0; step < 32; step += 1) {
        y += size / 30;
        x += Math.sin(step * 0.65 + v * 2.1) * 16 + Math.cos(step * 1.4 + v) * 6;
        aCtx.lineTo(x, y);
      }
      aCtx.stroke();
    }
  }

  const map = new THREE.CanvasTexture(aCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = maxAnisotropy;

  const roughnessMap = new THREE.CanvasTexture(rCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.anisotropy = maxAnisotropy;

  return { map, roughnessMap, bumpMap };
}

/**
 * Procedural spiral striped texture for birthday candles.
 */
function createCandleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#fff9fb';
    ctx.fillRect(0, 0, 128, 256);

    ctx.fillStyle = '#f472b6';
    for (let y = -128; y < 384; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(128, y + 64);
      ctx.lineTo(128, y + 80);
      ctx.lineTo(0, y + 16);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#f59e0b';
    for (let y = -128; y < 384; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y + 18);
      ctx.lineTo(128, y + 82);
      ctx.lineTo(128, y + 90);
      ctx.lineTo(0, y + 26);
      ctx.closePath();
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createBirthdayCake(
  _isSoftwareGl: boolean,
  maxAnisotropy: number,
): BirthdayCakeRig {
  const root = new THREE.Group();
  const cakePivot = new THREE.Group();
  cakePivot.position.set(0, -0.65, 0); // Positioned comfortably on the marble pedestal
  root.add(cakePivot);

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const marbleMaps = createMarblePedestalMaps(maxAnisotropy);
  textures.push(marbleMaps.map, marbleMaps.roughnessMap, marbleMaps.bumpMap);

  const candleTex = createCandleTexture();
  textures.push(candleTex);

  // =========================================================================
  // 1. GORGEOUS GOLDEN & PASTEL TIERED CAKE
  // =========================================================================

  // Material Palette
  const goldMetalMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#f5c589'),
    metalness: 0.88,
    roughness: 0.18,
    clearcoat: 0.65,
    clearcoatRoughness: 0.1,
    reflectivity: 1.0,
  });
  materials.push(goldMetalMat);

  const tier1FondantMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#f9a8d4'), // Radiant pastel pink
    roughness: 0.45,
    metalness: 0.02,
    clearcoat: 0.35,
    clearcoatRoughness: 0.25,
  });
  materials.push(tier1FondantMat);

  const tier2FondantMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#fff7ed'), // French cream / champagne
    roughness: 0.40,
    metalness: 0.02,
    clearcoat: 0.45,
  });
  materials.push(tier2FondantMat);

  const tier3FondantMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#f472b6'), // Sweet strawberry rose
    roughness: 0.38,
    metalness: 0.02,
    clearcoat: 0.50,
  });
  materials.push(tier3FondantMat);

  const whiteCreamMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#ffffff'),
    roughness: 0.22,
    metalness: 0.0,
    clearcoat: 0.75,
    clearcoatRoughness: 0.1,
  });
  materials.push(whiteCreamMat);

  const strawberryMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#e11d48'),
    roughness: 0.15,
    metalness: 0.05,
    clearcoat: 0.95,
    clearcoatRoughness: 0.05,
    emissive: new THREE.Color('#880018'),
    emissiveIntensity: 0.25,
  });
  materials.push(strawberryMat);

  const leafMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#16a34a'),
    roughness: 0.5,
  });
  materials.push(leafMat);

  const candleMat = new THREE.MeshStandardMaterial({
    map: candleTex,
    roughness: 0.35,
    metalness: 0.05,
  });
  materials.push(candleMat);

  const wickMat = new THREE.MeshBasicMaterial({ color: '#262626' });
  materials.push(wickMat);

  // Flame Material (Inner white glow + outer blazing gold amber)
  const flameMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#fffbeb'),
    emissive: new THREE.Color('#f59e0b'),
    emissiveIntensity: 3.5,
    roughness: 0.1,
    metalness: 0.0,
  });
  materials.push(flameMat);

  const flameGlowMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#ffedd5'),
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
  });
  materials.push(flameGlowMat);

  // --- Ornate Golden Cake Platter Base ---
  const platterGeo = new THREE.CylinderGeometry(1.72, 1.58, 0.08, 64);
  geometries.push(platterGeo);
  const platterMesh = new THREE.Mesh(platterGeo, goldMetalMat);
  platterMesh.position.y = 0.04;
  cakePivot.add(platterMesh);

  const platterRimGeo = new THREE.TorusGeometry(1.72, 0.04, 16, 64);
  platterRimGeo.rotateX(Math.PI / 2);
  geometries.push(platterRimGeo);
  const platterRim = new THREE.Mesh(platterRimGeo, goldMetalMat);
  platterRim.position.y = 0.08;
  cakePivot.add(platterRim);

  // --- TIER 1 (Bottom Tier: Radius 1.45, Height 0.68) ---
  const tier1Y = 0.08 + 0.34;
  const tier1Geo = new THREE.CylinderGeometry(1.45, 1.45, 0.68, 64);
  geometries.push(tier1Geo);
  const tier1Mesh = new THREE.Mesh(tier1Geo, tier1FondantMat);
  tier1Mesh.position.y = tier1Y;
  tier1Mesh.castShadow = true;
  tier1Mesh.receiveShadow = true;
  cakePivot.add(tier1Mesh);

  // Tier 1 Gold Pearl Border (Bottom Rim)
  const pearlGeo = new THREE.SphereGeometry(0.048, 12, 12);
  geometries.push(pearlGeo);
  const pearlCount = 36;
  for (let i = 0; i < pearlCount; i += 1) {
    const angle = (i / pearlCount) * Math.PI * 2;
    const px = Math.cos(angle) * 1.47;
    const pz = Math.sin(angle) * 1.47;
    const pearl = new THREE.Mesh(pearlGeo, goldMetalMat);
    pearl.position.set(px, 0.12, pz);
    cakePivot.add(pearl);
  }

  // Tier 1 Cream Drip Border (Top Rim)
  const creamDropGeo = new THREE.SphereGeometry(0.065, 12, 12);
  geometries.push(creamDropGeo);
  const creamDripCount = 32;
  for (let i = 0; i < creamDripCount; i += 1) {
    const angle = (i / creamDripCount) * Math.PI * 2;
    const cx = Math.cos(angle) * 1.46;
    const cz = Math.sin(angle) * 1.46;
    const drip = new THREE.Mesh(creamDropGeo, whiteCreamMat);
    drip.scale.set(1.0, 1.35, 1.0);
    drip.position.set(cx, 0.74, cz);
    cakePivot.add(drip);
  }

  // --- TIER 2 (Middle Tier: Radius 1.02, Height 0.58) ---
  const tier2Y = 0.76 + 0.29;
  const tier2Geo = new THREE.CylinderGeometry(1.02, 1.02, 0.58, 64);
  geometries.push(tier2Geo);
  const tier2Mesh = new THREE.Mesh(tier2Geo, tier2FondantMat);
  tier2Mesh.position.y = tier2Y;
  tier2Mesh.castShadow = true;
  tier2Mesh.receiveShadow = true;
  cakePivot.add(tier2Mesh);

  // Middle Tier Gold Ribbon Belt
  const ribbonGeo = new THREE.CylinderGeometry(1.035, 1.035, 0.09, 64);
  geometries.push(ribbonGeo);
  const ribbonMesh = new THREE.Mesh(ribbonGeo, goldMetalMat);
  ribbonMesh.position.y = tier2Y;
  cakePivot.add(ribbonMesh);

  // Middle Tier Cream Rosettes & Strawberries on Ledge
  const rosetteGeo = new THREE.DodecahedronGeometry(0.062, 1);
  geometries.push(rosetteGeo);
  const strawberryGeo = createStrawberryGeometry();
  geometries.push(strawberryGeo);

  const tier1LedgeCount = 12;
  for (let i = 0; i < tier1LedgeCount; i += 1) {
    const angle = (i / tier1LedgeCount) * Math.PI * 2 + 0.15;
    const rx = Math.cos(angle) * 1.24;
    const rz = Math.sin(angle) * 1.24;

    if (i % 2 === 0) {
      // Glazed Strawberry
      const berry = new THREE.Mesh(strawberryGeo, strawberryMat);
      berry.position.set(rx, 0.78, rz);
      berry.rotation.set(0.2, angle, -0.15);
      cakePivot.add(berry);
    } else {
      // Cream Rosette
      const rosette = new THREE.Mesh(rosetteGeo, whiteCreamMat);
      rosette.scale.set(1.2, 0.9, 1.2);
      rosette.position.set(rx, 0.80, rz);
      cakePivot.add(rosette);
    }
  }

  // --- TIER 3 (Top Tier: Radius 0.62, Height 0.48) ---
  const tier3Y = 1.34 + 0.24;
  const tier3Geo = new THREE.CylinderGeometry(0.62, 0.62, 0.48, 64);
  geometries.push(tier3Geo);
  const tier3Mesh = new THREE.Mesh(tier3Geo, tier3FondantMat);
  tier3Mesh.position.y = tier3Y;
  tier3Mesh.castShadow = true;
  tier3Mesh.receiveShadow = true;
  cakePivot.add(tier3Mesh);

  // Tier 2 Ledge Cream Rosettes
  const tier2LedgeCount = 10;
  for (let i = 0; i < tier2LedgeCount; i += 1) {
    const angle = (i / tier2LedgeCount) * Math.PI * 2;
    const rx = Math.cos(angle) * 0.82;
    const rz = Math.sin(angle) * 0.82;
    const rosette = new THREE.Mesh(rosetteGeo, whiteCreamMat);
    rosette.scale.set(1.1, 0.85, 1.1);
    rosette.position.set(rx, 1.36, rz);
    cakePivot.add(rosette);
  }

  // Top Surface Cream Rosettes around edge
  const topRosetteCount = 8;
  for (let i = 0; i < topRosetteCount; i += 1) {
    const angle = (i / topRosetteCount) * Math.PI * 2;
    const rx = Math.cos(angle) * 0.52;
    const rz = Math.sin(angle) * 0.52;
    const rosette = new THREE.Mesh(rosetteGeo, whiteCreamMat);
    rosette.scale.set(1.0, 0.8, 1.0);
    rosette.position.set(rx, 1.84, rz);
    cakePivot.add(rosette);
  }

  // Crown Strawberries on top
  const crownBerryCount = 4;
  for (let i = 0; i < crownBerryCount; i += 1) {
    const angle = (i / crownBerryCount) * Math.PI * 2 + Math.PI / 4;
    const bx = Math.cos(angle) * 0.32;
    const bz = Math.sin(angle) * 0.32;
    const berry = new THREE.Mesh(strawberryGeo, strawberryMat);
    berry.position.set(bx, 1.84, bz);
    berry.rotation.set(0.18, angle, -0.12);
    cakePivot.add(berry);
  }

  // Centerpiece Golden Birthday Crown / Star Plate
  const centerStarGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.04, 8);
  geometries.push(centerStarGeo);
  const centerStar = new THREE.Mesh(centerStarGeo, goldMetalMat);
  centerStar.position.set(0, 1.84, 0);
  cakePivot.add(centerStar);

  // --- CANDLES & FLAMES (5 Spiral Candles in Circle on Top) ---
  const candleGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.36, 16);
  geometries.push(candleGeo);
  const wickGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.05, 8);
  geometries.push(wickGeo);
  const flameGeo = createFlameGeometry();
  geometries.push(flameGeo);
  const flameGlowGeo = new THREE.SphereGeometry(0.065, 12, 12);
  geometries.push(flameGlowGeo);

  const candleRigs: Array<{ flame: THREE.Mesh; glow: THREE.Mesh; baseX: number; baseZ: number; phase: number }> = [];
  const candleCount = 5;
  const candleRadius = 0.24;

  for (let i = 0; i < candleCount; i += 1) {
    const angle = (i / candleCount) * Math.PI * 2;
    const cx = Math.cos(angle) * candleRadius;
    const cz = Math.sin(angle) * candleRadius;
    const candleBaseY = 1.84 + 0.18;

    // Candle Stick
    const candleMesh = new THREE.Mesh(candleGeo, candleMat);
    candleMesh.position.set(cx, candleBaseY, cz);
    candleMesh.castShadow = true;
    cakePivot.add(candleMesh);

    // Wick
    const wick = new THREE.Mesh(wickGeo, wickMat);
    wick.position.set(cx, candleBaseY + 0.18 + 0.025, cz);
    cakePivot.add(wick);

    // Flame
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(cx, candleBaseY + 0.20, cz);
    cakePivot.add(flame);

    // Flame Glow halo
    const glow = new THREE.Mesh(flameGlowGeo, flameGlowMat);
    glow.position.set(cx, candleBaseY + 0.28, cz);
    cakePivot.add(glow);

    candleRigs.push({
      flame,
      glow,
      baseX: cx,
      baseZ: cz,
      phase: i * 1.45,
    });
  }

  // Warm Candlelight PointLight
  const candleLight = new THREE.PointLight('#ffb366', 2.8, 9.0, 1.8);
  candleLight.position.set(0, 2.35, 0);
  cakePivot.add(candleLight);

  // Floating Golden Sparkle Rings around the cake
  const ring1Geo = new THREE.TorusGeometry(3.6, 0.008, 16, 100);
  ring1Geo.rotateX(Math.PI / 2.2);
  geometries.push(ring1Geo);
  const ringMat = new THREE.MeshStandardMaterial({
    color: '#fef08a',
    emissive: '#f59e0b',
    emissiveIntensity: 1.8,
    roughness: 0.2,
    metalness: 0.8,
  });
  materials.push(ringMat);

  const ring1Mesh = new THREE.Mesh(ring1Geo, ringMat);
  cakePivot.add(ring1Mesh);

  const ring2Geo = new THREE.TorusGeometry(4.2, 0.007, 16, 100);
  ring2Geo.rotateX(Math.PI / 1.8);
  geometries.push(ring2Geo);
  const ring2Mesh = new THREE.Mesh(ring2Geo, ringMat);
  cakePivot.add(ring2Mesh);

  // =========================================================================
  // 2. TURNED HONED DARK MARBLE PEDESTAL PLINTH
  // =========================================================================
  const pedestalGroup = new THREE.Group();
  pedestalGroup.position.set(0, -2.35, 0);

  const lathePoints = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(1.94, 0.0),
    new THREE.Vector2(1.94, 0.09),
    new THREE.Vector2(1.82, 0.16),
    new THREE.Vector2(1.54, 0.18),
    new THREE.Vector2(1.44, 0.29),
    new THREE.Vector2(1.30, 0.31),
    new THREE.Vector2(0.0, 0.31),
  ];
  const pedestalGeo = new THREE.LatheGeometry(lathePoints, 72);
  geometries.push(pedestalGeo);

  const pedestalMat = new THREE.MeshPhysicalMaterial({
    map: marbleMaps.map,
    roughnessMap: marbleMaps.roughnessMap,
    bumpMap: marbleMaps.bumpMap,
    bumpScale: 0.012,
    roughness: 0.56,
    metalness: 0.06,
    clearcoat: 0.28,
  });
  materials.push(pedestalMat);

  const pedestalMesh = new THREE.Mesh(pedestalGeo, pedestalMat);
  pedestalMesh.receiveShadow = true;
  pedestalGroup.add(pedestalMesh);

  // Gold rim on pedestal base
  const glowRimMat = new THREE.MeshStandardMaterial({
    color: '#ffd0a8',
    emissive: '#f59e0b',
    emissiveIntensity: 1.6,
    roughness: 0.3,
    metalness: 0.7,
  });
  materials.push(glowRimMat);

  const baseGlowRimGeo = new THREE.TorusGeometry(1.94, 0.018, 12, 80);
  baseGlowRimGeo.rotateX(Math.PI / 2);
  geometries.push(baseGlowRimGeo);
  const baseGlowRimMesh = new THREE.Mesh(baseGlowRimGeo, glowRimMat);
  baseGlowRimMesh.position.y = 0.02;
  pedestalGroup.add(baseGlowRimMesh);

  // 3 concentric water ripples
  const rippleRings: THREE.Mesh[] = [];
  const rippleMats: THREE.MeshBasicMaterial[] = [];
  const rippleGeo = new THREE.RingGeometry(0.96, 1.04, 80);
  rippleGeo.rotateX(-Math.PI / 2);
  geometries.push(rippleGeo);

  for (let r = 0; r < 3; r += 1) {
    const rMat = new THREE.MeshBasicMaterial({
      color: '#fed7aa',
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    rippleMats.push(rMat);
    materials.push(rMat);

    const rMesh = new THREE.Mesh(rippleGeo, rMat);
    rMesh.position.y = 0.012;
    pedestalGroup.add(rMesh);
    rippleRings.push(rMesh);
  }

  root.add(pedestalGroup);

  // Raycast Hit Proxy
  const hitGeo = new THREE.CylinderGeometry(1.65, 1.65, 2.5, 16);
  geometries.push(hitGeo);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  materials.push(hitMat);
  const hitProxy = new THREE.Mesh(hitGeo, hitMat);
  hitProxy.position.set(0, 0.35, 0);
  hitProxy.layers.set(1);
  hitProxy.userData = { interactType: 'heart' }; // Keeps 'heart' click event
  root.add(hitProxy);

  let impulse = 0;
  let hoverScale = 0;

  return {
    root,
    heartPivot: cakePivot,
    hitProxy,
    triggerImpulse: () => {
      impulse = 1.0;
    },
    update: (elapsed: number, delta: number, isHovered: boolean) => {
      impulse = THREE.MathUtils.damp(impulse, 0, 2.5, delta);
      hoverScale = THREE.MathUtils.damp(hoverScale, isHovered ? 1 : 0, 7.5, delta);

      // Gentle floating levitation & joyful pulse
      const floatY = -0.55 + Math.sin(elapsed * 1.15) * 0.06;
      cakePivot.position.y = floatY;

      const scalePulse = 1 + Math.sin(elapsed * 1.5) * 0.015 + impulse * 0.12 + hoverScale * 0.035;
      cakePivot.scale.set(scalePulse, scalePulse, scalePulse);

      // Smooth slow majestic showcase rotation
      cakePivot.rotation.y = elapsed * 0.18;

      // Rotate sparkle rings
      ring1Mesh.rotation.z = elapsed * 0.08;
      ring2Mesh.rotation.z = -elapsed * 0.06;

      // Candle flames flicker animation
      for (let i = 0; i < candleRigs.length; i += 1) {
        const c = candleRigs[i];
        const flicker = 0.88 + 0.22 * Math.sin(elapsed * 16.0 + c.phase) + 0.12 * Math.cos(elapsed * 24.0);
        c.flame.scale.set(flicker, flicker * 1.15, flicker);
        c.glow.scale.setScalar(flicker);
        c.flame.rotation.z = Math.sin(elapsed * 8.0 + c.phase) * 0.08;
      }

      // PointLight warmth flicker
      candleLight.intensity = 2.6 + Math.sin(elapsed * 14.0) * 0.45 + impulse * 2.2;

      // Animate water ripples expanding from pedestal
      for (let r = 0; r < 3; r += 1) {
        const phase = ((elapsed * 0.32 + r * 0.333) % 1.0);
        const currentRadius = 1.95 + phase * 2.90;
        rippleRings[r].scale.set(currentRadius, 1, currentRadius);
        const alpha = Math.sin(phase * Math.PI) * (1.0 - phase * 0.55) * 0.40;
        rippleMats[r].opacity = alpha;
      }
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
