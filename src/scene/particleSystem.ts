import * as THREE from 'three';
import { createHeartShape } from './heartSculpture';

export interface TwilightParticlesRig {
  root: THREE.Group;
  spawnHeartBurst: (origin?: THREE.Vector3) => void;
  update: (elapsed: number, delta: number) => void;
  dispose: () => void;
}

interface AmbientMote {
  x: number;
  y: number;
  z: number;
  speedY: number;
  driftPhase: number;
  baseScale: number;
  twinkleSpeed: number;
}

interface BurstParticle {
  active: boolean;
  life: number;
  maxLife: number;
  px: number;
  py: number;
  pz: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  vr: number;
  baseScale: number;
}

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

// Soft warm rose-gold, blush pink & champagne bokeh stardust palette
const STARDUST_BOKEH_PALETTE = [
  '#ffd4e0',
  '#ffe8cc',
  '#ffbed0',
  '#fff0f5',
  '#fcd5ce',
  '#ffcad4',
  '#e8dff5',
];

export function createTwilightParticles(): TwilightParticlesRig {
  const root = new THREE.Group();

  // 1. Floating Stardust / Bokeh (135 glowing motes floating slowly from water up around the heart)
  const ambientCount = 135;
  const starGeo = new THREE.SphereGeometry(0.018, 8, 8);
  const starMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.35,
    metalness: 0.15,
    emissive: 0xffb8cb,
    emissiveIntensity: 1.65,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const ambientMesh = new THREE.InstancedMesh(starGeo, starMat, ambientCount);
  ambientMesh.frustumCulled = false;
  ambientMesh.visible = true; // Actively floating stardust filling atmosphere and side sky

  const motes: AmbientMote[] = [];
  for (let i = 0; i < ambientCount; i += 1) {
    const radius = 2.2 + Math.random() * 8.8;
    const angle = Math.random() * Math.PI * 2;
    motes.push({
      x: Math.cos(angle) * radius,
      y: -2.2 + Math.random() * 8.4,
      z: Math.sin(angle) * radius,
      speedY: 0.08 + Math.random() * 0.12,
      driftPhase: Math.random() * Math.PI * 2,
      baseScale: 0.65 + Math.random() * 0.55,
      twinkleSpeed: 0.7 + Math.random() * 0.8,
    });

    _color.set(STARDUST_BOKEH_PALETTE[i % STARDUST_BOKEH_PALETTE.length]);
    ambientMesh.setColorAt(i, _color);
  }
  if (ambientMesh.instanceColor) {
    ambientMesh.instanceColor.needsUpdate = true;
  }
  root.add(ambientMesh);

  // 2. Refined Heartbeat Burst Pool: Sculpted Satin Mini-Hearts (52) + Soft Gold-Leaf Flecks (56)
  const burstHeartCount = 52;
  const burstSparkCount = 56;

  const tinyHeartShape = createHeartShape(0.052);
  const tinyHeartGeo = new THREE.ExtrudeGeometry(tinyHeartShape, {
    depth: 0.02,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.008,
    bevelSegments: 2,
    curveSegments: 14,
  });
  tinyHeartGeo.center();

  const burstHeartMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.42,
    metalness: 0.45,
    envMapIntensity: 0.65,
    transparent: true,
    opacity: 0.68,
    depthWrite: false,
  });

  const burstHeartMesh = new THREE.InstancedMesh(
    tinyHeartGeo,
    burstHeartMat,
    burstHeartCount,
  );
  burstHeartMesh.frustumCulled = false;

  const burstSparkGeo = new THREE.OctahedronGeometry(0.024, 0);
  const burstSparkMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.48,
    metalness: 0.45,
    envMapIntensity: 0.55,
    transparent: true,
    opacity: 0.56,
    depthWrite: false,
  });

  const burstSparkMesh = new THREE.InstancedMesh(
    burstSparkGeo,
    burstSparkMat,
    burstSparkCount,
  );
  burstSparkMesh.frustumCulled = false;

  const createPool = (count: number, mesh: THREE.InstancedMesh): BurstParticle[] => {
    const pool: BurstParticle[] = [];
    _dummy.scale.setScalar(0);
    _dummy.updateMatrix();
    for (let i = 0; i < count; i += 1) {
      mesh.setMatrixAt(i, _dummy.matrix);
      _color.set(STARDUST_BOKEH_PALETTE[i % STARDUST_BOKEH_PALETTE.length]);
      mesh.setColorAt(i, _color);
      pool.push({
        active: false,
        life: 0,
        maxLife: 1,
        px: 0,
        py: 0,
        pz: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        rx: 0,
        ry: 0,
        rz: 0,
        vr: 1,
        baseScale: 1,
      });
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return pool;
  };

  const heartPool = createPool(burstHeartCount, burstHeartMesh);
  const sparkPool = createPool(burstSparkCount, burstSparkMesh);

  root.add(burstHeartMesh);
  root.add(burstSparkMesh);

  let heartCursor = 0;
  let sparkCursor = 0;

  const spawnPoolItems = (
    pool: BurstParticle[],
    cursorStart: number,
    spawnCount: number,
    originX: number,
    originY: number,
    originZ: number,
    speedMin: number,
    speedMax: number,
  ): number => {
    let cursor = cursorStart;
    for (let i = 0; i < spawnCount; i += 1) {
      const p = pool[cursor % pool.length];
      cursor += 1;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = speedMin + Math.random() * (speedMax - speedMin);

      p.active = true;
      p.life = 0;
      p.maxLife = 1.65 + Math.random() * 1.25;
      p.px = originX + (Math.random() - 0.5) * 0.45;
      p.py = originY + (Math.random() - 0.5) * 0.45;
      p.pz = originZ + (Math.random() - 0.5) * 0.45;
      p.vx = Math.sin(phi) * Math.cos(theta) * speed;
      p.vy = Math.abs(Math.cos(phi)) * speed * 0.85 + 0.72;
      p.vz = Math.sin(phi) * Math.sin(theta) * speed;
      p.rx = Math.random() * Math.PI;
      p.ry = Math.random() * Math.PI;
      p.rz = (Math.random() - 0.5) * 0.6;
      p.vr = (Math.random() - 0.5) * 3.0;
      p.baseScale = 0.65 + Math.random() * 0.85;
    }
    return cursor % pool.length;
  };

  const updatePool = (
    pool: BurstParticle[],
    mesh: THREE.InstancedMesh,
    delta: number,
  ) => {
    let anyDirty = false;
    const drag = Math.exp(-1.55 * delta);

    for (let i = 0; i < pool.length; i += 1) {
      const p = pool[i];
      if (!p.active) continue;
      anyDirty = true;
      p.life += delta;

      if (p.life >= p.maxLife) {
        p.active = false;
        _dummy.scale.setScalar(0);
        _dummy.updateMatrix();
        mesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }

      const progress = p.life / p.maxLife;
      p.vx *= drag;
      p.vz *= drag;
      p.vy = p.vy * drag + 0.12 * delta;

      p.px += p.vx * delta;
      p.py += p.vy * delta;
      p.pz += p.vz * delta;
      p.ry += p.vr * delta;

      const fadeIn = Math.min(1, progress * 7);
      const fadeOut = Math.pow(1 - progress, 1.5);
      const s = p.baseScale * fadeIn * fadeOut;

      _dummy.position.set(p.px, p.py, p.pz);
      _dummy.rotation.set(p.rx, p.ry, p.rz);
      _dummy.scale.setScalar(s);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
    }

    if (anyDirty) {
      mesh.instanceMatrix.needsUpdate = true;
    }
  };

  return {
    root,
    spawnHeartBurst: (origin) => {
      const ox = origin ? origin.x : 0;
      const oy = origin ? origin.y : 0.3;
      const oz = origin ? origin.z : 0;
      heartCursor = spawnPoolItems(heartPool, heartCursor, 24, ox, oy, oz, 1.6, 4.0);
      sparkCursor = spawnPoolItems(sparkPool, sparkCursor, 32, ox, oy, oz, 2.0, 5.0);
    },
    update: (elapsed: number, delta: number) => {
      // 1. Update floating stardust / bokeh particles (slow ascent from water surface up around heart)
      for (let i = 0; i < ambientCount; i += 1) {
        const m = motes[i];
        m.y += m.speedY * delta;
        if (m.y > 6.4) {
          m.y = -2.2;
          const newRadius = 2.2 + Math.random() * 8.8;
          const newAngle = Math.random() * Math.PI * 2;
          m.x = Math.cos(newAngle) * newRadius;
          m.z = Math.sin(newAngle) * newRadius;
        }

        const swayX = Math.sin(elapsed * 0.42 + m.driftPhase) * 0.28;
        const swayZ = Math.cos(elapsed * 0.35 + m.driftPhase) * 0.28;
        const glint = 0.82 + 0.18 * Math.sin(elapsed * (m.twinkleSpeed * 0.7) + m.driftPhase);

        _dummy.position.set(m.x + swayX, m.y, m.z + swayZ);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.setScalar(m.baseScale * glint);
        _dummy.updateMatrix();
        ambientMesh.setMatrixAt(i, _dummy.matrix);
      }
      ambientMesh.instanceMatrix.needsUpdate = true;

      updatePool(heartPool, burstHeartMesh, delta);
      updatePool(sparkPool, burstSparkMesh, delta);
    },
    dispose: () => {
      starGeo.dispose();
      starMat.dispose();
      tinyHeartGeo.dispose();
      burstHeartMat.dispose();
      burstSparkGeo.dispose();
      burstSparkMat.dispose();
    },
  };
}
