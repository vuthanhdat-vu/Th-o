import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

export interface HeartSculptureRig {
  root: THREE.Group;
  heartPivot: THREE.Group;
  hitProxy: THREE.Mesh;
  triggerImpulse: () => void;
  update: (elapsed: number, delta: number, isHovered: boolean) => void;
  dispose: () => void;
}

/**
 * Evaluates a point on the classic smooth heart contour for angle u in [0, 2π].
 */
function sampleHeartContour(u: number, scale: number): { x: number; y: number } {
  const s = Math.sin(u);
  const x = 16 * s * s * s * 0.078 * scale;
  const y =
    (13 * Math.cos(u) -
      5 * Math.cos(2 * u) -
      2 * Math.cos(3 * u) -
      Math.cos(4 * u)) *
    0.078 *
    scale;
  return { x, y };
}

/**
 * Keeps exported 2D shape helper for micro-heart particle instances.
 */
export function createHeartShape(scale = 1): THREE.Shape {
  const shape = new THREE.Shape();
  const segments = 64;
  for (let i = 0; i <= segments; i += 1) {
    const u = (i / segments) * Math.PI * 2;
    const pt = sampleHeartContour(u, scale);
    if (i === 0) shape.moveTo(pt.x, pt.y);
    else shape.lineTo(pt.x, pt.y);
  }
  shape.closePath();
  return shape;
}

/**
 * Builds a true master-cut Heart Brilliant Gemstone BufferGeometry.
 * Constructs flat geometric crown and pavilion facets with alternating diamond offsets.
 * Non-indexed topology guarantees razor-sharp face normals for authentic ruby scintillation.
 */
function createMasterFacetedHeartGeometry(
  scale: number,
  depth: number,
  uSegs = 32,
  vSegs = 16,
): THREE.BufferGeometry {
  const yc = -3.0 * 0.078 * scale;
  const maxR = 16.5 * 0.078 * scale;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let j = 0; j <= vSegs; j += 1) {
    const v = j / vSegs;
    const phi = v * Math.PI; // 0 = front crown, pi/2 = equator rim, pi = back culet
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    // Faceted profile with crisp crown table and steep pavilion reflector facets
    const zProfile = Math.sign(cosPhi) * Math.pow(Math.abs(cosPhi), 0.76);
    const rFactor = Math.pow(sinPhi, 0.90);

    // Staggered diamond facet offset on alternating rings
    const uOffset = j % 2 === 1 ? Math.PI / uSegs : 0.0;

    for (let i = 0; i <= uSegs; i += 1) {
      const uNorm = i / uSegs;
      const u = uNorm * Math.PI * 2 + uOffset;
      const contour = sampleHeartContour(u, scale);

      const dx = contour.x;
      const dy = contour.y - yc;
      const radialLen = Math.hypot(dx, dy);

      const lobePlumpness = 0.58 + 0.42 * Math.min(1, radialLen / maxR);
      const cleftDistance = Math.abs(Math.sin(u * 0.5));
      const cleftPinch = 0.80 + 0.20 * Math.min(1, cleftDistance * 2.6);

      const px = dx * rFactor;
      const py = yc + dy * rFactor;
      const pz = depth * zProfile * lobePlumpness * cleftPinch;

      positions.push(px, py, pz);
      uvs.push(uNorm, v);
    }
  }

  const rowLen = uSegs + 1;
  for (let j = 0; j < vSegs; j += 1) {
    for (let i = 0; i < uSegs; i += 1) {
      const a = j * rowLen + i;
      const b = a + 1;
      const c = (j + 1) * rowLen + i;
      const d = c + 1;

      if (j !== 0) {
        indices.push(a, b, c);
      }
      if (j !== vSegs - 1) {
        indices.push(b, d, c);
      }
    }
  }

  const indexedGeo = new THREE.BufferGeometry();
  indexedGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  indexedGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  indexedGeo.setIndex(indices);
  indexedGeo.computeBoundingBox();
  const centerY = indexedGeo.boundingBox
    ? (indexedGeo.boundingBox.min.y + indexedGeo.boundingBox.max.y) * 0.5
    : 0;
  indexedGeo.translate(0, -centerY, 0);

  // Convert to non-indexed buffer geometry so every triangle is an independent flat optical facet
  const facetedGeo = indexedGeo.toNonIndexed();
  indexedGeo.dispose();
  facetedGeo.computeVertexNormals();
  facetedGeo.userData.centerYOffset = centerY;
  return facetedGeo;
}

/**
 * Procedural fine brushed rose-gold roughness & micro-bump textures (linear space).
 */
function createBrushedMetalMaps(maxAnisotropy: number): {
  roughnessMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 512;
  const rCanvas = document.createElement('canvas');
  rCanvas.width = size;
  rCanvas.height = size;
  const rCtx = rCanvas.getContext('2d');

  const bCanvas = document.createElement('canvas');
  bCanvas.width = size;
  bCanvas.height = size;
  const bCtx = bCanvas.getContext('2d');

  if (rCtx && bCtx) {
    rCtx.fillStyle = '#383838';
    rCtx.fillRect(0, 0, size, size);
    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, size, size);

    for (let y = 0; y < size; y += 1) {
      const n = Math.sin(y * 12.9898) * 43758.5453;
      const frac = n - Math.floor(n);
      const rShade = Math.floor(42 + frac * 42);
      const bShade = Math.floor(110 + frac * 36);
      rCtx.fillStyle = `rgb(${rShade},${rShade},${rShade})`;
      rCtx.fillRect(0, y, size, 1);
      bCtx.fillStyle = `rgb(${bShade},${bShade},${bShade})`;
      bCtx.fillRect(0, y, size, 1);
    }

    // Subtle micro-scratches
    for (let i = 0; i < 240; i += 1) {
      const y = (i * 37) % size;
      const x = (i * 97) % size;
      const w = 40 + (i % 120);
      bCtx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
      bCtx.fillRect(x, y, w, 1);
    }
  }

  const roughnessMap = new THREE.CanvasTexture(rCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(3, 3);
  roughnessMap.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(3, 3);
  bumpMap.anisotropy = maxAnisotropy;

  return { roughnessMap, bumpMap };
}

/**
 * Procedural honed dark obsidian-plum marble maps for the museum pedestal plinth.
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
    // Base honed dark obsidian-plum marble
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

    // Soft mineral clouds
    for (let i = 0; i < 65; i += 1) {
      const cx = (Math.sin(i * 19.1) * 0.5 + 0.5) * size;
      const cy = (Math.cos(i * 43.7) * 0.5 + 0.5) * size;
      const rad = 35 + (i % 75);
      const grad = aCtx.createRadialGradient(cx, cy, 4, cx, cy, rad);
      grad.addColorStop(0, i % 3 === 0 ? 'rgba(92, 62, 102, 0.14)' : 'rgba(18, 10, 26, 0.22)');
      grad.addColorStop(1, 'rgba(30, 20, 38, 0)');
      aCtx.fillStyle = grad;
      aCtx.beginPath();
      aCtx.arc(cx, cy, rad, 0, Math.PI * 2);
      aCtx.fill();
    }

    // Delicate warm champagne-rose & quartz veins
    for (let v = 0; v < 18; v += 1) {
      let x = (v * 67) % size;
      let y = 0;
      const isGoldVein = v % 4 === 0;
      aCtx.strokeStyle = isGoldVein
        ? 'rgba(222, 178, 158, 0.18)'
        : 'rgba(196, 174, 210, 0.11)';
      aCtx.lineWidth = isGoldVein ? 1.4 : 2.2;

      rCtx.strokeStyle = isGoldVein ? '#3c3c3c' : '#525252';
      rCtx.lineWidth = aCtx.lineWidth + 1;

      bCtx.strokeStyle = 'rgba(102, 102, 102, 0.45)';
      bCtx.lineWidth = aCtx.lineWidth;

      aCtx.beginPath();
      rCtx.beginPath();
      bCtx.beginPath();
      aCtx.moveTo(x, y);
      rCtx.moveTo(x, y);
      bCtx.moveTo(x, y);

      for (let step = 0; step < 32; step += 1) {
        y += size / 30;
        x += Math.sin(step * 0.65 + v * 2.1) * 16 + Math.cos(step * 1.4 + v) * 6;
        aCtx.lineTo(x, y);
        rCtx.lineTo(x, y);
        bCtx.lineTo(x, y);
      }
      aCtx.stroke();
      rCtx.stroke();
      bCtx.stroke();
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
 * Soft radial contact shadow beneath the marble pedestal.
 */
function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      size * 0.1,
      size / 2,
      size / 2,
      size * 0.5,
    );
    grad.addColorStop(0, 'rgba(6, 3, 10, 0.92)');
    grad.addColorStop(0.45, 'rgba(10, 5, 16, 0.52)');
    grad.addColorStop(0.75, 'rgba(14, 7, 22, 0.16)');
    grad.addColorStop(1, 'rgba(14, 7, 22, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Subtle warm optical caustic reflection on the stone pedestal directly beneath the ruby crystal.
 */
function createSubtleCausticTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      size * 0.03,
      size / 2,
      size / 2,
      size * 0.44,
    );
    grad.addColorStop(0, 'rgba(218, 92, 134, 0.24)');
    grad.addColorStop(0.42, 'rgba(232, 148, 142, 0.10)');
    grad.addColorStop(0.75, 'rgba(140, 82, 128, 0.03)');
    grad.addColorStop(1, 'rgba(140, 82, 128, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Natural double-beat (lub-dub) cardiac wave in [0, 1].
 */
function computeHeartbeatWave(phase: number): number {
  const p = phase % 1;
  const lub = Math.exp(-Math.pow((p - 0.14) / 0.055, 2));
  const dub = 0.6 * Math.exp(-Math.pow((p - 0.30) / 0.065, 2));
  return lub + dub;
}

export function createHeartSculpture(
  isSoftwareGl: boolean,
  maxAnisotropy: number,
): HeartSculptureRig {
  const root = new THREE.Group();
  const heartPivot = new THREE.Group();
  heartPivot.position.set(0, 0.24, 0);
  root.add(heartPivot);

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const brushedMaps = createBrushedMetalMaps(maxAnisotropy);
  textures.push(brushedMaps.roughnessMap, brushedMaps.bumpMap);

  const marbleMaps = createMarblePedestalMaps(maxAnisotropy);
  textures.push(marbleMaps.map, marbleMaps.roughnessMap, marbleMaps.bumpMap);

  // 1. Master-Cut Burma-Ruby Corundum Gemstone Shell (Faceted Brilliant Cut with True IOR 1.763)
  const outerGeo = createMasterFacetedHeartGeometry(1.02, 0.58, 32, 16);
  geometries.push(outerGeo);

  const outerCrystalMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#e00538'), // Radiant Burmese Pigeon-Blood Ruby
    emissive: new THREE.Color('#80001a'),
    emissiveIntensity: 0.18,
    roughness: 0.02, // Mirror-smooth optical gem facet polish
    metalness: 0.04,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    reflectivity: 1.0,
    specularIntensity: 0.90,
    specularColor: new THREE.Color('#ffffff'),
    ior: 1.763, // Corundum (Ruby) physical refractive index
    dispersion: 0.045, // Chromatic prism fire across facet edges
    thickness: 1.5,
    transmission: isSoftwareGl ? 0 : 0.65,
    attenuationColor: new THREE.Color('#ff0a45'),
    attenuationDistance: 2.2,
    iridescence: 0.18,
    iridescenceIOR: 1.763,
    iridescenceThicknessRange: [140, 360],
    envMapIntensity: 1.10,
    flatShading: true, // Guarantees razor-sharp geometric facet reflection & scintillation
    transparent: isSoftwareGl,
    opacity: isSoftwareGl ? 0.75 : 1.0,
    depthWrite: !isSoftwareGl,
  });
  materials.push(outerCrystalMat);

  const outerHeartMesh = new THREE.Mesh(outerGeo, outerCrystalMat);
  outerHeartMesh.castShadow = false;
  outerHeartMesh.receiveShadow = true;
  outerHeartMesh.renderOrder = 2;
  heartPivot.add(outerHeartMesh);

  // 2. Faceted Inner Pavilion Reflector Core (High-Luster Ruby Pavilion producing internal TIR reflection)
  const coreGeo = createMasterFacetedHeartGeometry(0.82, 0.44, 28, 14);
  geometries.push(coreGeo);

  const coreRubyMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#ff0f4a'),
    emissive: new THREE.Color('#e0063c'),
    emissiveIntensity: 0.35,
    roughness: 0.04,
    metalness: 0.22, // Metallic reflector simulates internal total internal reflection
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    reflectivity: 1.0,
    envMapIntensity: 1.20,
    flatShading: true,
  });
  materials.push(coreRubyMat);

  const coreHeartMesh = new THREE.Mesh(coreGeo, coreRubyMat);
  coreHeartMesh.renderOrder = 1;
  heartPivot.add(coreHeartMesh);

  // 3. Thin Glowing Orbital Filament Rings (Ultra-thin TorusGeometry with soft rose-gold / blush emissive glow)
  // Rotating gently at varied inclinations (12°-18° Saturn-style tilt) connecting heart & photo frames
  const ringGroup = new THREE.Group();
  root.add(ringGroup);

  const ringMat = new THREE.MeshStandardMaterial({
    color: '#ffe5ec',
    emissive: '#fca3b9',
    emissiveIntensity: 1.85, // Gently triggers UnrealBloomPass (1.55) without harsh flares
    roughness: 0.22,
    metalness: 0.35,
  });
  materials.push(ringMat);

  // Ring 1: Main tilted orbit (inclined ~15.5° matching the tilted photo orbit plane)
  const ring1Group = new THREE.Group();
  ring1Group.rotation.set(0.27, 0.0, 0.11);
  const ring1Geo = new THREE.TorusGeometry(4.95, 0.009, 16, 128);
  ring1Geo.rotateX(Math.PI / 2);
  geometries.push(ring1Geo);
  const ring1Mesh = new THREE.Mesh(ring1Geo, ringMat);
  ring1Group.add(ring1Mesh);
  ringGroup.add(ring1Group);

  // Ring 2: Secondary orbital harmonic (counter-inclined ~16°)
  const ring2Group = new THREE.Group();
  ring2Group.rotation.set(-0.25, 0.15, -0.26);
  const ring2Geo = new THREE.TorusGeometry(5.45, 0.0075, 16, 128);
  ring2Geo.rotateX(Math.PI / 2);
  geometries.push(ring2Geo);
  const ring2Mesh = new THREE.Mesh(ring2Geo, ringMat);
  ring2Group.add(ring2Mesh);
  ringGroup.add(ring2Group);

  // Ring 3: Inner orbital harmonic (subtle inclination ~12°)
  const ring3Group = new THREE.Group();
  ring3Group.rotation.set(0.14, -0.22, -0.18);
  const ring3Geo = new THREE.TorusGeometry(4.40, 0.008, 16, 128);
  ring3Geo.rotateX(Math.PI / 2);
  geometries.push(ring3Geo);
  const ring3Mesh = new THREE.Mesh(ring3Geo, ringMat);
  ring3Group.add(ring3Mesh);
  ringGroup.add(ring3Group);

  // 4. Soft Heart Core Glow PointLight (Illuminates pedestal top & metal bevels of orbiting frames)
  const heartCoreLight = new THREE.PointLight('#ff1f5a', 2.2, 8.5, 2.0);
  heartCoreLight.position.set(0, 0.05, 0);
  root.add(heartCoreLight);

  // 4. Turned Honed Dark Marble Showcase Pedestal Plinth (LatheGeometry seated flush below heart)
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
    clearcoatRoughness: 0.34,
    envMapIntensity: 0.9,
  });
  materials.push(pedestalMat);

  const pedestalMesh = new THREE.Mesh(pedestalGeo, pedestalMat);
  pedestalMesh.receiveShadow = true;
  pedestalMesh.castShadow = true;
  pedestalGroup.add(pedestalMesh);

  // Soft satin architectural trim ring on pedestal crown (zero sharp glare spot)
  const pedestalTrimMat = new THREE.MeshStandardMaterial({
    color: '#d4a58e',
    roughness: 0.72,
    metalness: 0.35,
    envMapIntensity: 0.3,
  });
  materials.push(pedestalTrimMat);

  const inlayGeo = new THREE.TorusGeometry(1.45, 0.018, 12, 80);
  inlayGeo.rotateX(Math.PI / 2);
  geometries.push(inlayGeo);
  const inlayMesh = new THREE.Mesh(inlayGeo, pedestalTrimMat);
  inlayMesh.position.y = 0.295;
  pedestalGroup.add(inlayMesh);

  // Subtle lower rose-gold base trim
  const lowerTrimGeo = new THREE.TorusGeometry(1.89, 0.014, 12, 80);
  lowerTrimGeo.rotateX(Math.PI / 2);
  geometries.push(lowerTrimGeo);
  const lowerTrimMesh = new THREE.Mesh(lowerTrimGeo, pedestalTrimMat);
  lowerTrimMesh.position.y = 0.085;
  pedestalGroup.add(lowerTrimMesh);

  // 5. Viền vàng đồng trên bệ phát sáng dịu (Glow Rim) & phản chiếu xuống mặt nước
  const glowRimMat = new THREE.MeshStandardMaterial({
    color: '#ffd0a8',
    emissive: '#e88a4c',
    emissiveIntensity: 1.65, // Gentle warm glow, reflecting into water
    roughness: 0.32,
    metalness: 0.65,
  });
  materials.push(glowRimMat);

  const baseGlowRimGeo = new THREE.TorusGeometry(1.94, 0.018, 12, 80);
  baseGlowRimGeo.rotateX(Math.PI / 2);
  geometries.push(baseGlowRimGeo);
  const baseGlowRimMesh = new THREE.Mesh(baseGlowRimGeo, glowRimMat);
  baseGlowRimMesh.position.y = 0.02;
  pedestalGroup.add(baseGlowRimMesh);

  // Soft warm gold reflection disc on water surface right beneath pedestal base rim
  const waterGlowDiscGeo = new THREE.RingGeometry(1.88, 2.55, 64);
  waterGlowDiscGeo.rotateX(-Math.PI / 2);
  geometries.push(waterGlowDiscGeo);
  const waterGlowDiscMat = new THREE.MeshBasicMaterial({
    color: '#ff904d',
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  materials.push(waterGlowDiscMat);
  const waterGlowDisc = new THREE.Mesh(waterGlowDiscGeo, waterGlowDiscMat);
  waterGlowDisc.position.y = 0.006;
  pedestalGroup.add(waterGlowDisc);

  // 6. Gợn sóng đồng tâm quanh bệ đỡ (Water Ripples): 3 vòng sóng lan tỏa đồng tâm ra xung quanh
  const rippleRings: THREE.Mesh[] = [];
  const rippleMats: THREE.MeshBasicMaterial[] = [];
  const rippleGeo = new THREE.RingGeometry(0.96, 1.04, 80);
  rippleGeo.rotateX(-Math.PI / 2);
  geometries.push(rippleGeo);

  for (let r = 0; r < 3; r += 1) {
    const rMat = new THREE.MeshBasicMaterial({
      color: '#ffd8e2',
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    rippleMats.push(rMat);
    materials.push(rMat);

    const rMesh = new THREE.Mesh(rippleGeo, rMat);
    rMesh.position.y = 0.012; // Skimming ocean surface at Y = -2.34
    pedestalGroup.add(rMesh);
    rippleRings.push(rMesh);
  }

  // Subtle physical caustic bounce on the marble top
  const causticTex = createSubtleCausticTexture();
  textures.push(causticTex);
  const causticGeo = new THREE.CircleGeometry(1.18, 48);
  causticGeo.rotateX(-Math.PI / 2);
  geometries.push(causticGeo);

  const causticMat = new THREE.MeshBasicMaterial({
    map: causticTex,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  materials.push(causticMat);
  const causticDisc = new THREE.Mesh(causticGeo, causticMat);
  causticDisc.position.y = 0.322;
  pedestalGroup.add(causticDisc);

  // Soft Radial Contact Shadow Plane grounding the pedestal on the gallery floor
  const shadowTex = createContactShadowTexture();
  textures.push(shadowTex);
  const contactGeo = new THREE.PlaneGeometry(5.8, 5.8);
  contactGeo.rotateX(-Math.PI / 2);
  geometries.push(contactGeo);

  const contactMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  materials.push(contactMat);
  const contactShadowMesh = new THREE.Mesh(contactGeo, contactMat);
  contactShadowMesh.position.y = -0.02;
  pedestalGroup.add(contactShadowMesh);

  root.add(pedestalGroup);

  // Invisible raycast hit proxy on Layer 1
  const hitGeo = new THREE.SphereGeometry(1.55, 16, 16);
  geometries.push(hitGeo);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  materials.push(hitMat);
  const hitProxy = new THREE.Mesh(hitGeo, hitMat);
  hitProxy.position.set(0, 0.24, 0);
  hitProxy.layers.set(1);
  hitProxy.userData = { interactType: 'heart' };
  root.add(hitProxy);

  let impulse = 0;
  let hoverScale = 0;

  return {
    root,
    heartPivot,
    hitProxy,
    triggerImpulse: () => {
      impulse = 1.0;
    },
    update: (elapsed: number, delta: number, isHovered: boolean) => {
      impulse = THREE.MathUtils.damp(impulse, 0, 2.5, delta);
      hoverScale = THREE.MathUtils.damp(hoverScale, isHovered ? 1 : 0, 7.5, delta);

      // Realistic gentle lub-dub cardiac motion
      const beat = computeHeartbeatWave(elapsed * 0.88);
      const scalePulse = 1 + beat * 0.035 + impulse * 0.10 + hoverScale * 0.028;

      outerHeartMesh.scale.setScalar(scalePulse);
      coreHeartMesh.scale.setScalar(0.82 * (1 + beat * 0.055 + impulse * 0.14));

      // Gentle levitation & subtle showcase rotation catching natural sunset facet glints
      heartPivot.position.y = 0.24 + Math.sin(elapsed * 1.05) * 0.085;
      const swayY = Math.sin(elapsed * 0.42) * 0.24;
      outerHeartMesh.rotation.y = swayY;
      coreHeartMesh.rotation.y = swayY;

      // Fiery internal ruby gemstone scintillation
      coreRubyMat.emissiveIntensity = 0.32 + beat * 0.16 + impulse * 0.28;
      causticMat.opacity = 0.14 + beat * 0.04;

      // Rotate thin glowing orbital filament rings smoothly (Zero GC)
      ring1Mesh.rotation.z = elapsed * 0.055;
      ring2Mesh.rotation.z = -elapsed * 0.042;
      ring3Mesh.rotation.z = elapsed * 0.035;

      // Soft Heart Core Glow PointLight pulses in sync with cardiac rhythm
      heartCoreLight.position.y = heartPivot.position.y - 0.22;
      heartCoreLight.intensity = 1.95 + beat * 0.75 + impulse * 1.4;

      // Animate 3 concentric water ripples expanding from pedestal base out into ocean
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
