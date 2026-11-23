import * as THREE from 'three';

export interface TwilightParticlesRig {
  root: THREE.Group;
  spawnHeartBurst: (origin?: THREE.Vector3) => void;
  launchFirework: (originX?: number, originZ?: number, colorHex?: number) => void;
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

interface MeteorParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  length: number;
  alpha: number;
  maxLife: number;
  life: number;
  scale: number;
}

interface FireworkSpark {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: THREE.Color;
  life: number;
  maxLife: number;
  baseScale: number;
}

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

// Celebration color palette for fireworks & sparkles
const FIREWORK_PALETTE = [
  0xf472b6, // Rose pink
  0xfbbf24, // Warm gold
  0x38bdf8, // Electric cyan
  0xc084fc, // Lavender violet
  0xfb7185, // Coral ruby
  0x34d399, // Mint emerald
  0xffedd5, // Champagne diamond
];

export function createTwilightParticles(): TwilightParticlesRig {
  const root = new THREE.Group();

  // =========================================================================
  // 1. FLOATING STARDUST / BOKEH MOTES
  // =========================================================================
  const ambientCount = 140;
  const starGeo = new THREE.SphereGeometry(0.022, 8, 8);
  const starMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffb8cb,
    emissiveIntensity: 2.2,
    roughness: 0.2,
    metalness: 0.1,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const ambientMesh = new THREE.InstancedMesh(starGeo, starMat, ambientCount);
  ambientMesh.frustumCulled = false;

  const motes: AmbientMote[] = [];
  for (let i = 0; i < ambientCount; i += 1) {
    const radius = 2.0 + Math.random() * 9.5;
    const angle = Math.random() * Math.PI * 2;
    motes.push({
      x: Math.cos(angle) * radius,
      y: -2.2 + Math.random() * 9.0,
      z: Math.sin(angle) * radius,
      speedY: 0.10 + Math.random() * 0.15,
      driftPhase: Math.random() * Math.PI * 2,
      baseScale: 0.75 + Math.random() * 0.65,
      twinkleSpeed: 0.8 + Math.random() * 1.2,
    });

    _color.setHex(FIREWORK_PALETTE[i % FIREWORK_PALETTE.length]);
    ambientMesh.setColorAt(i, _color);
  }
  if (ambientMesh.instanceColor) ambientMesh.instanceColor.needsUpdate = true;
  root.add(ambientMesh);

  // =========================================================================
  // 2. CONTINUOUS CELESTIAL METEOR SHOWER (MƯA SAO BĂNG LẤP LÁNH)
  // =========================================================================
  const meteorCount = 16;
  const meteorMeshGroup = new THREE.Group();
  root.add(meteorMeshGroup);

  // Meteor streak line geometry
  const meteorGeo = new THREE.CylinderGeometry(0.008, 0.045, 2.2, 8);
  meteorGeo.rotateX(Math.PI / 2); // Orient along Z axis

  const meteorMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const meteorMeshes: THREE.Mesh[] = [];
  const meteors: MeteorParticle[] = [];

  const spawnMeteor = (m: MeteorParticle, mesh: THREE.Mesh) => {
    m.active = true;
    m.life = 0;
    m.maxLife = 0.85 + Math.random() * 0.95;
    // Spawn high in the sky dome
    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnDist = 14.0 + Math.random() * 18.0;
    m.x = Math.cos(spawnAngle) * spawnDist;
    m.y = 8.0 + Math.random() * 7.5;
    m.z = Math.sin(spawnAngle) * spawnDist;

    // Streaking downward diagonally
    const speed = 24.0 + Math.random() * 14.0;
    const angleDown = -0.45 - Math.random() * 0.35;
    const dirYaw = spawnAngle + Math.PI + (Math.random() - 0.5) * 0.6;

    m.vx = Math.cos(dirYaw) * speed * Math.cos(angleDown);
    m.vy = Math.sin(angleDown) * speed;
    m.vz = Math.sin(dirYaw) * speed * Math.cos(angleDown);
    m.scale = 0.8 + Math.random() * 0.7;

    mesh.scale.set(m.scale, m.scale, m.scale);
  };

  for (let i = 0; i < meteorCount; i += 1) {
    const meshMat = meteorMat.clone();
    // Alternating celestial colors: radiant diamond, cyan, rose gold
    const colHex = i % 3 === 0 ? 0xffffff : i % 3 === 1 ? 0x93c5fd : 0xfbcfe8;
    meshMat.color.setHex(colHex);

    const mesh = new THREE.Mesh(meteorGeo, meshMat);
    meteorMeshGroup.add(mesh);
    meteorMeshes.push(mesh);

    const m: MeteorParticle = {
      active: false,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      length: 2.2,
      alpha: 0,
      maxLife: 1.0,
      life: 0,
      scale: 1.0,
    };
    // Staggered initial spawn
    setTimeout(() => spawnMeteor(m, mesh), i * 220);
    meteors.push(m);
  }

  // =========================================================================
  // 3. GLORIOUS FIREWORKS PARTICLE SYSTEM (PHÁO HOA RỰC RỠ ĐA SẮC)
  // =========================================================================
  const maxSparks = 360;
  const sparkGeo = new THREE.OctahedronGeometry(0.045, 0);
  const sparkMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const fireworkMesh = new THREE.InstancedMesh(sparkGeo, sparkMat, maxSparks);
  fireworkMesh.frustumCulled = false;

  const sparkPool: FireworkSpark[] = [];
  _dummy.scale.setScalar(0);
  _dummy.updateMatrix();

  for (let i = 0; i < maxSparks; i += 1) {
    fireworkMesh.setMatrixAt(i, _dummy.matrix);
    _color.setHex(0xffffff);
    fireworkMesh.setColorAt(i, _color);

    sparkPool.push({
      active: false,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      color: new THREE.Color(),
      life: 0,
      maxLife: 1.5,
      baseScale: 1.0,
    });
  }
  fireworkMesh.instanceMatrix.needsUpdate = true;
  if (fireworkMesh.instanceColor) fireworkMesh.instanceColor.needsUpdate = true;
  root.add(fireworkMesh);

  let sparkCursor = 0;

  const launchFirework = (originX?: number, originZ?: number, colorHex?: number) => {
    const burstX = originX !== undefined ? originX : (Math.random() - 0.5) * 16.0;
    const burstZ = originZ !== undefined ? originZ : -4.0 - Math.random() * 12.0;
    const burstY = 5.5 + Math.random() * 4.5;

    const chosenColor = colorHex !== undefined ? colorHex : FIREWORK_PALETTE[Math.floor(Math.random() * FIREWORK_PALETTE.length)];
    const sparksInBurst = 48 + Math.floor(Math.random() * 24);

    for (let i = 0; i < sparksInBurst; i += 1) {
      const sp = sparkPool[sparkCursor % maxSparks];
      sparkCursor += 1;

      // Spherical explosion velocity with random distribution
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 2.4 + Math.random() * 4.6;

      sp.active = true;
      sp.life = 0;
      sp.maxLife = 1.4 + Math.random() * 0.9;
      sp.x = burstX;
      sp.y = burstY;
      sp.z = burstZ;
      sp.vx = Math.sin(phi) * Math.cos(theta) * speed;
      sp.vy = Math.cos(phi) * speed + 0.6;
      sp.vz = Math.sin(phi) * Math.sin(theta) * speed;
      sp.color.setHex(chosenColor);
      sp.baseScale = 0.8 + Math.random() * 0.7;
    }
  };

  // Launch initial ambient celebration fireworks
  let nextAmbientFirework = 1.8;

  return {
    root,
    spawnHeartBurst: (origin) => {
      // Grand celebratory firework barrage on click!
      const ox = origin ? origin.x : 0;
      const oz = origin ? origin.z : 0;
      launchFirework(ox, oz, 0xf472b6);
      launchFirework(ox - 3.5, oz - 2.0, 0xfbbf24);
      launchFirework(ox + 3.5, oz - 2.0, 0x38bdf8);
      launchFirework(ox, oz - 5.0, 0xc084fc);
    },
    launchFirework,
    update: (elapsed: number, delta: number) => {
      // 1. Update Floating Stardust
      for (let i = 0; i < ambientCount; i += 1) {
        const m = motes[i];
        m.y += m.speedY * delta;
        if (m.y > 7.5) {
          m.y = -2.2;
          const newRadius = 2.0 + Math.random() * 9.5;
          const newAngle = Math.random() * Math.PI * 2;
          m.x = Math.cos(newAngle) * newRadius;
          m.z = Math.sin(newAngle) * newRadius;
        }

        const swayX = Math.sin(elapsed * 0.5 + m.driftPhase) * 0.32;
        const swayZ = Math.cos(elapsed * 0.4 + m.driftPhase) * 0.32;
        const glint = 0.85 + 0.25 * Math.sin(elapsed * m.twinkleSpeed * 1.5 + m.driftPhase);

        _dummy.position.set(m.x + swayX, m.y, m.z + swayZ);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.setScalar(m.baseScale * glint);
        _dummy.updateMatrix();
        ambientMesh.setMatrixAt(i, _dummy.matrix);
      }
      ambientMesh.instanceMatrix.needsUpdate = true;

      // 2. Update Continuous Meteor Shower
      for (let i = 0; i < meteorCount; i += 1) {
        const m = meteors[i];
        const mesh = meteorMeshes[i];
        const mat = mesh.material as THREE.MeshBasicMaterial;

        if (!m.active) {
          if (Math.random() < 0.04) {
            spawnMeteor(m, mesh);
          }
          continue;
        }

        m.life += delta;
        if (m.life >= m.maxLife || m.y < -1.5) {
          m.active = false;
          mat.opacity = 0;
          continue;
        }

        m.x += m.vx * delta;
        m.y += m.vy * delta;
        m.z += m.vz * delta;

        mesh.position.set(m.x, m.y, m.z);
        // Look along velocity vector
        _dummy.position.set(m.x, m.y, m.z);
        _dummy.lookAt(m.x + m.vx, m.y + m.vy, m.z + m.vz);
        mesh.quaternion.copy(_dummy.quaternion);

        // Smooth fade-in and fade-out
        const progress = m.life / m.maxLife;
        const alpha = Math.sin(progress * Math.PI);
        mat.opacity = alpha * 0.95;
      }

      // 3. Ambient Periodic Fireworks Launch (Every 3.2s)
      nextAmbientFirework -= delta;
      if (nextAmbientFirework <= 0) {
        nextAmbientFirework = 2.8 + Math.random() * 1.8;
        launchFirework();
      }

      // 4. Update Firework Sparks
      let sparkDirty = false;
      const drag = Math.exp(-1.4 * delta);
      const gravity = -3.8;

      for (let i = 0; i < maxSparks; i += 1) {
        const sp = sparkPool[i];
        if (!sp.active) continue;

        sparkDirty = true;
        sp.life += delta;

        if (sp.life >= sp.maxLife) {
          sp.active = false;
          _dummy.scale.setScalar(0);
          _dummy.updateMatrix();
          fireworkMesh.setMatrixAt(i, _dummy.matrix);
          continue;
        }

        sp.vx *= drag;
        sp.vz *= drag;
        sp.vy = sp.vy * drag + gravity * delta;

        sp.x += sp.vx * delta;
        sp.y += sp.vy * delta;
        sp.z += sp.vz * delta;

        const progress = sp.life / sp.maxLife;
        const fade = Math.pow(1 - progress, 1.4);
        const twinkle = 0.85 + 0.15 * Math.sin(elapsed * 28.0 + i);
        const scale = sp.baseScale * fade * twinkle;

        _dummy.position.set(sp.x, sp.y, sp.z);
        _dummy.scale.setScalar(Math.max(0.001, scale));
        _dummy.updateMatrix();
        fireworkMesh.setMatrixAt(i, _dummy.matrix);

        // Twinkling sparkle color
        fireworkMesh.setColorAt(i, sp.color);
      }

      if (sparkDirty) {
        fireworkMesh.instanceMatrix.needsUpdate = true;
        if (fireworkMesh.instanceColor) fireworkMesh.instanceColor.needsUpdate = true;
      }
    },
    dispose: () => {
      starGeo.dispose();
      starMat.dispose();
      meteorGeo.dispose();
      meteorMat.dispose();
      meteorMeshes.forEach((m) => (m.material as THREE.Material).dispose());
      sparkGeo.dispose();
      sparkMat.dispose();
    },
  };
}
