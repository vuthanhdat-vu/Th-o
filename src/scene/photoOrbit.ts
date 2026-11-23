import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import type { MemoryItem, ShowcaseRealm } from '../types/showcase';
import { REALM_ANCHORS, getCatIslandElevation } from './realms';
import { sampleSkyConvoy, type SkyConvoySample } from './skyFlightTrajectory';

export interface PhotoFrameEntry {
  memory: MemoryItem;
  group: THREE.Group;
  hitPlane: THREE.Mesh;
  index: number;
  baseAngle: number;
  bobPhase: number;
  hoverAmount: number;
  activeAmount: number;
  photoMaterial: THREE.MeshPhysicalMaterial;
  photoTexture: THREE.CanvasTexture;
  pinMat?: THREE.MeshPhysicalMaterial;
}

export interface PhotoOrbitRig {
  root: THREE.Group;
  getHitPlanes: () => THREE.Mesh[];
  setMemories: (memories: MemoryItem[]) => void;
  getFrameWorldFocus: (
    memoryId: string,
    targetPos: THREE.Vector3,
    targetCamPos: THREE.Vector3,
  ) => boolean;
  getFrameWorldPosition: (index: number, out: THREE.Vector3) => boolean;
  update: (
    elapsed: number,
    delta: number,
    realm: ShowcaseRealm,
    hoveredMemoryId: string | null,
    selectedMemoryId: string | null,
    orbitPaused: boolean,
    skyFlightTime?: number,
  ) => void;
  dispose: () => void;
}

const _worldPos = new THREE.Vector3();
const _worldNormal = new THREE.Vector3();
const _worldQuat = new THREE.Quaternion();
const _targetPos = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _lookMatrix = new THREE.Matrix4();
const _targetQuat = new THREE.Quaternion();
const _upVec = new THREE.Vector3(0, 1, 0);

const _skySample: SkyConvoySample = {
  phoenixPos: new THREE.Vector3(),
  phoenixQuat: new THREE.Quaternion(),
  framePos: new THREE.Vector3(),
  frameQuat: new THREE.Quaternion(),
};

function createPhotoCanvasTexture(
  imageUrl: string,
  title: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const width = 768;
  const height = 576;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const drawFallback = () => {
    if (!ctx) return;
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#361e42');
    grad.addColorStop(0.55, '#643252');
    grad.addColorStop(1, '#b56c7a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(250, 243, 245, 0.88)';
    ctx.font = '600 32px "Cormorant Garamond", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title.slice(0, 34), width / 2, height / 2);
  };

  drawFallback();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;

  if (imageUrl) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!ctx) return;
      const imgAspect = img.naturalWidth / Math.max(1, img.naturalHeight);
      const targetAspect = width / height;

      let sx = 0;
      let sy = 0;
      let sw = img.naturalWidth;
      let sh = img.naturalHeight;

      if (imgAspect > targetAspect) {
        sw = img.naturalHeight * targetAspect;
        sx = (img.naturalWidth - sw) * 0.5;
      } else {
        sh = img.naturalWidth / targetAspect;
        sy = (img.naturalHeight - sh) * 0.5;
      }

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);

      // Subtle warm rim highlight instead of dark vignette
      ctx.strokeStyle = 'rgba(255, 245, 240, 0.25)';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, width - 4, height - 4);

      texture.needsUpdate = true;
    };
    img.onerror = () => {
      drawFallback();
      texture.needsUpdate = true;
    };
    img.src = imageUrl;
  }

  return texture;
}

function createBackPlateTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#20132a';
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = 'rgba(230, 179, 154, 0.32)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(18, 18, size - 36, size - 36);

    ctx.save();
    ctx.translate(size / 2, size / 2 + 8);
    ctx.scale(2.0, -2.0);
    ctx.beginPath();
    for (let i = 0; i <= 48; i += 1) {
      const t = (i / 48) * Math.PI * 2;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(230, 179, 154, 0.45)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

function createBeveledFrameGeometry(
  outerW: number,
  outerH: number,
  border: number,
): THREE.ExtrudeGeometry {
  const hw = outerW / 2;
  const hh = outerH / 2;
  const iw = hw - border;
  const ih = hh - border;

  const shape = new THREE.Shape();
  shape.moveTo(-hw, -hh);
  shape.lineTo(hw, -hh);
  shape.lineTo(hw, hh);
  shape.lineTo(-hw, hh);
  shape.closePath();

  const hole = new THREE.Path();
  hole.moveTo(-iw, -ih);
  hole.lineTo(-iw, ih);
  hole.lineTo(iw, ih);
  hole.lineTo(iw, -ih);
  hole.closePath();
  shape.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.058,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.016,
    bevelSegments: 4,
  });
  geo.center();
  return geo;
}

export function createPhotoOrbit(maxAnisotropy: number): PhotoOrbitRig {
  const root = new THREE.Group();
  let entries: PhotoFrameEntry[] = [];
  let orbitAngle = 0;
  let activeRealm: ShowcaseRealm = 'heart';

  const frameOuterW = 1.62;
  const frameOuterH = 1.28;
  const frameGeo = createBeveledFrameGeometry(frameOuterW, frameOuterH, 0.085);

  const matBoardGeo = new THREE.PlaneGeometry(1.47, 1.13);
  const photoPlaneGeo = new THREE.PlaneGeometry(1.33, 0.998);
  const backPlateGeo = new THREE.PlaneGeometry(1.52, 1.18);
  const hitPlaneGeo = new THREE.PlaneGeometry(1.74, 1.42);

  const sharedGeos = [
    frameGeo,
    matBoardGeo,
    photoPlaneGeo,
    backPlateGeo,
    hitPlaneGeo,
  ];

  const metalFrameMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#e6b39a'),
    metalness: 0.8,
    roughness: 0.2,
    anisotropy: 0.78,
    clearcoat: 0.35,
    clearcoatRoughness: 0.1,
    envMapIntensity: 1.25,
  });

  const passePartoutMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#f1e8ea'),
    roughness: 0.92,
    metalness: 0.0,
  });

  const backPlateTex = createBackPlateTexture(maxAnisotropy);
  const backPlateMat = new THREE.MeshStandardMaterial({
    map: backPlateTex,
    roughness: 0.88,
    metalness: 0.05,
  });

  const hitMat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });

  const sharedMats = [metalFrameMat, passePartoutMat, backPlateMat, hitMat];

  const clearEntries = () => {
    for (const entry of entries) {
      root.remove(entry.group);
      entry.photoTexture.dispose();
      entry.photoMaterial.dispose();
      entry.pinMat?.dispose();
    }
    entries = [];
  };

  /**
   * Computes target position & facing quaternion for a photo frame inside any of the 4 realms:
   * - heart: 360° halo orbiting the central heart
   * - sky: panoramic crescent arc floating among the sunset clouds
   * - underwater: buoyant reef semicircle illuminated by shimmering caustics
   * - cat-island: open-air curved gallery framing the cats, palms & lanterns on Cat Island
   */
  const computeFrameTargetTransform = (
    entry: PhotoFrameEntry,
    count: number,
    elapsed: number,
    realm: ShowcaseRealm,
    skyFlightTime?: number,
  ) => {
    const lift = entry.hoverAmount * 0.16 + entry.activeAmount * 0.2;
    const gentleBob = Math.sin(elapsed * 0.9 + entry.bobPhase) * 0.085;

    if (realm === 'heart') {
      // 1. Quỹ đạo nghiêng (Tilted Orbit - Kiểu vành đai Sao Thổ ~15.5°, 12°-18°)
      const radiusX = 5.05;
      const radiusZ = 4.65;
      const angle = entry.baseAngle + orbitAngle;

      const x0 = Math.cos(angle) * radiusX;
      const z0 = Math.sin(angle) * radiusZ;

      // Trục nghiêng: Phía trước (+Z hướng ra camera) hạ thấp gần mặt nước, phía sau (-Z xa camera) vươn cao
      const tiltPitch = 0.27; // ~15.5° (nằm trong dải 12° – 18°)
      const tiltRoll = 0.11;  // ~6.3° góc lượn nghiêng tạo chiều sâu
      const yTilt = -z0 * Math.sin(tiltPitch) + x0 * Math.sin(tiltRoll);

      // 2. Bố cục xoắn ốc nhẹ (Ascending Helix): Xếp các khung ảnh cao dần theo hình xoắn ốc quanh trái tim
      const helixStep = ((entry.index / (count - 1)) - 0.5) * 0.48;

      // 3. Chuyển động nhấp nhô nhẹ theo hàm sin lệch pha nhau cho từng khung
      const outOfPhaseBob = Math.sin(elapsed * 1.15 + entry.bobPhase + entry.index * 1.35) * 0.085;
      const lift = entry.hoverAmount * 0.24 + entry.activeAmount * 0.35;

      const y = yTilt + helixStep - 0.12 + outOfPhaseBob + lift;

      _targetPos.set(x0, y, z0);
      _lookTarget.set(x0 * 2.1, y * 0.88 + 0.35, z0 * 2.1 + 0.9);
      _lookMatrix.lookAt(_lookTarget, _targetPos, _upVec);
      _targetQuat.setFromRotationMatrix(_lookMatrix);
      return;
    }

    // Normalized spread across [-1, 1] for scenic crescent gallery formations
    const spanT = count <= 1 ? 0 : (entry.index / (count - 1)) * 2 - 1;

    if (realm === 'sky') {
      const anchor = REALM_ANCHORS.sky.center;
      const flightTime = skyFlightTime !== undefined ? skyFlightTime : elapsed;
      sampleSkyConvoy(entry.index, flightTime, count, _skySample);
      const x = anchor[0] + _skySample.framePos.x;
      const y = anchor[1] + _skySample.framePos.y + lift;
      const z = anchor[2] + _skySample.framePos.z;

      _targetPos.set(x, y, z);
      _targetQuat.copy(_skySample.frameQuat);
      return;
    }

    if (realm === 'underwater') {
      const anchor = REALM_ANCHORS.underwater.center;
      const arcAngle = spanT * 0.74 + Math.sin(elapsed * 0.22) * 0.05;
      const radius = 4.9;
      const x = anchor[0] + Math.sin(arcAngle) * radius;
      const z = anchor[2] + (1 - Math.cos(arcAngle)) * 2.2 - 0.5;
      const y = anchor[1] + Math.sin(spanT * Math.PI) * 0.38 + gentleBob * 1.45 + lift;

      _targetPos.set(x, y, z);
      _lookTarget.set(anchor[0], anchor[1] + 0.5, anchor[2] + 8.2);
      _lookMatrix.lookAt(_lookTarget, _targetPos, _upVec);
      _targetQuat.setFromRotationMatrix(_lookMatrix);
      return;
    }

    // Cat Island: Grounded photo gallery surrounded by cats on the grassy knoll
    const camRef = REALM_ANCHORS['cat-island'].cameraPos;
    const normT = spanT; // Normalized -1.0 to 1.0

    // Photos spread across the approaching camera view on the grassy knoll of Cat Island
    const galleryCenterLx = -0.35;
    const galleryCenterLz = 0.55;
    const tangentDist = normT * 3.3; // width across photos
    const curveDist = Math.abs(normT) * 0.42;

    const lx = galleryCenterLx + 0.835 * tangentDist + 0.550 * curveDist;
    const lz = galleryCenterLz + 0.550 * tangentDist - 0.835 * curveDist;

    const elev = getCatIslandElevation(lx, lz);
    const groundY = -2.4 + elev;

    const x = 15.5 + lx;
    const z = -7.5 + lz;
    // Frame resting solidly on the ground at groundY + 0.58, smoothly lifting when hovered/focused
    const groundLift = entry.hoverAmount * 0.26 + entry.activeAmount * 0.38;
    const y = groundY + 0.58 + groundLift;

    _targetPos.set(x, y, z);
    // Face directly toward the camera, naturally leaning back ~12-15 deg resting on the ground
    _lookTarget.set(camRef[0], groundY + 1.25, camRef[2]);
    _lookMatrix.lookAt(_lookTarget, _targetPos, _upVec);
    _targetQuat.setFromRotationMatrix(_lookMatrix);
  };

  const setMemories = (memories: MemoryItem[]) => {
    clearEntries();
    const count = Math.max(1, memories.length);

    memories.forEach((memory, index) => {
      const group = new THREE.Group();

      const frameMesh = new THREE.Mesh(frameGeo, metalFrameMat);
      frameMesh.castShadow = true;
      frameMesh.receiveShadow = true;
      group.add(frameMesh);

      const matBoard = new THREE.Mesh(matBoardGeo, passePartoutMat);
      matBoard.position.z = 0.012;
      matBoard.receiveShadow = true;
      group.add(matBoard);

      const photoTexture = createPhotoCanvasTexture(memory.imageUrl, memory.title, maxAnisotropy);
      const photoMaterial = new THREE.MeshPhysicalMaterial({
        map: photoTexture,
        roughness: 0.18,
        metalness: 0.0,
        clearcoat: 0.35,
        clearcoatRoughness: 0.12,
        emissive: new THREE.Color('#ffffff'),
        emissiveMap: photoTexture,
        emissiveIntensity: 0.65, // Bright, vibrant portrait
      });
      const photoMesh = new THREE.Mesh(photoPlaneGeo, photoMaterial);
      photoMesh.position.z = 0.032;
      group.add(photoMesh);

      // Back photo mesh so frames display photo from both front and back
      const backPhotoMesh = new THREE.Mesh(photoPlaneGeo, photoMaterial);
      backPhotoMesh.position.z = -0.032;
      backPhotoMesh.rotation.y = Math.PI;
      group.add(backPhotoMesh);

      const hitPlane = new THREE.Mesh(hitPlaneGeo, hitMat);
      hitPlane.position.z = 0.04;
      hitPlane.layers.set(1);
      hitPlane.userData = {
        interactType: 'memory',
        memoryId: memory.id,
      };
      group.add(hitPlane);

      const baseAngle = (index / count) * Math.PI * 2;
      root.add(group);

      const entry: PhotoFrameEntry = {
        memory,
        group,
        hitPlane,
        index,
        baseAngle,
        bobPhase: index * 1.37,
        hoverAmount: 0,
        activeAmount: 0,
        photoMaterial,
        photoTexture,
      };

      // Snap initial spawn transform cleanly to current active realm
      computeFrameTargetTransform(entry, count, 0, activeRealm);
      group.position.copy(_targetPos);
      group.quaternion.copy(_targetQuat);
      entries.push(entry);
    });
  };

  const update = (
    elapsed: number,
    delta: number,
    realm: ShowcaseRealm,
    hoveredMemoryId: string | null,
    selectedMemoryId: string | null,
    orbitPaused: boolean,
    skyFlightTime?: number,
  ) => {
    activeRealm = realm;
    const shouldPause = orbitPaused || selectedMemoryId !== null || hoveredMemoryId !== null;
    if (!shouldPause && realm === 'heart') {
      orbitAngle += delta * 0.12;
    }
    const count = entries.length;
    const posLambda = 3.6;
    const rotAlpha = 1 - Math.exp(-4.2 * delta);

    for (let i = 0; i < count; i += 1) {
      const entry = entries[i];
      const isHovered = entry.memory.id === hoveredMemoryId;
      const isSelected = entry.memory.id === selectedMemoryId;

      entry.hoverAmount = THREE.MathUtils.damp(entry.hoverAmount, isHovered ? 1 : 0, 8, delta);
      entry.activeAmount = THREE.MathUtils.damp(entry.activeAmount, isSelected ? 1 : 0, 6.5, delta);

      computeFrameTargetTransform(entry, count, elapsed, realm, skyFlightTime);

      // Smoothly update photo frame transforms per realm
      if (realm === 'sky') {
        const distSq = entry.group.position.distanceToSquared(_targetPos);
        if (distSq > 25.0) {
          // Snap instantly when entering sky realm or spawning to prevent trailing drag
          entry.group.position.copy(_targetPos);
        } else {
          // Tight, high-responsiveness tracking locked to phoenix flight
          const skyLambda = 18.0;
          entry.group.position.x = THREE.MathUtils.damp(entry.group.position.x, _targetPos.x, skyLambda, delta);
          entry.group.position.y = THREE.MathUtils.damp(entry.group.position.y, _targetPos.y, skyLambda, delta);
          entry.group.position.z = THREE.MathUtils.damp(entry.group.position.z, _targetPos.z, skyLambda, delta);
        }
        entry.group.quaternion.slerp(_targetQuat, 1 - Math.exp(-8.0 * delta));
      } else {
        entry.group.position.x = THREE.MathUtils.damp(entry.group.position.x, _targetPos.x, posLambda, delta);
        entry.group.position.y = THREE.MathUtils.damp(entry.group.position.y, _targetPos.y, posLambda, delta);
        entry.group.position.z = THREE.MathUtils.damp(entry.group.position.z, _targetPos.z, posLambda, delta);
        entry.group.quaternion.slerp(_targetQuat, rotAlpha);
      }

      const scale = 1 + entry.hoverAmount * 0.07 + entry.activeAmount * 0.1;
      entry.group.scale.setScalar(scale);

      // High, luminous clarity so portraits of chị Thạch Thảo are always bright and clear
      const realmBoost = realm === 'underwater' ? 0.15 : 0.0;
      entry.photoMaterial.emissiveIntensity =
        0.65 + realmBoost + entry.hoverAmount * 0.15 + entry.activeAmount * 0.20;
    }
  };

  return {
    root,
    getHitPlanes: () => entries.map((e) => e.hitPlane),
    setMemories,
    getFrameWorldFocus: (memoryId, targetPos, targetCamPos) => {
      const entry = entries.find((e) => e.memory.id === memoryId);
      if (!entry) return false;

      entry.group.updateMatrixWorld(true);
      entry.group.getWorldPosition(_worldPos);
      entry.group.getWorldQuaternion(_worldQuat);
      _worldNormal.set(0, 0, 1).applyQuaternion(_worldQuat).normalize();

      targetPos.copy(_worldPos);
      targetCamPos.copy(_worldPos).addScaledVector(_worldNormal, 2.95);
      targetCamPos.y += 0.12;
      return true;
    },
    getFrameWorldPosition: (index: number, out: THREE.Vector3) => {
      if (index < 0 || index >= entries.length) return false;
      const entry = entries[index];
      entry.group.updateMatrixWorld(true);
      entry.group.getWorldPosition(out);
      return true;
    },
    update,
    dispose: () => {
      clearEntries();
      sharedGeos.forEach((g) => g.dispose());
      sharedMats.forEach((m) => m.dispose());
      backPlateTex.dispose();
    },
  };
}
