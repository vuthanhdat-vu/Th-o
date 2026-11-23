import * as THREE from 'three';
import { publicAssetUrl } from '../services/publicAssetUrl';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import type { ShowcaseRealm } from '../types/showcase';
import { sampleSkyConvoy, type SkyConvoySample } from './skyFlightTrajectory';
import {
  createSandPbrMaps,
  createRockPbrMaps,
  createArchMetalMaps,
  createCloudBillboardTexture,
} from './terrainMaps';

export interface ShowcaseRealmsRig {
  root: THREE.Group;
  hitProxies: THREE.Mesh[];
  update: (
    elapsed: number,
    delta: number,
    currentRealm?: ShowcaseRealm,
    cameraY?: number,
    camFlightActive?: boolean,
    getFrameWorldPos?: (index: number, out: THREE.Vector3) => boolean,
    skyFlightTime?: number,
  ) => void;
  dispose: () => void;
}

export const REALM_ANCHORS: Record<
  ShowcaseRealm,
  {
    center: [number, number, number];
    cameraPos: [number, number, number];
    cameraTarget: [number, number, number];
    label: string;
  }
> = {
  heart: {
    center: [0, 0.2, 0],
    cameraPos: [0, 1.35, 9.2],
    cameraTarget: [0, 0.15, 0],
    label: 'Bánh kem sinh nhật',
  },
  sky: {
    center: [0, 11.4, -10.5],
    cameraPos: [0, 12.0, -2.4],
    cameraTarget: [0, 11.35, -10.5],
    label: 'Bầu trời hoàng hôn',
  },
  underwater: {
    center: [0, -9.1, 2.0],
    cameraPos: [0, -8.35, 9.85],
    cameraTarget: [0, -9.15, 2.0],
    label: 'Thế giới dưới nước',
  },
  'cat-island': {
    center: [15.5, -0.25, -7.5],
    cameraPos: [10.4, 1.45, 0.25],
    cameraTarget: [15.5, -0.55, -7.5],
    label: 'Hòn Đảo Mèo',
  },
};

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const _tempWorldPos = new THREE.Vector3();
const _tempLocalPos = new THREE.Vector3();
const _pTop = new THREE.Vector3();
const _pMid = new THREE.Vector3();
const _pBot = new THREE.Vector3();

const _skyConvoySample: SkyConvoySample = {
  phoenixPos: new THREE.Vector3(),
  phoenixQuat: new THREE.Quaternion(),
  framePos: new THREE.Vector3(),
  frameQuat: new THREE.Quaternion(),
};

function updateTetherGeometry(
  geo: THREE.BufferGeometry,
  pBot: THREE.Vector3,
  pMid: THREE.Vector3,
  pTop: THREE.Vector3,
  radius: number,
) {
  const posAttr = geo.attributes.position as THREE.BufferAttribute;
  const normAttr = geo.attributes.normal as THREE.BufferAttribute;
  const posArr = posAttr.array as Float32Array;
  const normArr = normAttr.array as Float32Array;

  const segments = 20;
  const radial = 6;
  const angleStep = (Math.PI * 2) / radial;

  let vIdx = 0;
  for (let i = 0; i <= segments; i += 1) {
    const u = i / segments;
    const u1 = 1 - u;

    // Quadratic Bezier curve point
    const cx = u1 * u1 * pBot.x + 2 * u1 * u * pMid.x + u * u * pTop.x;
    const cy = u1 * u1 * pBot.y + 2 * u1 * u * pMid.y + u * u * pTop.y;
    const cz = u1 * u1 * pBot.z + 2 * u1 * u * pMid.z + u * u * pTop.z;

    // Tangent dP/du = 2(1-u)(pMid - pBot) + 2u(pTop - pMid)
    let tx = 2 * u1 * (pMid.x - pBot.x) + 2 * u * (pTop.x - pMid.x);
    let ty = 2 * u1 * (pMid.y - pBot.y) + 2 * u * (pTop.y - pMid.y);
    let tz = 2 * u1 * (pMid.z - pBot.z) + 2 * u * (pTop.z - pMid.z);
    const tLen = Math.hypot(tx, ty, tz) || 1e-4;
    tx /= tLen;
    ty /= tLen;
    tz /= tLen;

    // Reference normal
    let nx = -tz;
    let ny = 0;
    let nz = tx;
    const nLen = Math.hypot(nx, nz);
    if (nLen < 1e-3) {
      nx = 1;
      ny = 0;
      nz = 0;
    } else {
      nx /= nLen;
      nz /= nLen;
    }

    // Binormal B = T x N
    const bx = ty * nz - tz * ny;
    const by = tz * nx - tx * nz;
    const bz = tx * ny - ty * nx;

    for (let j = 0; j < radial; j += 1) {
      const theta = j * angleStep;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      const rnx = cosT * nx + sinT * bx;
      const rny = cosT * ny + sinT * by;
      const rnz = cosT * nz + sinT * bz;

      posArr[vIdx] = cx + rnx * radius;
      posArr[vIdx + 1] = cy + rny * radius;
      posArr[vIdx + 2] = cz + rnz * radius;

      normArr[vIdx] = rnx;
      normArr[vIdx + 1] = rny;
      normArr[vIdx + 2] = rnz;

      vIdx += 3;
    }
  }

  posAttr.needsUpdate = true;
  normAttr.needsUpdate = true;
}

/**
 * Computes exact island surface height relative to ocean level y = -2.4 at local (lx, lz).
 * Used to ground every cat, palm tree, lantern, and rock flush with zero floating.
 */
export function getCatIslandElevation(lx: number, lz: number): number {
  const r = Math.hypot(lx * 0.94, lz * 1.08);
  const mound = Math.exp(-(r * r) / 14.5) * 2.55;
  const ripple = Math.sin(lx * 0.75) * Math.cos(lz * 0.7) * 0.12 * Math.exp(-(r * r) / 18.0);
  return mound + ripple - 0.52;
}

/**
 * Computes exact seabed surface height relative to ocean floor level y = -12.6 at world (wx, wz).
 * Used to ground every coral colony, kelp frond, and reef formation flush with zero floating.
 */
export function getSeabedElevation(wx: number, wz: number): number {
  const lx = wx;
  const lz = wz - 2.0;
  const dune =
    Math.sin(lx * 0.22) * Math.cos(lz * 0.19) * 0.55 +
    Math.sin((lx + lz) * 0.7) * 0.14;
  return -12.6 + dune;
}

/**
 * Builds a composite 10-part adorable seated 3D cat.
 * Pivoted at bottom-center (y = 0) so it seats flush on sand, grass, rock, or wooden pier.
 */
function createCompositeCat(
  coatColor: string,
  bellyColor: string,
  earInnerColor: string,
  accentPatchColor: string | null,
  scale: number,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
): { group: THREE.Group; tail: THREE.Mesh; head: THREE.Group } {
  const cat = new THREE.Group();
  cat.scale.setScalar(scale);

  const furMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(coatColor),
    roughness: 0.86,
    metalness: 0.02,
  });
  const bellyMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(bellyColor),
    roughness: 0.9,
    metalness: 0.0,
  });
  const innerEarMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(earInnerColor),
    roughness: 0.75,
  });
  const eyeMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#141118'),
    roughness: 0.08,
    clearcoat: 1.0,
  });
  const catchlightMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const noseMat = new THREE.MeshStandardMaterial({ color: '#e8909c', roughness: 0.5 });
  const collarMat = new THREE.MeshStandardMaterial({
    color: '#c94c70',
    roughness: 0.55,
  });
  const bellMat = new THREE.MeshStandardMaterial({
    color: '#e5b887',
    metalness: 0.88,
    roughness: 0.25,
  });
  materials.push(furMat, bellyMat, innerEarMat, eyeMat, catchlightMat, noseMat, collarMat, bellMat);

  // 1. Seated pear-shaped body via LatheGeometry
  const bodyProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.28, 0.0),
    new THREE.Vector2(0.32, 0.14),
    new THREE.Vector2(0.29, 0.34),
    new THREE.Vector2(0.21, 0.54),
    new THREE.Vector2(0.14, 0.62),
    new THREE.Vector2(0.0, 0.64),
  ];
  const bodyGeo = new THREE.LatheGeometry(bodyProfile, 22);
  geometries.push(bodyGeo);
  const body = new THREE.Mesh(bodyGeo, furMat);
  body.castShadow = true;
  body.receiveShadow = true;
  cat.add(body);

  // 2. Soft cream/white chest bib
  const chestGeo = new THREE.SphereGeometry(0.2, 16, 14);
  geometries.push(chestGeo);
  const chest = new THREE.Mesh(chestGeo, bellyMat);
  chest.scale.set(0.82, 1.15, 0.65);
  chest.position.set(0, 0.32, 0.14);
  cat.add(chest);

  if (accentPatchColor) {
    const patchMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(accentPatchColor),
      roughness: 0.88,
    });
    materials.push(patchMat);
    const patchGeo = new THREE.SphereGeometry(0.19, 14, 12);
    geometries.push(patchGeo);
    const patch = new THREE.Mesh(patchGeo, patchMat);
    patch.scale.set(0.95, 1.0, 0.8);
    patch.position.set(0.12, 0.26, -0.1);
    cat.add(patch);
  }

  // 3. Cute tucked front paws
  const pawGeo = new THREE.SphereGeometry(0.082, 12, 10);
  geometries.push(pawGeo);
  const leftPaw = new THREE.Mesh(pawGeo, bellyMat);
  leftPaw.scale.set(0.9, 0.62, 1.25);
  leftPaw.position.set(-0.1, 0.05, 0.25);
  cat.add(leftPaw);

  const rightPaw = new THREE.Mesh(pawGeo, bellyMat);
  rightPaw.scale.set(0.9, 0.62, 1.25);
  rightPaw.position.set(0.1, 0.05, 0.25);
  cat.add(rightPaw);

  // 4. Collar & tiny rose-gold bell
  const collarGeo = new THREE.TorusGeometry(0.155, 0.022, 10, 24);
  collarGeo.rotateX(Math.PI / 2);
  geometries.push(collarGeo);
  const collar = new THREE.Mesh(collarGeo, collarMat);
  collar.position.set(0, 0.56, 0.03);
  cat.add(collar);

  const bellGeo = new THREE.SphereGeometry(0.034, 10, 10);
  geometries.push(bellGeo);
  const bell = new THREE.Mesh(bellGeo, bellMat);
  bell.position.set(0, 0.52, 0.19);
  cat.add(bell);

  // 5. Rounded Head Group
  const head = new THREE.Group();
  head.position.set(0, 0.74, 0.06);
  cat.add(head);

  const headGeo = new THREE.SphereGeometry(0.225, 22, 18);
  geometries.push(headGeo);
  const headMesh = new THREE.Mesh(headGeo, furMat);
  headMesh.scale.set(1.08, 0.96, 1.0);
  headMesh.castShadow = true;
  head.add(headMesh);

  // 6. Soft muzzle cheeks
  const cheekGeo = new THREE.SphereGeometry(0.072, 12, 10);
  geometries.push(cheekGeo);
  const leftCheek = new THREE.Mesh(cheekGeo, bellyMat);
  leftCheek.position.set(-0.06, -0.055, 0.19);
  head.add(leftCheek);
  const rightCheek = new THREE.Mesh(cheekGeo, bellyMat);
  rightCheek.position.set(0.06, -0.055, 0.19);
  head.add(rightCheek);

  // 7. Pointed triangular ears
  const earGeo = new THREE.ConeGeometry(0.088, 0.19, 4);
  const innerEarGeo = new THREE.ConeGeometry(0.052, 0.13, 4);
  geometries.push(earGeo, innerEarGeo);

  const makeEar = (side: -1 | 1) => {
    const earGroup = new THREE.Group();
    earGroup.position.set(side * 0.14, 0.18, 0.01);
    earGroup.rotation.set(0.08, side * 0.2, -side * 0.26);
    const outer = new THREE.Mesh(earGeo, furMat);
    outer.castShadow = true;
    earGroup.add(outer);
    const inner = new THREE.Mesh(innerEarGeo, innerEarMat);
    inner.position.set(0, -0.015, 0.025);
    earGroup.add(inner);
    return earGroup;
  };
  head.add(makeEar(-1));
  head.add(makeEar(1));

  // 8. Glossy eyes with tiny catchlight + pink nose
  const eyeGeo = new THREE.SphereGeometry(0.038, 12, 10);
  const shineGeo = new THREE.SphereGeometry(0.012, 8, 8);
  const noseGeo = new THREE.SphereGeometry(0.024, 10, 8);
  geometries.push(eyeGeo, shineGeo, noseGeo);

  for (const side of [-1, 1] as const) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(side * 0.095, 0.02, 0.192);
    head.add(eye);
    const shine = new THREE.Mesh(shineGeo, catchlightMat);
    shine.position.set(side * 0.095 + 0.012, 0.032, 0.224);
    head.add(shine);
  }
  const nose = new THREE.Mesh(noseGeo, noseMat);
  nose.scale.set(1.2, 0.85, 0.8);
  nose.position.set(0, -0.032, 0.232);
  head.add(nose);

  // 9. Curved animated TubeGeometry tail
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.1, -0.24),
    new THREE.Vector3(0.04, 0.22, -0.44),
    new THREE.Vector3(0.14, 0.44, -0.48),
    new THREE.Vector3(0.06, 0.62, -0.38),
  ]);
  const tailGeo = new THREE.TubeGeometry(tailCurve, 24, 0.045, 10, false);
  geometries.push(tailGeo);
  const tail = new THREE.Mesh(tailGeo, furMat);
  tail.castShadow = true;
  cat.add(tail);

  return { group: cat, tail, head };
}

/**
 * Builds a curved coastal coconut palm tree with swayable crown.
 */
function createPalmTree(
  height: number,
  leanX: number,
  leanZ: number,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
): { group: THREE.Group; crown: THREE.Group } {
  const tree = new THREE.Group();

  const trunkMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#4a372f'),
    roughness: 0.92,
    metalness: 0.02,
  });
  const frondMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#2d4a35'),
    roughness: 0.78,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });
  const coconutMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#5a3d28'),
    roughness: 0.85,
  });
  materials.push(trunkMat, frondMat, coconutMat);

  const p0 = new THREE.Vector3(0, 0, 0);
  const p1 = new THREE.Vector3(leanX * 0.25, height * 0.35, leanZ * 0.25);
  const p2 = new THREE.Vector3(leanX * 0.68, height * 0.72, leanZ * 0.68);
  const p3 = new THREE.Vector3(leanX, height, leanZ);
  const curve = new THREE.CatmullRomCurve3([p0, p1, p2, p3]);
  const trunkGeo = new THREE.TubeGeometry(curve, 20, 0.13, 10, false);

  const posAttr = trunkGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i += 1) {
    const y = posAttr.getY(i);
    const t = THREE.MathUtils.clamp(y / height, 0, 1);
    const center = curve.getPoint(t);
    const taper = THREE.MathUtils.lerp(1.42, 0.62, t);
    posAttr.setXYZ(
      i,
      center.x + (posAttr.getX(i) - center.x) * taper,
      y,
      center.z + (posAttr.getZ(i) - center.z) * taper,
    );
  }
  trunkGeo.computeVertexNormals();
  geometries.push(trunkGeo);

  const trunkMesh = new THREE.Mesh(trunkGeo, trunkMat);
  trunkMesh.castShadow = true;
  trunkMesh.receiveShadow = true;
  tree.add(trunkMesh);

  const crown = new THREE.Group();
  crown.position.copy(p3);
  tree.add(crown);

  const frondShape = new THREE.Shape();
  frondShape.moveTo(0, 0);
  frondShape.quadraticCurveTo(0.26, 0.75, 0.16, 1.55);
  frondShape.quadraticCurveTo(0.08, 2.05, 0, 2.35);
  frondShape.quadraticCurveTo(-0.08, 2.05, -0.16, 1.55);
  frondShape.quadraticCurveTo(-0.26, 0.75, 0, 0);

  const frondGeo = new THREE.ShapeGeometry(frondShape, 12);
  const fPos = frondGeo.attributes.position;
  for (let i = 0; i < fPos.count; i += 1) {
    const x = fPos.getX(i);
    const y = fPos.getY(i);
    const bendZ = Math.pow(y / 2.35, 1.9) * 1.15;
    const vFold = Math.abs(x) * 0.25;
    fPos.setXYZ(i, x, y * 0.58 - bendZ * 0.52, bendZ + vFold);
  }
  frondGeo.computeVertexNormals();
  geometries.push(frondGeo);

  const frondCount = 9;
  const frondGeos: THREE.BufferGeometry[] = [];
  for (let i = 0; i < frondCount; i += 1) {
    const angle = (i / frondCount) * Math.PI * 2 + (i % 2) * 0.15;
    const g = frondGeo.clone();
    const s = 0.82 + (i % 3) * 0.12;
    const rx = 0.22 + (i % 3) * 0.14;
    g.scale(s, s, s);
    g.rotateX(rx);
    g.rotateY(angle);
    frondGeos.push(g);
  }
  const mergedFrondsGeo = BufferGeometryUtils.mergeGeometries(frondGeos);
  frondGeos.forEach((g) => g.dispose());
  geometries.push(mergedFrondsGeo);

  const frondsMesh = new THREE.Mesh(mergedFrondsGeo, frondMat);
  frondsMesh.castShadow = true;
  crown.add(frondsMesh);

  const cocoGeo = new THREE.SphereGeometry(0.11, 10, 10);
  const cocoGeos: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 3; i += 1) {
    const a = (i / 3) * Math.PI * 2;
    const cg = cocoGeo.clone();
    cg.translate(Math.cos(a) * 0.13, -0.12, Math.sin(a) * 0.13);
    cocoGeos.push(cg);
  }
  cocoGeo.dispose();
  const mergedCocoGeo = BufferGeometryUtils.mergeGeometries(cocoGeos);
  cocoGeos.forEach((g) => g.dispose());
  geometries.push(mergedCocoGeo);

  const cocosMesh = new THREE.Mesh(mergedCocoGeo, coconutMat);
  crown.add(cocosMesh);

  return { group: tree, crown };
}

/**
 * Builds the 3 interactive 3D Photo Showcase Realms:
 * 1. Sky Sanctuary (sunset volumetric billboard clouds + phoenix birds)
 * 2. Underwater Reef (Voronoi caustics seabed, Snell's window, god rays, geology reef, fish, bubbles)
 * 3. Cat Island (PBR island terrain, 5 animated GLB cats, palms, wooden pier, warm lanterns with bloom)
 */
export function createShowcaseRealms(
  isSoftwareGl: boolean,
  maxAnisotropy = 4,
): ShowcaseRealmsRig {
  const root = new THREE.Group();
  const hitProxies: THREE.Mesh[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  const loadedGroups: THREE.Object3D[] = [];
  const mixers: THREE.AnimationMixer[] = [];

  const gltfLoader = new GLTFLoader();
  const textureLoader = new THREE.TextureLoader();

  // =========================================================================
  // REALM 1: SKY SANCTUARY — Volumetric Billboard Clouds + Phoenix Birds
  // =========================================================================
  const skyGroup = new THREE.Group();
  skyGroup.position.set(...REALM_ANCHORS.sky.center);
  root.add(skyGroup);

  // Volumetric Billboard Cloud Shading (warm coral-pink sunlit base -> twilight lavender crown)
  const cloudTex = createCloudBillboardTexture();
  textures.push(cloudTex);

  const cloudPuffGeo = new THREE.PlaneGeometry(3.2, 2.4);
  geometries.push(cloudPuffGeo);

  const cloudShaderMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
    uniforms: {
      uMap: { value: cloudTex },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vWorldPos;

      void main() {
        vec4 tex = texture2D(uMap, vUv);
        if (tex.a < 0.015) discard;

        // Gradient: Fluffy clouds with rich twilight lavender-violet shadow and soft pearl highlights
        vec3 cloudShadowLavender = vec3(0.34, 0.24, 0.58);
        vec3 cloudBodyPureWhite  = vec3(0.70, 0.66, 0.82);
        vec3 cloudWarmGoldenRim  = vec3(0.76, 0.56, 0.44);
        vec3 cloudSoftSkyBlue    = vec3(0.40, 0.48, 0.82);

        float vGrad = smoothstep(0.12, 0.88, vUv.y);
        vec3 bottomCol = mix(cloudShadowLavender, cloudWarmGoldenRim, vUv.x);
        vec3 topCol = mix(cloudBodyPureWhite, cloudSoftSkyBlue, vUv.x * 0.55);
        vec3 col = mix(bottomCol, topCol, vGrad);

        // Sunlit rim warmth on the lower underside
        float rimGlow = exp(-pow((vUv.y - 0.22) / 0.22, 2.0)) * 0.12;
        col += cloudWarmGoldenRim * rimGlow;

        // Gentle, soft ethereal clouds that enhance the deep blue-violet sky
        gl_FragColor = vec4(col, tex.a * 0.20);
      }
    `,
  });
  materials.push(cloudShaderMat);

  // Soft peripheral cloud banks framing the sunset panorama without blocking the center
  const bankSpecs = [
    { x: -6.4, y: -2.8, z: -3.5, s: 1.25 },
    { x: 6.5, y: -2.6, z: -3.2, s: 1.2 },
    { x: -4.8, y: 3.4, z: -5.5, s: 1.15 },
    { x: 4.8, y: 3.2, z: -5.8, s: 1.1 },
    { x: -8.2, y: 0.4, z: -4.5, s: 1.3 },
    { x: 8.4, y: 0.6, z: -4.2, s: 1.25 },
  ];

  const cloudCount = bankSpecs.length * 6;
  const cloudMesh = new THREE.InstancedMesh(cloudPuffGeo, cloudShaderMat, cloudCount);
  cloudMesh.frustumCulled = false;
  cloudMesh.visible = false;
  skyGroup.add(cloudMesh);

  interface CloudPuffData {
    baseX: number;
    baseY: number;
    baseZ: number;
    rotX: number;
    rotY: number;
    rotZ: number;
    scaleX: number;
    scaleY: number;
    speed: number;
    phase: number;
  }
  const cloudPuffs: CloudPuffData[] = [];
  bankSpecs.forEach((spec, bIdx) => {
    for (let p = 0; p < 6; p += 1) {
      const px = spec.x + (p - 2.5) * 0.92 * spec.s;
      const py = spec.y + Math.sin(p * 1.4 + bIdx) * 0.35 * spec.s;
      const pz = spec.z + Math.cos(p * 1.9 + bIdx) * 0.55 * spec.s;
      cloudPuffs.push({
        baseX: px,
        baseY: py,
        baseZ: pz,
        rotX: 0.12 * Math.sin(p),
        rotY: 0.15 * Math.cos(p),
        rotZ: 0.08 * (p - 2.5),
        scaleX: (1.15 + (p % 3) * 0.25) * spec.s,
        scaleY: (0.85 + (p % 2) * 0.22) * spec.s,
        speed: 0.12 + bIdx * 0.02,
        phase: bIdx * 1.1,
      });
    }
  });

  // =========================================================================
  // CELESTIAL SKY DECORATION: Meteor Shower & Falling Blue Comets
  // Models: meteor-shower-background (14914.jpg) & falling-comets-asteroids-meteors-with-blue-flame-trail-cosmos (4407.jpg)
  // =========================================================================
  const meteorShowerTex = textureLoader.load(publicAssetUrl('models/meteor-shower-background/14914.jpg'));
  meteorShowerTex.colorSpace = THREE.SRGBColorSpace;
  meteorShowerTex.anisotropy = maxAnisotropy;
  textures.push(meteorShowerTex);

  const blueCometsTex = textureLoader.load(publicAssetUrl('models/falling-comets-asteroids-meteors-with-blue-flame-trail-cosmos/4407.jpg'));
  blueCometsTex.colorSpace = THREE.SRGBColorSpace;
  blueCometsTex.anisotropy = maxAnisotropy;
  textures.push(blueCometsTex);

  // 1. Meteor Shower Background Shader (Radiant purple/violet cosmic meteor streams & starbursts)
  const meteorShowerMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uMap: { value: meteorShowerTex },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vWorldPos;

      void main() {
        // Discard bottom banner text completely (VECTOR COMETS)
        if (vUv.y < 0.22) discard;

        vec4 tex = texture2D(uMap, vUv);
        // Isolate glowing violet/purple meteor streaks & stars
        vec3 glow = max(tex.rgb - vec3(0.04, 0.035, 0.07), vec3(0.0));
        float lum = dot(glow, vec3(0.299, 0.587, 0.114));
        if (lum < 0.015) discard;

        // Smooth boundary feathering to erase any rectangular edges
        float edgeFade = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x) *
                         smoothstep(0.22, 0.32, vUv.y) * smoothstep(1.0, 0.88, vUv.y);

        float twinkle = 0.88 + 0.12 * sin(uTime * 2.2 + vUv.x * 24.0 + vUv.y * 18.0);
        float pulse = 0.92 + 0.08 * sin(uTime * 0.85);

        vec3 col = glow * twinkle * pulse * 2.45;
        // Harmonize with deep romantic twilight blue-violet sky
        col.r *= 1.20;
        col.b *= 1.40;

        gl_FragColor = vec4(col, clamp(lum * edgeFade * 0.98, 0.0, 1.0));
      }
    `,
  });
  materials.push(meteorShowerMat);

  const showerPlaneGeo = new THREE.PlaneGeometry(1, 1);
  geometries.push(showerPlaneGeo);

  // Layered meteor shower celestial arcs framing the upper sky
  const showerBackdrops = [
    // Main panoramic backdrop high behind the photos and phoenixes
    { x: 0.0, y: 5.2, z: -9.5, sx: 32.0, sy: 17.0, rot: [-0.16, 0.0, 0.0] },
    // High zenith canopy
    { x: -3.0, y: 8.8, z: -7.5, sx: 26.0, sy: 14.0, rot: [-0.28, 0.22, -0.15] },
    // Right wing celestial stream
    { x: 5.5, y: 6.5, z: -7.0, sx: 22.0, sy: 13.0, rot: [-0.22, -0.32, 0.12] },
  ];
  showerBackdrops.forEach((cfg) => {
    const mesh = new THREE.Mesh(showerPlaneGeo, meteorShowerMat);
    mesh.position.set(cfg.x, cfg.y, cfg.z);
    mesh.scale.set(cfg.sx, cfg.sy, 1.0);
    mesh.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]);
    mesh.renderOrder = -4;
    skyGroup.add(mesh);
  });

  // 2. Falling Blue Comets & Asteroids Shader (Brilliant cyan-blue flame trails & star flares)
  const blueCometMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uMap: { value: blueCometsTex },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vWorldPos;

      void main() {
        vec4 tex = texture2D(uMap, vUv);
        // Suppress background void, isolate brilliant cyan/blue flame trails & diamond cores
        vec3 glow = max(tex.rgb - vec3(0.035, 0.045, 0.08), vec3(0.0));
        float lum = dot(glow, vec3(0.299, 0.587, 0.114));
        if (lum < 0.012) discard;

        // Smooth edge feathering
        float edgeFade = smoothstep(0.0, 0.10, vUv.x) * smoothstep(1.0, 0.90, vUv.x) *
                         smoothstep(0.0, 0.10, vUv.y) * smoothstep(1.0, 0.90, vUv.y);

        // Vivid celestial blue flame saturation boost - radiant brilliant luminosity
        glow.b *= 1.45;
        glow.g *= 1.25;

        float trailShimmer = 0.88 + 0.12 * sin(uTime * 3.4 - vUv.x * 14.0);
        float corePulse = 0.94 + 0.06 * sin(uTime * 1.6);

        gl_FragColor = vec4(glow * trailShimmer * corePulse * 2.35, clamp(lum * edgeFade * 0.98, 0.0, 1.0));
      }
    `,
  });
  materials.push(blueCometMat);

  const cometPlaneGeo = new THREE.PlaneGeometry(1, 1);
  geometries.push(cometPlaneGeo);

  interface BlueCometRig {
    mesh: THREE.Mesh;
    baseX: number;
    baseY: number;
    baseZ: number;
    speed: number;
    phase: number;
    driftX: number;
    driftY: number;
  }
  const blueComets: BlueCometRig[] = [];
  const cometConfigs = [
    // Grand blue comet soaring across the upper sky
    { x: 1.5, y: 4.8, z: -5.2, sx: 15.0, sy: 6.8, rot: [-0.15, 0.12, -0.26], speed: 0.35, phase: 0.0, driftX: 0.65, driftY: -0.25 },
    // High zenith shooting comet
    { x: -5.8, y: 7.6, z: -5.8, sx: 11.5, sy: 5.2, rot: [-0.28, 0.32, -0.30], speed: 0.42, phase: 1.8, driftX: 0.50, driftY: -0.20 },
    // Left flank soaring comet
    { x: -8.5, y: 3.2, z: -4.2, sx: 9.5, sy: 4.2, rot: [-0.10, -0.22, -0.20], speed: 0.38, phase: 3.2, driftX: 0.45, driftY: -0.18 },
    // Right flank soaring comet
    { x: 7.8, y: 3.8, z: -4.5, sx: 10.2, sy: 4.6, rot: [-0.16, 0.20, -0.32], speed: 0.40, phase: 4.5, driftX: 0.55, driftY: -0.22 },
    // High zenith upper right comet
    { x: 4.2, y: 8.8, z: -6.5, sx: 8.5, sy: 3.8, rot: [-0.32, 0.08, -0.24], speed: 0.45, phase: 2.1, driftX: 0.40, driftY: -0.15 },
    // Swift shooting star comet under photo gallery
    { x: -2.8, y: -1.6, z: -3.8, sx: 7.2, sy: 3.2, rot: [0.12, -0.15, -0.22], speed: 0.55, phase: 5.4, driftX: 0.70, driftY: -0.28 },
  ];

  cometConfigs.forEach((cfg) => {
    const mesh = new THREE.Mesh(cometPlaneGeo, blueCometMat);
    mesh.position.set(cfg.x, cfg.y, cfg.z);
    mesh.scale.set(cfg.sx, cfg.sy, 1.0);
    mesh.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]);
    mesh.renderOrder = -3;
    skyGroup.add(mesh);

    blueComets.push({
      mesh,
      baseX: cfg.x,
      baseY: cfg.y,
      baseZ: cfg.z,
      speed: cfg.speed,
      phase: cfg.phase,
      driftX: cfg.driftX,
      driftY: cfg.driftY,
    });
  });

  // =========================================================================
  // 5 SOARING PHOENIX BIRDS CARRYING 5 SKY PHOTOS VIA SPARKLING ROSE-GOLD SILVER TETHERS
  // (Ring under photos removed per user specification)
  // =========================================================================

  // Rose-Gold Silver Sparkling Tether Shader Material
  const tetherShaderMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewDir;

      void main() {
        // Shimmering woven silver and rose-gold metallic luster
        vec3 sterlingSilver = vec3(0.95, 0.96, 0.99);
        vec3 roseGold       = vec3(0.98, 0.72, 0.74);
        vec3 champagneGold  = vec3(1.00, 0.88, 0.62);

        // Spiral cord twist pattern
        float cordSpiral = sin(vUv.y * 70.0 + vUv.x * 6.28 + uTime * 2.0);
        vec3 baseMat = mix(sterlingSilver, roseGold, 0.5 + 0.5 * cordSpiral);
        baseMat = mix(baseMat, champagneGold, 0.25 * sin(vUv.y * 30.0 - uTime * 1.5));

        // Metallic Fresnel rim
        float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 2.2);
        baseMat += roseGold * fresnel * 0.65;

        // Diamond sparkles & glistening points running along the tether
        float sparkle1 = pow(max(0.0, sin(vUv.y * 38.0 - uTime * 4.2)), 26.0) * 2.6;
        float sparkle2 = pow(max(0.0, cos(vUv.y * 56.0 + uTime * 3.6 + vUv.x * 3.14)), 30.0) * 2.2;
        float glint = sparkle1 + sparkle2;

        vec3 finalColor = baseMat + vec3(1.0, 0.98, 1.0) * glint;
        gl_FragColor = vec4(finalColor, 0.96);
      }
    `,
  });
  materials.push(tetherShaderMat);

  // Helper: Preallocated tubular buffer geometry for zero-GC dynamic rope deformation
  function createTetherBufferGeometry(segments: number, radialSegments: number): THREE.BufferGeometry {
    const vertexCount = (segments + 1) * radialSegments;
    const indexCount = segments * radialSegments * 6;
    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const indices = new Uint16Array(indexCount);

    let idx = 0;
    for (let i = 0; i < segments; i += 1) {
      for (let j = 0; j < radialSegments; j += 1) {
        const nextJ = (j + 1) % radialSegments;
        const a = i * radialSegments + j;
        const b = (i + 1) * radialSegments + j;
        const c = (i + 1) * radialSegments + nextJ;
        const d = i * radialSegments + nextJ;
        indices[idx++] = a;
        indices[idx++] = b;
        indices[idx++] = d;
        indices[idx++] = b;
        indices[idx++] = c;
        indices[idx++] = d;
      }
    }

    for (let i = 0; i <= segments; i += 1) {
      const v = i / segments;
      for (let j = 0; j < radialSegments; j += 1) {
        const u = j / radialSegments;
        const vIdx = (i * radialSegments + j) * 2;
        uvs[vIdx] = u;
        uvs[vIdx + 1] = v;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    return geo;
  }

  // Preallocated clasp and gemstone geometries/materials
  const claspRingGeo = new THREE.TorusGeometry(0.048, 0.010, 12, 24);
  geometries.push(claspRingGeo);
  const gemGeo = new THREE.OctahedronGeometry(0.034, 0);
  geometries.push(gemGeo);

  const roseGoldClaspMat = new THREE.MeshStandardMaterial({
    color: '#ffc5ba',
    metalness: 0.94,
    roughness: 0.18,
    emissive: '#e88f82',
    emissiveIntensity: 0.35,
  });
  materials.push(roseGoldClaspMat);

  const gemSparkleMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    metalness: 0.2,
    roughness: 0.05,
    emissive: '#ffd2dc',
    emissiveIntensity: 0.85,
  });
  materials.push(gemSparkleMat);

  interface PhoenixCarrierRig {
    wrapper: THREE.Group;
    birdIndex: number;
    tetherGeo: THREE.BufferGeometry;
    tetherMesh: THREE.Mesh;
    topClasp: THREE.Mesh;
    botClasp: THREE.Mesh;
    sparkleGems: THREE.Mesh[];
  }
  const phoenixCarriers: PhoenixCarrierRig[] = [];

  // Asynchronously load phoenix_bird.glb and instantiate 5 graceful soaring phoenixes
  gltfLoader.load(
    publicAssetUrl('models/phoenix_bird.glb'),
    (gltf) => {
      const animClip = gltf.animations && gltf.animations.length > 0 ? gltf.animations[0] : null;

      for (let i = 0; i < 5; i += 1) {
        const clonedBird = SkeletonUtils.clone(gltf.scene);
        clonedBird.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.castShadow = !isSoftwareGl;
            m.receiveShadow = !isSoftwareGl;
            const mat = m.material as THREE.MeshStandardMaterial;
            if (mat && mat.isMeshStandardMaterial) {
              mat.roughness = 0.38;
              mat.metalness = 0.28;
              mat.envMapIntensity = 0.95;
            }
          }
        });

        // The phoenix model center of mass is at (-290, 266, 3.8); offset inside wrapper to pivot naturally
        clonedBird.position.set(290, -266, 3.8);
        // Bird head faces +X in model coordinates; rotate Y so it aligns with forward tangent (-Z)
        clonedBird.rotation.y = -Math.PI * 0.5;

        const wrapper = new THREE.Group();
        wrapper.add(clonedBird);

        // Scale factor: calibrated ~2.0m wingspan
        const scale = 0.0022;
        wrapper.scale.setScalar(scale);

        if (animClip) {
          const mixer = new THREE.AnimationMixer(clonedBird);
          const action = mixer.clipAction(animClip);
          action.timeScale = 1.02 + (i % 3) * 0.06;
          action.play();
          mixer.setTime(i * 0.72); // Stagger wing flap timing across the flock
          mixers.push(mixer);
        }

        skyGroup.add(wrapper);
        loadedGroups.push(wrapper);

        // Dynamic sparkling rose-gold silver tether geometry
        const tetherGeo = createTetherBufferGeometry(20, 6);
        geometries.push(tetherGeo);
        const tetherMesh = new THREE.Mesh(tetherGeo, tetherShaderMat);
        tetherMesh.renderOrder = 2;
        skyGroup.add(tetherMesh);

        // Clasps at both ends
        const topClasp = new THREE.Mesh(claspRingGeo, roseGoldClaspMat);
        const botClasp = new THREE.Mesh(claspRingGeo, roseGoldClaspMat);
        skyGroup.add(topClasp);
        skyGroup.add(botClasp);

        // 3 Diamond sparkle gems along each tether
        const sparkleGems: THREE.Mesh[] = [];
        for (let g = 0; g < 3; g += 1) {
          const gem = new THREE.Mesh(gemGeo, gemSparkleMat);
          skyGroup.add(gem);
          sparkleGems.push(gem);
        }

        phoenixCarriers.push({
          wrapper,
          birdIndex: i,
          tetherGeo,
          tetherMesh,
          topClasp,
          botClasp,
          sparkleGems,
        });
      }
    },
    undefined,
    (err) => {
      console.warn('Phoenix bird GLB load:', err);
    },
  );

  // =========================================================================
  // REALM 2: UNDERWATER REEF — Voronoi Caustics, Snell's Window, God Rays, Geology Reef
  // =========================================================================
  const waterGroup = new THREE.Group();
  waterGroup.position.set(0, 0, 0);
  root.add(waterGroup);

  // 1. Snell's Window overhead portal disk at y = -2.42 (Fresnel reflection/refraction)
  const snellGeo = new THREE.CircleGeometry(16.0, 64);
  snellGeo.rotateX(Math.PI / 2);
  geometries.push(snellGeo);

  const snellMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vWorldPos;

      void main() {
        vec3 V = normalize(cameraPosition - vWorldPos);
        vec3 N = vec3(0.0, -1.0, 0.0);
        float cosTheta = max(dot(N, V), 0.0);

        // Snell's Law critical angle: sin(theta_c) = 1.0 / 1.333 => cos(theta_c) ~ 0.66
        float snellCircle = smoothstep(0.44, 0.78, cosTheta);

        // Synchronize with ocean context: soothing turquoise-aquamarine water surface portal
        vec3 skyGlow = mix(vec3(0.08, 0.38, 0.54), vec3(0.28, 0.76, 0.86), pow(cosTheta, 2.0));
        vec3 waterTir = vec3(0.03, 0.12, 0.22);

        vec3 col = mix(waterTir, skyGlow, snellCircle * 0.85);
        float rimGlint = exp(-pow((cosTheta - 0.64) / 0.065, 2.0)) * 0.28;
        col += vec3(0.48, 0.88, 0.98) * rimGlint;

        float distFade = smoothstep(14.0, 0.5, length(vWorldPos.xz - cameraPosition.xz));
        gl_FragColor = vec4(col, 0.82 * distFade);
      }
    `,
  });
  materials.push(snellMat);

  const snellMesh = new THREE.Mesh(snellGeo, snellMat);
  snellMesh.position.set(0, -2.42, 2.0);
  waterGroup.add(snellMesh);

  // 2. Sculpted sandy ocean floor with real dynamic Voronoi Caustics fragment shader
  const seabedGeo = new THREE.PlaneGeometry(62, 62, 64, 64);
  seabedGeo.rotateX(-Math.PI / 2);
  const sbPos = seabedGeo.attributes.position;
  for (let i = 0; i < sbPos.count; i += 1) {
    const x = sbPos.getX(i);
    const z = sbPos.getZ(i);
    const dune =
      Math.sin(x * 0.22) * Math.cos(z * 0.19) * 0.55 +
      Math.sin((x + z) * 0.7) * 0.14;
    sbPos.setY(i, dune);
  }
  seabedGeo.computeVertexNormals();
  geometries.push(seabedGeo);

  const seabedMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      varying vec3 vNormalDir;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vNormalDir = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vWorldPos;
      varying vec3 vNormalDir;

      vec2 voronoiHash(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return fract(sin(p) * 43758.5453);
      }

      // True Voronoi cellular distance noise (d2 - d1) for crisp optical caustic web
      float voronoiCaustic(vec2 p, float t) {
        vec2 n = floor(p);
        vec2 f = fract(p);
        float d1 = 8.0;
        float d2 = 8.0;

        for (int j = -1; j <= 1; j++) {
          for (int i = -1; i <= 1; i++) {
            vec2 g = vec2(float(i), float(j));
            vec2 o = voronoiHash(n + g);
            o = 0.5 + 0.45 * sin(t * 1.6 + 6.2831 * o);
            vec2 r = g + o - f;
            float d = dot(r, r);
            if (d < d1) {
              d2 = d1;
              d1 = d;
            } else if (d < d2) {
              d2 = d;
            }
          }
        }
        float c = sqrt(d2) - sqrt(d1);
        return pow(clamp(1.0 - c * 2.5, 0.0, 1.0), 2.2);
      }

      void main() {
        float dist = length(vWorldPos.xz - vec2(0.0, 2.0));
        vec3 deepSand = vec3(0.11, 0.22, 0.30);
        vec3 litSand = vec3(0.28, 0.42, 0.48);
        float diffuse = clamp(dot(vNormalDir, normalize(vec3(0.2, 1.0, -0.3))), 0.25, 1.0);
        vec3 col = mix(deepSand, litSand, diffuse);

        // Animated Voronoi caustics network
        float c1 = voronoiCaustic(vWorldPos.xz * 0.55, uTime);
        float c2 = voronoiCaustic(vWorldPos.xz * 0.95 + vec2(uTime * 0.12), uTime * 1.35);
        float caustics = c1 * 0.68 + c2 * 0.32;

        float centerMask = exp(-dist * dist / 260.0);
        col += vec3(0.48, 0.74, 0.76) * caustics * 0.45 * centerMask;
        col += vec3(0.68, 0.52, 0.42) * caustics * 0.18 * centerMask;

        // Twilight teal fog transition in the distance
        float fogT = smoothstep(12.0, 32.0, dist);
        col = mix(col, vec3(0.05, 0.16, 0.27), fogT);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  materials.push(seabedMat);

  const seabedMesh = new THREE.Mesh(seabedGeo, seabedMat);
  seabedMesh.position.set(0, -12.6, 2.0);
  waterGroup.add(seabedMesh);

  // 3. Diagonal God Rays with Fresnel Edge Softening (zero polygon seams!)
  const rayGeo = new THREE.CylinderGeometry(0.65, 2.15, 10.6, 16, 1, true);
  geometries.push(rayGeo);

  const rayMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormalV;
      varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vNormalV = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vNormalV;
      varying vec3 vViewDir;

      void main() {
        float verticalFade = smoothstep(0.0, 0.22, vUv.y) * smoothstep(1.0, 0.72, vUv.y);
        float fresnelEdge = pow(clamp(dot(vNormalV, vViewDir), 0.0, 1.0), 1.8);
        float shimmer = 0.82 + 0.18 * sin(vUv.x * 22.0 + uTime * 1.1);
        float alpha = verticalFade * fresnelEdge * shimmer * 0.10;
        vec3 col = mix(vec3(0.25, 0.68, 0.82), vec3(0.55, 0.90, 0.96), (1.0 - vUv.y) * 0.55);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
  materials.push(rayMat);

  const rayPositions = [
    [-3.8, -7.6, -1.2],
    [-1.2, -7.6, 0.4],
    [1.8, -7.6, -0.8],
    [4.1, -7.6, 1.6],
    [0.2, -7.6, 3.4],
  ];
  rayPositions.forEach(([rx, ry, rz], idx) => {
    const shaft = new THREE.Mesh(rayGeo, rayMat);
    shaft.position.set(rx, ry, rz);
    shaft.rotation.set(0.12, idx * 0.4, -0.18);
    waterGroup.add(shaft);
  });

  // 4. Authentic Corals (4 GLB Models: coral_bomen, fan_coral, coral_piece, lowpoly_pack) & Swaying Kelp
  // Swaying Kelp Frond ShaderMaterial (Vertex Shader oscillation)
  const kelpShaderMat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 pos = position;
        float heightFactor = uv.y;
        float swayX = sin(uTime * 1.6 + pos.y * 1.2) * heightFactor * 0.22;
        float swayZ = cos(uTime * 1.2 + pos.y * 0.9) * heightFactor * 0.12;
        pos.x += swayX;
        pos.z += swayZ;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vec3 baseKelp = vec3(0.08, 0.32, 0.28);
        vec3 tipKelp = vec3(0.18, 0.56, 0.46);
        vec3 col = mix(baseKelp, tipKelp, vUv.y);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  materials.push(kelpShaderMat);

  const kelpGeo = new THREE.PlaneGeometry(0.28, 2.4, 2, 12);
  kelpGeo.translate(0, 1.2, 0);
  geometries.push(kelpGeo);

  // Scatter swaying green kelp fronds across all seabed ridges and perimeters
  const kelpSpawns: [number, number][] = [
    // Deep background ridge
    [-13.0, -7.5],
    [-9.0, -8.2],
    [-5.0, -7.0],
    [-1.0, -6.5],
    [3.5, -7.2],
    [7.5, -8.0],
    [12.0, -7.0],
    // Left wing & flank
    [-15.0, 1.0],
    [-12.0, 2.5],
    [-8.5, 2.0],
    [-6.2, 4.0],
    [-4.5, 1.8],
    [-3.8, 3.2],
    // Right wing & flank
    [5.2, 1.5],
    [7.8, 3.5],
    [10.5, 1.8],
    [13.5, 3.0],
    [4.2, 1.4],
    [4.8, 3.0],
    // Foreground sides (clearing central seabed under photos)
    [-5.2, 5.5],
    [5.4, 5.8],
  ];
  kelpSpawns.forEach(([kx, kz], idx) => {
    const ky = getSeabedElevation(kx, kz);
    for (let k = 0; k < 2; k += 1) {
      const kelp = new THREE.Mesh(kelpGeo, kelpShaderMat);
      kelp.position.set(kx + (k - 0.5) * 0.45, ky, kz);
      kelp.rotation.y = idx * 1.1 + k * 1.4;
      kelp.scale.y = 0.85 + (idx % 3) * 0.28;
      waterGroup.add(kelp);
    }
  });

  // =========================================================================
  // 4.1 Model 1: coral_bomen_kappen_gezond.glb (Healthy coral tree colonies with animated reef fish)
  // Distributed evenly across background horizon, wings, and center gallery
  const coralTreeConfigs = [
    // Flanking the photos with breathing room
    { x: -4.2, z: 0.5, scale: 0.052, rotY: 0.45, animSpeed: 1.0, animOffset: 0.0 },
    { x: 4.4, z: 0.9, scale: 0.046, rotY: -1.25, animSpeed: 0.92, animOffset: 2.2 },
    // Deep background horizon
    { x: -9.5, z: -8.0, scale: 0.056, rotY: 1.1, animSpeed: 0.95, animOffset: 4.1 },
    { x: 1.5, z: -9.2, scale: 0.062, rotY: 2.4, animSpeed: 1.05, animOffset: 1.5 },
    { x: 10.5, z: -7.5, scale: 0.050, rotY: -0.8, animSpeed: 0.88, animOffset: 3.3 },
    // Left and Right wide wings
    { x: -14.0, z: 1.2, scale: 0.054, rotY: 0.75, animSpeed: 1.02, animOffset: 5.0 },
    { x: 13.5, z: 2.0, scale: 0.052, rotY: -1.45, animSpeed: 0.96, animOffset: 2.8 },
  ];

  gltfLoader.load(
    publicAssetUrl('models/coral_bomen_kappen_gezond.glb'),
    (gltf) => {
      // Pre-traverse master scene once to enable shadows
      gltf.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = !isSoftwareGl;
          child.receiveShadow = !isSoftwareGl;
        }
      });

      coralTreeConfigs.forEach((cfg, idx) => {
        const colony = idx === 0 ? gltf.scene : SkeletonUtils.clone(gltf.scene);
        loadedGroups.push(colony);
        colony.scale.setScalar(cfg.scale);
        const y = getSeabedElevation(cfg.x, cfg.z) + 0.05;
        colony.position.set(cfg.x, y, cfg.z);
        colony.rotation.set(0, cfg.rotY, 0);
        waterGroup.add(colony);

        if (gltf.animations && gltf.animations.length > 0) {
          const mixer = new THREE.AnimationMixer(colony);
          gltf.animations.forEach((clip) => {
            const action = mixer.clipAction(clip);
            action.timeScale = cfg.animSpeed;
            action.play();
          });
          mixer.setTime(cfg.animOffset);
          mixers.push(mixer);
        }
      });
    },
    undefined,
    (err) => console.warn('Coral bomen GLB load error:', err),
  );

  // 4.2 Model 2: fan_coral_med.glb (Luminous multi-hued sea fan corals: orange, violet, white, yellow)
  // Distributed evenly across all zones: background, left & right flanks, and foreground
  const fanConfigs = [
    // Deep background horizon
    { x: -14.5, z: -7.0, scale: 0.15, rot: [0.05, 0.4, 0] },
    { x: -8.5, z: -8.8, scale: 0.14, rot: [-0.04, 1.2, 0.03] },
    { x: -3.8, z: -6.5, scale: 0.15, rot: [0.03, -0.6, 0] },
    { x: 0.8, z: -7.5, scale: 0.13, rot: [0.04, 2.1, -0.05] },
    { x: 5.5, z: -8.5, scale: 0.16, rot: [-0.04, -1.2, 0] },
    { x: 12.5, z: -6.8, scale: 0.14, rot: [0.05, 0.9, 0] },
    // Left wing
    { x: -16.5, z: 2.8, scale: 0.16, rot: [0.06, 0.5, -0.04] },
    { x: -12.0, z: -1.2, scale: 0.14, rot: [-0.05, -0.8, 0.05] },
    { x: -9.8, z: 4.5, scale: 0.15, rot: [0.04, 1.4, 0] },
    { x: -6.5, z: 1.0, scale: 0.13, rot: [-0.03, 0.7, 0.04] },
    // Right wing
    { x: 7.2, z: -1.5, scale: 0.14, rot: [0.05, -0.9, 0] },
    { x: 9.8, z: 3.2, scale: 0.15, rot: [-0.04, 1.1, 0.03] },
    { x: 12.8, z: -0.5, scale: 0.13, rot: [0.03, -1.4, 0] },
    { x: 15.5, z: 3.5, scale: 0.16, rot: [-0.05, 0.6, -0.03] },
    // Center / midground & foreground — sparser with clean breathing space below photos
    { x: -4.6, z: 2.6, scale: 0.13, rot: [0.08, 0.65, -0.05] },
    { x: 4.5, z: 2.2, scale: 0.12, rot: [-0.06, -0.85, 0.05] },
    { x: -5.0, z: 5.5, scale: 0.12, rot: [0.03, 1.0, 0] },
    { x: 5.2, z: 5.2, scale: 0.13, rot: [-0.05, -1.3, 0.03] },
  ];

  gltfLoader.load(
    publicAssetUrl('models/fan_coral_med.glb'),
    (gltf) => {
      gltf.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = !isSoftwareGl;
          child.receiveShadow = !isSoftwareGl;
        }
      });

      fanConfigs.forEach((cfg, idx) => {
        const fan = idx === 0 ? gltf.scene : gltf.scene.clone();
        loadedGroups.push(fan);
        fan.scale.setScalar(cfg.scale);
        const y = getSeabedElevation(cfg.x, cfg.z) + 0.08;
        fan.position.set(cfg.x, y, cfg.z);
        fan.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]);
        waterGroup.add(fan);
      });
    },
    undefined,
    (err) => console.warn('Fan coral GLB load error:', err),
  );

  // 4.3 Model 3: coral_piece.glb (High-detail branching & brain coral formations)
  // Distributed evenly as reef spines and rocky coral outcroppings
  const pieceConfigs = [
    // Deep background
    { x: -12.5, z: -8.2, scale: 0.44, rotY: 0.4 },
    { x: -7.2, z: -6.5, scale: 0.38, rotY: -1.1 },
    { x: -2.0, z: -5.0, scale: 0.42, rotY: 1.8 },
    { x: 3.6, z: -5.8, scale: 0.40, rotY: -0.5 },
    { x: 8.5, z: -7.2, scale: 0.46, rotY: 0.9 },
    { x: 13.8, z: -7.8, scale: 0.42, rotY: -1.6 },
    // Left wing
    { x: -15.5, z: 1.5, scale: 0.45, rotY: 0.8 },
    { x: -11.5, z: 3.2, scale: 0.38, rotY: -0.6 },
    { x: -8.2, z: -0.8, scale: 0.42, rotY: 1.3 },
    { x: -5.5, z: 3.8, scale: 0.40, rotY: -1.4 },
    // Right wing
    { x: 6.5, z: 1.8, scale: 0.42, rotY: -0.7 },
    { x: 8.5, z: -2.2, scale: 0.45, rotY: 1.2 },
    { x: 11.8, z: 1.8, scale: 0.38, rotY: -1.5 },
    { x: 14.5, z: 0.2, scale: 0.44, rotY: 0.5 },
    // Center / midground & foreground — sparser accents flanking the photo arc
    { x: -3.8, z: 2.4, scale: 0.36, rotY: 0.8 },
    { x: 3.6, z: 2.2, scale: 0.34, rotY: -1.4 },
  ];

  gltfLoader.load(
    publicAssetUrl('models/coral_piece.glb'),
    (gltf) => {
      gltf.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = !isSoftwareGl;
          child.receiveShadow = !isSoftwareGl;
        }
      });

      pieceConfigs.forEach((cfg, idx) => {
        const piece = idx === 0 ? gltf.scene : gltf.scene.clone();
        loadedGroups.push(piece);
        piece.scale.setScalar(cfg.scale);
        const y = getSeabedElevation(cfg.x, cfg.z) + 0.08;
        piece.position.set(cfg.x, y, cfg.z);
        piece.rotation.set(0, cfg.rotY, 0);
        waterGroup.add(piece);
      });
    },
    undefined,
    (err) => console.warn('Coral piece GLB load error:', err),
  );

  // 4.4 Model 4: lowpoly_coral_pack.glb (Diverse shell & tube coral clusters across sandy dunes)
  // Distributed evenly along seabed slopes and foreground view
  const packConfigs = [
    // Deep background
    { x: -10.5, z: -9.0, scale: 1.15, rotY: 0.6 },
    { x: -4.8, z: -7.8, scale: 1.25, rotY: -1.2 },
    { x: 2.2, z: -8.2, scale: 1.10, rotY: 1.9 },
    { x: 9.2, z: -8.5, scale: 1.20, rotY: -0.4 },
    // Left wing
    { x: -14.2, z: 2.2, scale: 1.20, rotY: 0.9 },
    { x: -10.5, z: 0.5, scale: 1.15, rotY: -0.7 },
    { x: -8.0, z: 4.2, scale: 1.30, rotY: 1.4 },
    { x: -5.8, z: 6.2, scale: 1.10, rotY: -1.1 },
    // Right wing
    { x: 7.5, z: 3.2, scale: 1.25, rotY: -0.8 },
    { x: 10.8, z: 0.4, scale: 1.10, rotY: 1.6 },
    { x: 13.5, z: 2.5, scale: 1.20, rotY: -1.3 },
    { x: 8.2, z: 6.2, scale: 1.15, rotY: 0.5 },
    // Center / midground & foreground — sparser accents leaving clean seabed below photos
    { x: -3.8, z: 4.4, scale: 1.0, rotY: -0.7 },
    { x: 3.8, z: 4.2, scale: 1.05, rotY: 1.8 },
  ];

  gltfLoader.load(
    publicAssetUrl('models/lowpoly_coral_pack.glb'),
    (gltf) => {
      gltf.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = !isSoftwareGl;
          child.receiveShadow = !isSoftwareGl;
        }
      });

      packConfigs.forEach((cfg, idx) => {
        const pack = idx === 0 ? gltf.scene : gltf.scene.clone();
        loadedGroups.push(pack);
        pack.scale.setScalar(cfg.scale);
        const y = getSeabedElevation(cfg.x, cfg.z) + 0.08;
        pack.position.set(cfg.x, y, cfg.z);
        pack.rotation.set(0, cfg.rotY, 0);
        waterGroup.add(pack);
      });
    },
    undefined,
    (err) => console.warn('Lowpoly coral pack GLB load error:', err),
  );

  // 5. School of Tropical Reef Fish: Authentic animated-swimming-tropical-fish-school-loop
  const fishDiffuseMaps = [
    textureLoader.load(publicAssetUrl('models/animated-swimming-tropical-fish-school-loop/textures/gltf_embedded_0.png')),
    textureLoader.load(publicAssetUrl('models/animated-swimming-tropical-fish-school-loop/textures/gltf_embedded_5.png')),
    textureLoader.load(publicAssetUrl('models/animated-swimming-tropical-fish-school-loop/textures/gltf_embedded_9.png')),
    textureLoader.load(publicAssetUrl('models/animated-swimming-tropical-fish-school-loop/textures/gltf_embedded_13.png')),
  ];
  fishDiffuseMaps.forEach((tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = false;
    textures.push(tex);
  });

  const fishSpecies = [
    { color: '#ff8442', emissive: '#ea580c', roughness: 0.35, metalness: 0.12 }, // Clownfish / Coral orange
    { color: '#facc15', emissive: '#ca8a04', roughness: 0.32, metalness: 0.15 }, // Yellow Tang canary gold
    { color: '#38bdf8', emissive: '#0284c7', roughness: 0.36, metalness: 0.10 }, // Regal Blue Tang
    { color: '#f472b6', emissive: '#db2777', roughness: 0.38, metalness: 0.14 }, // Magenta Coral Fairy
  ];

  gltfLoader.load(
    publicAssetUrl('models/animated-swimming-tropical-fish-school-loop/source/School of fish.glb'),
    (gltf) => {
      const fishScene = gltf.scene;
      loadedGroups.push(fishScene);
      // Scaled down to authentic tropical reef fish size (~25-45cm)
      fishScene.scale.setScalar(0.045);
      fishScene.position.set(0, -9.6, 2.4);

      let mIdx = 0;
      fishScene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.castShadow = !isSoftwareGl;
          m.receiveShadow = !isSoftwareGl;
          const idx = mIdx % 4;
          mIdx += 1;
          const fishMat = new THREE.MeshStandardMaterial({
            map: fishDiffuseMaps[idx],
            color: new THREE.Color('#ffffff'), // Preserve authentic vibrant multi-color texture
            roughness: 0.32,
            metalness: 0.1,
            envMapIntensity: 0.9,
            emissiveMap: fishDiffuseMaps[idx],
            emissive: new THREE.Color('#ffffff'),
            emissiveIntensity: 0.12, // Subtle underwater luminescence to pop in deep water
            side: THREE.DoubleSide,
          });
          materials.push(fishMat);
          m.material = fishMat;
        }
      });
      waterGroup.add(fishScene);

      if (gltf.animations && gltf.animations.length > 0) {
        const fishMixer = new THREE.AnimationMixer(fishScene);
        const action = fishMixer.clipAction(gltf.animations[0]);
        action.play();
        mixers.push(fishMixer);
      }

      // Secondary complementary swimming school on a contrasting reef patrol path
      const fishScene2 = SkeletonUtils.clone(gltf.scene);
      loadedGroups.push(fishScene2);
      fishScene2.scale.setScalar(0.035);
      fishScene2.position.set(-1.8, -10.0, 1.2);
      fishScene2.rotation.y = Math.PI * 0.85;

      let mIdx2 = 0;
      fishScene2.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.castShadow = !isSoftwareGl;
          m.receiveShadow = !isSoftwareGl;
          const idx = mIdx2 % 4;
          mIdx2 += 1;
          const fishMat = new THREE.MeshStandardMaterial({
            map: fishDiffuseMaps[idx],
            color: new THREE.Color('#ffffff'),
            roughness: 0.32,
            metalness: 0.1,
            envMapIntensity: 0.9,
            emissiveMap: fishDiffuseMaps[idx],
            emissive: new THREE.Color('#ffffff'),
            emissiveIntensity: 0.12,
            side: THREE.DoubleSide,
          });
          materials.push(fishMat);
          m.material = fishMat;
        }
      });
      waterGroup.add(fishScene2);

      if (gltf.animations && gltf.animations.length > 0) {
        const fishMixer2 = new THREE.AnimationMixer(fishScene2);
        const action2 = fishMixer2.clipAction(gltf.animations[0]);
        action2.timeScale = 1.12;
        action2.play();
        fishMixer2.setTime(14.0);
        mixers.push(fishMixer2);
      }

      // Tertiary school cruising through the deep background reef horizon
      const fishScene3 = SkeletonUtils.clone(gltf.scene);
      loadedGroups.push(fishScene3);
      fishScene3.scale.setScalar(0.038);
      fishScene3.position.set(2.5, -9.2, -4.5);
      fishScene3.rotation.y = -Math.PI * 0.45;

      let mIdx3 = 0;
      fishScene3.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.castShadow = !isSoftwareGl;
          m.receiveShadow = !isSoftwareGl;
          const idx = mIdx3 % 4;
          mIdx3 += 1;
          const fishMat = new THREE.MeshStandardMaterial({
            map: fishDiffuseMaps[idx],
            color: new THREE.Color('#ffffff'),
            roughness: 0.32,
            metalness: 0.1,
            envMapIntensity: 0.9,
            emissiveMap: fishDiffuseMaps[idx],
            emissive: new THREE.Color('#ffffff'),
            emissiveIntensity: 0.12,
            side: THREE.DoubleSide,
          });
          materials.push(fishMat);
          m.material = fishMat;
        }
      });
      waterGroup.add(fishScene3);

      if (gltf.animations && gltf.animations.length > 0) {
        const fishMixer3 = new THREE.AnimationMixer(fishScene3);
        const action3 = fishMixer3.clipAction(gltf.animations[0]);
        action3.timeScale = 1.05;
        action3.play();
        fishMixer3.setTime(7.0);
        mixers.push(fishMixer3);
      }
    },
    undefined,
    (err) => console.warn('School of fish GLB load:', err),
  );

  // 7. 44 Rising Translucent Underwater Bubbles (InstancedMesh)
  const bubbleCount = 44;
  const bubbleGeo = new THREE.SphereGeometry(0.055, 10, 10);
  geometries.push(bubbleGeo);
  const bubbleMat = new THREE.MeshPhysicalMaterial({
    color: '#c9edf5',
    roughness: 0.1,
    metalness: 0.05,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  materials.push(bubbleMat);
  const bubbleMesh = new THREE.InstancedMesh(bubbleGeo, bubbleMat, bubbleCount);
  bubbleMesh.frustumCulled = false;
  const bubbles = Array.from({ length: bubbleCount }, (_, i) => ({
    x: (Math.sin(i * 19.3) * 0.5) * 11.0,
    y: -12.2 + (i / bubbleCount) * 9.2,
    z: 2.0 + (Math.cos(i * 29.7) * 0.5) * 10.0,
    speed: 0.35 + (i % 5) * 0.12,
    scale: 0.45 + (i % 4) * 0.28,
    phase: i * 0.7,
  }));
  waterGroup.add(bubbleMesh);

  // =========================================================================
  // REALM 3: CAT ISLAND — PBR Island Terrain, 5 GLB Cats, Palms, Lanterns (Bloom)
  // =========================================================================
  const islandGroup = new THREE.Group();
  islandGroup.position.set(15.5, -2.4, -7.5);
  root.add(islandGroup);

  // Procedural PBR Maps for Sand, Rock, and Metal
  const sandMaps = createSandPbrMaps(maxAnisotropy);
  textures.push(sandMaps.normalMap, sandMaps.roughnessMap);

  const rockMaps = createRockPbrMaps(maxAnisotropy);
  textures.push(rockMaps.normalMap, rockMaps.roughnessMap);

  const archMaps = createArchMetalMaps(maxAnisotropy);
  textures.push(archMaps.normalMap, archMaps.roughnessMap);

  // Sculpted island terrain with vertex colors + Sand Normal & Roughness Maps
  const islandRadius = 6.2;
  const islandGeo = new THREE.PlaneGeometry(islandRadius * 2, islandRadius * 2, 56, 56);
  islandGeo.rotateX(-Math.PI / 2);
  const iPos = islandGeo.attributes.position;
  const iColors = new Float32Array(iPos.count * 3);

  const wetSandCol = new THREE.Color('#6b524a');
  const warmSandCol = new THREE.Color('#c99d7c');
  const grassCol = new THREE.Color('#476443');
  const sunGrassCol = new THREE.Color('#6b7b4c');

  for (let i = 0; i < iPos.count; i += 1) {
    const lx = iPos.getX(i);
    const lz = iPos.getZ(i);
    const elev = getCatIslandElevation(lx, lz);
    iPos.setY(i, elev);

    if (elev < 0.12) {
      _color.copy(wetSandCol).lerp(warmSandCol, THREE.MathUtils.clamp((elev + 0.35) / 0.47, 0, 1));
    } else if (elev < 0.78) {
      _color.copy(warmSandCol).lerp(grassCol, THREE.MathUtils.clamp((elev - 0.12) / 0.66, 0, 1));
    } else {
      _color.copy(grassCol).lerp(sunGrassCol, THREE.MathUtils.clamp((elev - 0.78) / 1.3, 0, 1));
    }
    iColors[i * 3] = _color.r;
    iColors[i * 3 + 1] = _color.g;
    iColors[i * 3 + 2] = _color.b;
  }
  islandGeo.setAttribute('color', new THREE.BufferAttribute(iColors, 3));
  islandGeo.computeVertexNormals();
  geometries.push(islandGeo);

  const islandMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    normalMap: sandMaps.normalMap,
    roughnessMap: sandMaps.roughnessMap,
    roughness: 0.90,
    metalness: 0.02,
  });
  materials.push(islandMat);

  const islandMesh = new THREE.Mesh(islandGeo, islandMat);
  islandMesh.receiveShadow = true;
  islandMesh.castShadow = true;
  islandGroup.add(islandMesh);

  // Coastal Granite Boulders with Rock Normal & Roughness Maps
  const islandRockMat = new THREE.MeshStandardMaterial({
    color: '#524956',
    normalMap: rockMaps.normalMap,
    roughnessMap: rockMaps.roughnessMap,
    roughness: 0.88,
    metalness: 0.04,
  });
  materials.push(islandRockMat);

  const rockGeo = new THREE.DodecahedronGeometry(1.0, 1);
  geometries.push(rockGeo);

  const islandRocks = [
    { x: -3.2, z: 2.1, sx: 0.85, sy: 0.45, sz: 0.7 },
    { x: 3.4, z: 1.6, sx: 0.95, sy: 0.55, sz: 0.75 },
    { x: 2.6, z: -2.9, sx: 0.8, sy: 0.42, sz: 0.68 },
    { x: -2.9, z: -2.6, sx: 1.05, sy: 0.58, sz: 0.85 },
  ];
  const rockGeos: THREE.BufferGeometry[] = [];
  islandRocks.forEach((rk) => {
    const geo = rockGeo.clone();
    const y = getCatIslandElevation(rk.x, rk.z);
    geo.scale(rk.sx, rk.sy, rk.sz);
    geo.translate(rk.x, y + rk.sy * 0.2, rk.z);
    rockGeos.push(geo);
  });
  const mergedRockGeo = BufferGeometryUtils.mergeGeometries(rockGeos);
  rockGeos.forEach((g) => g.dispose());
  geometries.push(mergedRockGeo);

  const rockMesh = new THREE.Mesh(mergedRockGeo, islandRockMat);
  rockMesh.castShadow = true;
  rockMesh.receiveShadow = true;
  islandGroup.add(rockMesh);

  // Swaying Coconut Palms collection for gentle tropical ocean breeze animation
  const swayingPalms: Array<{
    group: THREE.Group;
    phase: number;
    baseRotZ: number;
    baseRotX: number;
  }> = [];

  // 1. Coconut Palm Trees (coconut_palm.glb) loaded onto Cat Island
  gltfLoader.load(
    publicAssetUrl('models/coconut_palm.glb'),
    (gltf) => {
      const palmTemplate = gltf.scene;
      loadedGroups.push(palmTemplate);
      palmTemplate.traverse((child: any) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Two graceful flanking palms framing the island view without obstructing photos or sky calligraphy
      const palmConfigs = [
        { x: -3.85, z: 1.15, scale: 0.75, rotY: 1.60, phase: 0.0 }, // Outer far-left flanking pier approach
        { x: 3.65, z: 1.25, scale: 0.72, rotY: -1.45, phase: 1.8 }, // Outer far-right flanking rocky shoreline
      ];

      palmConfigs.forEach((cfg, idx) => {
        const palm = idx === 0 ? palmTemplate : palmTemplate.clone();
        if (idx > 0) loadedGroups.push(palm);
        palm.scale.setScalar(cfg.scale);
        const elev = getCatIslandElevation(cfg.x, cfg.z);
        palm.position.set(cfg.x, elev - 0.06, cfg.z);
        palm.rotation.y = cfg.rotY;
        islandGroup.add(palm);

        swayingPalms.push({
          group: palm,
          phase: cfg.phase,
          baseRotZ: 0,
          baseRotX: 0,
        });
      });
    },
    undefined,
    (err) => console.warn('Coconut palm GLB load:', err),
  );

  // 2. Natural Coastal Grass and Reeds (grass.glb) loaded onto Cat Island
  gltfLoader.load(
    publicAssetUrl('models/grass.glb'),
    (gltf) => {
      const grassTemplate = gltf.scene;
      loadedGroups.push(grassTemplate);
      grassTemplate.traverse((child: any) => {
        if (child.isMesh) {
          if (child.name.toLowerCase().includes('base')) {
            child.visible = false;
          } else {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.roughness = 0.88;
            }
          }
        }
      });

      const grassSpawns = [
        { x: -0.85, z: 2.05, s: 0.24, rot: 0.3 },
        { x: 1.35, z: 1.85, s: 0.26, rot: 1.2 },
        { x: -1.95, z: 1.25, s: 0.22, rot: 2.4 },
        { x: -2.55, z: 0.45, s: 0.25, rot: 0.8 },
        { x: -3.15, z: 2.15, s: 0.23, rot: 1.9 },
        { x: 0.65, z: 0.85, s: 0.25, rot: 2.8 },
        { x: 2.25, z: 0.65, s: 0.27, rot: 0.5 },
        { x: 2.85, z: 1.85, s: 0.23, rot: 1.6 },
        { x: -1.35, z: -0.65, s: 0.26, rot: 3.0 },
        { x: 1.85, z: -0.75, s: 0.24, rot: 0.9 },
        { x: -0.45, z: -1.25, s: 0.28, rot: 2.1 },
        { x: 0.85, z: -1.85, s: 0.25, rot: 1.4 },
        { x: -2.15, z: -1.85, s: 0.22, rot: 0.2 },
        { x: 3.15, z: 0.25, s: 0.24, rot: 2.7 },
        { x: -3.65, z: -0.45, s: 0.22, rot: 1.1 },
      ];

      grassSpawns.forEach((spawn, idx) => {
        const clump = idx === 0 ? grassTemplate : grassTemplate.clone();
        if (idx > 0) loadedGroups.push(clump);
        clump.scale.setScalar(spawn.s);
        const elev = getCatIslandElevation(spawn.x, spawn.z);
        clump.position.set(spawn.x, elev - 0.04, spawn.z);
        clump.rotation.y = spawn.rot;
        islandGroup.add(clump);
      });
    },
    undefined,
    (err) => console.warn('Grass GLB load:', err),
  );

  // Wooden Viewing Pier
  const woodMat = new THREE.MeshStandardMaterial({
    color: '#6b4a3a',
    roughness: 0.88,
    metalness: 0.02,
  });
  materials.push(woodMat);

  const pierGroup = new THREE.Group();
  pierGroup.position.set(-2.85, 0.42, 3.1);
  pierGroup.rotation.y = 0.58;
  islandGroup.add(pierGroup);

  const plankGeo = new THREE.BoxGeometry(1.45, 0.07, 0.24);
  const postGeo = new THREE.CylinderGeometry(0.065, 0.075, 1.35, 10);
  geometries.push(plankGeo, postGeo);

  const pierGeos: THREE.BufferGeometry[] = [];
  for (let p = 0; p < 9; p += 1) {
    const geo = plankGeo.clone();
    geo.translate(0, 0, -1.0 + p * 0.27);
    pierGeos.push(geo);
  }
  for (const px of [-0.6, 0.6]) {
    for (const pz of [-0.7, 0.3, 1.1]) {
      const geo = postGeo.clone();
      geo.translate(px, -0.55, pz);
      pierGeos.push(geo);
    }
  }
  const mergedPierGeo = BufferGeometryUtils.mergeGeometries(pierGeos);
  pierGeos.forEach((g) => g.dispose());
  geometries.push(mergedPierGeo);

  const pierMesh = new THREE.Mesh(mergedPierGeo, woodMat);
  pierMesh.castShadow = true;
  pierMesh.receiveShadow = true;
  pierGroup.add(pierMesh);

  // Wooden Lantern Posts with PointLight (decay: 2) & High Emissive Glass (Activating Bloom > 1.1)
  const lanternPostGeo = new THREE.CylinderGeometry(0.04, 0.055, 1.55, 10);
  const lanternCapGeo = new THREE.ConeGeometry(0.24, 0.16, 6);
  const lanternGlassGeo = new THREE.CylinderGeometry(0.14, 0.12, 0.28, 6);
  geometries.push(lanternPostGeo, lanternCapGeo, lanternGlassGeo);

  const lanternGlassMat = new THREE.MeshStandardMaterial({
    color: '#ffe8c2',
    emissive: '#ff9c38',
    emissiveIntensity: 1.85, // Luminance > 1.1 cleanly triggers UnrealBloomPass (0.45)
    roughness: 0.32,
  });
  materials.push(lanternGlassMat);

  const lanternPostGeos: THREE.BufferGeometry[] = [];
  const lanternGlassGeos: THREE.BufferGeometry[] = [];
  const lanternCoords = [
    [-3.65, 0.45], // Flanking the outer left entrance walkway
    [3.35, 1.25],  // Flanking the outer right grassy promenade
  ];
  lanternCoords.forEach(([lx, lz]) => {
    const y = getCatIslandElevation(lx, lz);

    const pole = lanternPostGeo.clone();
    pole.translate(lx, y - 0.05 + 0.77, lz);
    lanternPostGeos.push(pole);

    const cap = lanternCapGeo.clone();
    cap.translate(lx, y - 0.05 + 1.82, lz);
    lanternPostGeos.push(cap);

    const glass = lanternGlassGeo.clone();
    glass.translate(lx, y - 0.05 + 1.62, lz);
    lanternGlassGeos.push(glass);

    if (!isSoftwareGl) {
      const lanternLight = new THREE.PointLight('#ffbe78', 2.8, 8.5, 2.0);
      lanternLight.position.set(lx, y - 0.05 + 1.65, lz);
      islandGroup.add(lanternLight);
    }
  });

  // =========================================================================
  const mergedPoleGeo = BufferGeometryUtils.mergeGeometries(lanternPostGeos);
  const mergedGlassGeo = BufferGeometryUtils.mergeGeometries(lanternGlassGeos);
  lanternPostGeos.forEach((g) => g.dispose());
  lanternGlassGeos.forEach((g) => g.dispose());
  geometries.push(mergedPoleGeo, mergedGlassGeo);

  const polesMesh = new THREE.Mesh(mergedPoleGeo, woodMat);
  polesMesh.castShadow = true;
  islandGroup.add(polesMesh);

  const glassesMesh = new THREE.Mesh(mergedGlassGeo, lanternGlassMat);
  islandGroup.add(glassesMesh);

  // Cat-Eared Archway Monument with Brushed Rose-Gold Normal & Roughness Maps
  const archGroup = new THREE.Group();
  const archY = getCatIslandElevation(0, -1.65);
  archGroup.position.set(0, archY - 0.08, -1.65);
  islandGroup.add(archGroup);

  const archMetalMat = new THREE.MeshPhysicalMaterial({
    color: '#e5b39b',
    normalMap: archMaps.normalMap,
    roughnessMap: archMaps.roughnessMap,
    metalness: 0.92,
    roughness: 0.28,
  });
  materials.push(archMetalMat);

  const archRingGeo = new THREE.TorusGeometry(1.25, 0.045, 12, 56, Math.PI);
  const archEarGeo = new THREE.TorusGeometry(0.28, 0.036, 10, 24, Math.PI * 1.15);
  const archPillarGeo = new THREE.CylinderGeometry(0.045, 0.055, 0.72, 10);
  geometries.push(archRingGeo, archEarGeo, archPillarGeo);

  const archMain = new THREE.Mesh(archRingGeo, archMetalMat);
  archMain.position.y = 0.65;
  archGroup.add(archMain);

  const leftArchEar = new THREE.Mesh(archEarGeo, archMetalMat);
  leftArchEar.position.set(-0.78, 1.72, 0);
  leftArchEar.rotation.z = 0.42;
  archGroup.add(leftArchEar);

  const rightArchEar = new THREE.Mesh(archEarGeo, archMetalMat);
  rightArchEar.position.set(0.78, 1.72, 0);
  rightArchEar.rotation.z = -0.42;
  archGroup.add(rightArchEar);

  for (const sx of [-1.25, 1.25]) {
    const pillar = new THREE.Mesh(archPillarGeo, archMetalMat);
    pillar.position.set(sx, 0.34, 0);
    archGroup.add(pillar);
  }

  // 8 Beloved Cats of Cat Island (Featuring all available GLB models: British Blue, Realistic Cat, and Blissa Cat)
  // Arranged to encircle the ground photo gallery on the grassy knoll
  const animatedCats: Array<{
    group: THREE.Group;
    phase: number;
    baseHeadY: number;
    baseScale: number;
  }> = [];

  // 1. Load sitting_blue_cat.glb onto Cat Island (Front-left lawn & Back-left hill)
  gltfLoader.load(
    publicAssetUrl('models/sitting-catbritish-shorthair-blue-cat/source/sitting_blue_cat.glb'),
    (gltf) => {
      const blueCat = gltf.scene;
      loadedGroups.push(blueCat);
      blueCat.scale.setScalar(0.82);
      // Cat 1: Front-left of the photo gallery lounging on the grass
      const b1X = -1.85;
      const b1Z = 0.55;
      const b1Y = getCatIslandElevation(b1X, b1Z);
      blueCat.position.set(b1X, b1Y, b1Z);
      blueCat.rotation.y = 0.75;
      islandGroup.add(blueCat);

      animatedCats.push({
        group: blueCat,
        phase: 1.1,
        baseHeadY: blueCat.rotation.y,
        baseScale: 0.82,
      });

      // Cat 2: Behind the photos (peeking between photos on the left hill slope)
      const blueCat2 = blueCat.clone();
      loadedGroups.push(blueCat2);
      blueCat2.scale.setScalar(0.78);
      const b2X = -2.15;
      const b2Z = -1.45;
      const b2Y = getCatIslandElevation(b2X, b2Z);
      blueCat2.position.set(b2X, b2Y, b2Z);
      blueCat2.rotation.y = -0.45;
      islandGroup.add(blueCat2);

      animatedCats.push({
        group: blueCat2,
        phase: 2.8,
        baseHeadY: blueCat2.rotation.y,
        baseScale: 0.78,
      });
    },
    undefined,
    (err) => console.warn('British blue cat GLB load:', err),
  );

  // 2. Load cat.glb onto Cat Island (Front-center lawn, Far-left flank, Far-right flank)
  gltfLoader.load(
    publicAssetUrl('models/cat.glb'),
    (gltf) => {
      const modelCat = gltf.scene;
      loadedGroups.push(modelCat);
      modelCat.scale.setScalar(0.22);
      // Cat 1: Front-center on the grass, sitting directly in front of the middle photo
      const m1X = -0.45;
      const m1Z = 1.65;
      const m1Y = getCatIslandElevation(m1X, m1Z);
      modelCat.position.set(m1X, m1Y, m1Z);
      modelCat.rotation.y = 0.35;
      islandGroup.add(modelCat);

      animatedCats.push({
        group: modelCat,
        phase: 0.2,
        baseHeadY: modelCat.rotation.y,
        baseScale: 0.22,
      });

      // Cat 2: Left wing flanking photo 0
      const modelCat2 = modelCat.clone();
      loadedGroups.push(modelCat2);
      modelCat2.scale.setScalar(0.20);
      const m2X = -3.45;
      const m2Z = -1.35;
      const m2Y = getCatIslandElevation(m2X, m2Z);
      modelCat2.position.set(m2X, m2Y, m2Z);
      modelCat2.rotation.y = 1.2;
      islandGroup.add(modelCat2);

      animatedCats.push({
        group: modelCat2,
        phase: 1.9,
        baseHeadY: modelCat2.rotation.y,
        baseScale: 0.20,
      });

      // Cat 3: Right wing flanking photo 4
      const modelCat3 = modelCat.clone();
      loadedGroups.push(modelCat3);
      modelCat3.scale.setScalar(0.21);
      const m3X = 3.15;
      const m3Z = 2.25;
      const m3Y = getCatIslandElevation(m3X, m3Z);
      modelCat3.position.set(m3X, m3Y, m3Z);
      modelCat3.rotation.y = -1.3;
      islandGroup.add(modelCat3);

      animatedCats.push({
        group: modelCat3,
        phase: 3.4,
        baseHeadY: modelCat3.rotation.y,
        baseScale: 0.21,
      });
    },
    undefined,
    (err) => console.warn('Model cat GLB load:', err),
  );

  // 3. Load blissa_cat.glb onto Cat Island (Front-right lawn, Back crest center, Back right slope)
  gltfLoader.load(
    publicAssetUrl('models/blissa_cat.glb'),
    (gltf) => {
      const blissa = gltf.scene;
      loadedGroups.push(blissa);
      blissa.scale.setScalar(105.0);
      // Cat 1: Front-right in front of photo 3
      const bl1X = 0.95;
      const bl1Z = 2.15;
      const bl1Y = getCatIslandElevation(bl1X, bl1Z);
      blissa.position.set(bl1X, bl1Y, bl1Z);
      blissa.rotation.y = 0.1;
      islandGroup.add(blissa);

      animatedCats.push({
        group: blissa,
        phase: 0.7,
        baseHeadY: blissa.rotation.y,
        baseScale: 105.0,
      });

      // Cat 2: Hill crest behind the center photo looking proudly over the gallery
      const blissa2 = blissa.clone();
      loadedGroups.push(blissa2);
      blissa2.scale.setScalar(110.0);
      const bl2X = -0.15;
      const bl2Z = -0.55;
      const bl2Y = getCatIslandElevation(bl2X, bl2Z);
      blissa2.position.set(bl2X, bl2Y, bl2Z);
      blissa2.rotation.y = -0.15;
      islandGroup.add(blissa2);

      animatedCats.push({
        group: blissa2,
        phase: 2.1,
        baseHeadY: blissa2.rotation.y,
        baseScale: 110.0,
      });

      // Cat 3: Back-right slope behind photo 3 and 4
      const blissa3 = blissa.clone();
      loadedGroups.push(blissa3);
      blissa3.scale.setScalar(100.0);
      const bl3X = 1.65;
      const bl3Z = 0.45;
      const bl3Y = getCatIslandElevation(bl3X, bl3Z);
      blissa3.position.set(bl3X, bl3Y, bl3Z);
      blissa3.rotation.y = -0.85;
      islandGroup.add(blissa3);

      animatedCats.push({
        group: blissa3,
        phase: 3.8,
        baseHeadY: blissa3.rotation.y,
        baseScale: 100.0,
      });
    },
    undefined,
    (err) => console.warn('Blissa cat GLB load:', err),
  );

  // Invisible Layer 1 hit proxy for Cat Island
  const islandHitGeo = new THREE.SphereGeometry(5.5, 14, 14);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  geometries.push(islandHitGeo);
  materials.push(hitMat);
  const islandHitProxy = new THREE.Mesh(islandHitGeo, hitMat);
  islandHitProxy.position.set(15.5, -0.8, -7.5);
  islandHitProxy.layers.set(1);
  islandHitProxy.userData = { interactType: 'realm', realm: 'cat-island' as ShowcaseRealm };
  root.add(islandHitProxy);
  hitProxies.push(islandHitProxy);

  return {
    root,
    hitProxies,
    update: (
      elapsed: number,
      delta: number,
      currentRealm?: ShowcaseRealm,
      cameraY?: number,
      camFlightActive?: boolean,
      getFrameWorldPos?: (index: number, out: THREE.Vector3) => boolean,
      skyFlightTime?: number,
    ) => {
      // Frustum/Realm Visibility Culling to guarantee Draw Calls < 100 per scene
      if (currentRealm) {
        const isSubmerged = (cameraY !== undefined && cameraY < -2.2) || currentRealm === 'underwater';
        const isSky = (cameraY !== undefined && cameraY > 5.5) || currentRealm === 'sky';
        const isIsland = currentRealm === 'cat-island';

        waterGroup.visible = isSubmerged;
        skyGroup.visible = isSky;
        islandGroup.visible = isIsland && !isSubmerged;
      }

      // 1. Shaders update
      cloudShaderMat.uniforms.uTime.value = elapsed;
      tetherShaderMat.uniforms.uTime.value = elapsed;
      meteorShowerMat.uniforms.uTime.value = elapsed;
      blueCometMat.uniforms.uTime.value = elapsed;
      snellMat.uniforms.uTime.value = elapsed;
      seabedMat.uniforms.uTime.value = elapsed;
      rayMat.uniforms.uTime.value = elapsed;
      kelpShaderMat.uniforms.uTime.value = elapsed;

      // 1.1 Drift and shimmer celestial blue comets (Zero GC)
      for (let i = 0; i < blueComets.length; i += 1) {
        const c = blueComets[i];
        const drift = Math.sin(elapsed * c.speed + c.phase);
        c.mesh.position.x = c.baseX + drift * c.driftX;
        c.mesh.position.y = c.baseY + drift * c.driftY;
      }

      // 2. Drift volumetric sunset cloud puffs
      for (let i = 0; i < cloudCount; i += 1) {
        const cp = cloudPuffs[i];
        const driftX = cp.baseX + Math.sin(elapsed * cp.speed + cp.phase) * 0.65;
        _dummy.position.set(driftX, cp.baseY, cp.baseZ);
        _dummy.rotation.set(cp.rotX, cp.rotY, cp.rotZ);
        _dummy.scale.set(cp.scaleX, cp.scaleY, 1.0);
        _dummy.updateMatrix();
        cloudMesh.setMatrixAt(i, _dummy.matrix);
      }
      cloudMesh.instanceMatrix.needsUpdate = true;

      // 3. Animate 5 Phoenix Birds carrying 5 photo frames via sparkling tethers (Zero GC)
      const isSky = currentRealm === 'sky';
      for (let i = 0; i < phoenixCarriers.length; i += 1) {
        const carrier = phoenixCarriers[i];
        carrier.wrapper.visible = isSky;
        carrier.tetherMesh.visible = isSky;
        carrier.topClasp.visible = isSky;
        carrier.botClasp.visible = isSky;
        for (let g = 0; g < carrier.sparkleGems.length; g += 1) {
          carrier.sparkleGems[g].visible = isSky;
        }

        if (!isSky) continue;

        const flightTime = skyFlightTime !== undefined ? skyFlightTime : elapsed;
        sampleSkyConvoy(i, flightTime, 5, _skyConvoySample);

        carrier.wrapper.position.copy(_skyConvoySample.phoenixPos);
        carrier.wrapper.quaternion.copy(_skyConvoySample.phoenixQuat);

        // Top anchor: Phoenix underside/talons
        _pTop.set(
          _skyConvoySample.phoenixPos.x,
          _skyConvoySample.phoenixPos.y - 0.26,
          _skyConvoySample.phoenixPos.z - 0.04,
        );

        // Bottom anchor: Top hanger eyelet ring of photo frame
        let frameLocalX = _skyConvoySample.framePos.x;
        let frameLocalY = _skyConvoySample.framePos.y;
        let frameLocalZ = _skyConvoySample.framePos.z;

        if (getFrameWorldPos && getFrameWorldPos(i, _tempWorldPos)) {
          _tempLocalPos.copy(_tempWorldPos);
          skyGroup.worldToLocal(_tempLocalPos);
          // Only adopt world position if in close proximity of phoenix (tracks hover/active lift without stretching)
          if (Math.hypot(_tempLocalPos.x - _pTop.x, _tempLocalPos.z - _pTop.z) < 2.5) {
            frameLocalX = _tempLocalPos.x;
            frameLocalY = _tempLocalPos.y;
            frameLocalZ = _tempLocalPos.z;
          }
        }

        _pBot.set(frameLocalX, frameLocalY + 0.76, frameLocalZ);

        // Midpoint with subtle dynamic catenary & trailing wave
        _pMid.copy(_pTop).add(_pBot).multiplyScalar(0.5);
        _pMid.x += Math.sin(flightTime * 2.1 + i * 1.4) * 0.02;
        _pMid.y -= 0.035;
        _pMid.z += Math.cos(flightTime * 1.9 + i * 1.4) * 0.02;

        // Update clasp rings
        carrier.topClasp.position.copy(_pTop);
        carrier.topClasp.quaternion.copy(_skyConvoySample.phoenixQuat);

        carrier.botClasp.position.copy(_pBot);
        carrier.botClasp.quaternion.copy(_skyConvoySample.frameQuat);

        // Update dynamic tether tube geometry (Zero GC)
        updateTetherGeometry(carrier.tetherGeo, _pBot, _pMid, _pTop, 0.016);

        // Update 3 diamond crystal beads along the tether
        for (let g = 0; g < 3; g += 1) {
          const u = (g + 1) * 0.25;
          const u1 = 1 - u;
          const bx = u1 * u1 * _pBot.x + 2 * u1 * u * _pMid.x + u * u * _pTop.x;
          const by = u1 * u1 * _pBot.y + 2 * u1 * u * _pMid.y + u * u * _pTop.y;
          const bz = u1 * u1 * _pBot.z + 2 * u1 * u * _pMid.z + u * u * _pTop.z;
          carrier.sparkleGems[g].position.set(bx, by, bz);
          carrier.sparkleGems[g].rotation.set(elapsed * 2.5 + g, elapsed * 1.8 + i, elapsed * 3.1);
        }
      }

      // 5. Rise underwater bubbles smoothly toward ocean surface (-2.5)
      for (let i = 0; i < bubbleCount; i += 1) {
        const b = bubbles[i];
        b.y += b.speed * delta;
        if (b.y > -2.55) b.y = -12.2;
        _dummy.position.set(
          b.x + Math.sin(elapsed * 1.5 + b.phase) * 0.14,
          b.y,
          b.z + Math.cos(elapsed * 1.2 + b.phase) * 0.14,
        );
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.setScalar(b.scale);
        _dummy.updateMatrix();
        bubbleMesh.setMatrixAt(i, _dummy.matrix);
      }
      bubbleMesh.instanceMatrix.needsUpdate = true;

      // 6. Sway Cat Island coconut palms in the ocean breeze (Zero GC)
      for (let i = 0; i < swayingPalms.length; i += 1) {
        const p = swayingPalms[i];
        p.group.rotation.z = p.baseRotZ + Math.sin(elapsed * 1.1 + p.phase) * 0.022;
        p.group.rotation.x = p.baseRotX + Math.cos(elapsed * 0.85 + p.phase) * 0.018;
      }

      // 7. Animate Cat Island cats (breathing relaxation scale, gentle head/body turns)
      for (let i = 0; i < animatedCats.length; i += 1) {
        const c = animatedCats[i];
        // Subtle breathing expansion
        const breathe = 1.0 + Math.sin(elapsed * 2.2 + c.phase) * 0.016;
        c.group.scale.set(c.baseScale, c.baseScale * breathe, c.baseScale);
        c.group.rotation.y = c.baseHeadY + Math.sin(elapsed * 0.45 + c.phase) * 0.04;
      }

      // 8. Update any skeletal animation mixers
      for (let i = 0; i < mixers.length; i += 1) {
        mixers[i].update(delta);
      }
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());

      loadedGroups.forEach((grp) => {
        grp.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.geometry?.dispose();
            if (Array.isArray(m.material)) {
              m.material.forEach((mat) => mat.dispose());
            } else {
              m.material?.dispose();
            }
          }
        });
      });

      mixers.forEach((mx) => mx.stopAllAction());
    },
  };
}
