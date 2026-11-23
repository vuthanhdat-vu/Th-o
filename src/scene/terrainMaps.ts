import * as THREE from 'three';

/**
 * Procedural tangent-space normal map and micro-grain roughness map for coastal sand.
 */
export function createSandPbrMaps(maxAnisotropy: number): {
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const size = 512;
  const nCanvas = document.createElement('canvas');
  nCanvas.width = size;
  nCanvas.height = size;
  const nCtx = nCanvas.getContext('2d');

  const rCanvas = document.createElement('canvas');
  rCanvas.width = size;
  rCanvas.height = size;
  const rCtx = rCanvas.getContext('2d');

  if (nCtx && rCtx) {
    const nImg = nCtx.createImageData(size, size);
    const rImg = rCtx.createImageData(size, size);

    // Height field for sand ripple waves + micro grains
    const heights = new Float32Array(size * size);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const u = x / size;
        const v = y / size;
        // Fine gentle ripples across sand
        const ripple1 = Math.sin(u * 28.0 + Math.cos(v * 14.0) * 1.8) * 0.35;
        const ripple2 = Math.sin((u + v) * 42.0) * 0.2;
        // Micro grain noise
        const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const grain = (n - Math.floor(n)) * 0.45;
        heights[y * size + x] = ripple1 + ripple2 + grain;
      }
    }

    // Sobel / central difference gradient for tangent-space normal
    for (let y = 0; y < size; y += 1) {
      const ym = (y - 1 + size) % size;
      const yp = (y + 1) % size;
      for (let x = 0; x < size; x += 1) {
        const xm = (x - 1 + size) % size;
        const xp = (x + 1) % size;

        const idx = y * size + x;
        const dx = (heights[y * size + xp] - heights[y * size + xm]) * 1.8;
        const dy = (heights[yp * size + x] - heights[ym * size + x]) * 1.8;
        const len = Math.hypot(dx, dy, 1.0);

        const nx = -dx / len;
        const ny = -dy / len;
        const nz = 1.0 / len;

        const pIdx = idx * 4;
        nImg.data[pIdx] = Math.floor((nx * 0.5 + 0.5) * 255);
        nImg.data[pIdx + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
        nImg.data[pIdx + 2] = Math.floor((nz * 0.5 + 0.5) * 255);
        nImg.data[pIdx + 3] = 255;

        // Sand roughness between 0.84 and 0.96
        const rVal = Math.floor(215 + (heights[idx] * 0.15) * 40);
        rImg.data[pIdx] = rVal;
        rImg.data[pIdx + 1] = rVal;
        rImg.data[pIdx + 2] = rVal;
        rImg.data[pIdx + 3] = 255;
      }
    }

    nCtx.putImageData(nImg, 0, 0);
    rCtx.putImageData(rImg, 0, 0);
  }

  const normalMap = new THREE.CanvasTexture(nCanvas);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(6, 6);
  normalMap.anisotropy = maxAnisotropy;

  const roughnessMap = new THREE.CanvasTexture(rCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(6, 6);
  roughnessMap.anisotropy = maxAnisotropy;

  return { normalMap, roughnessMap };
}

/**
 * Procedural tangent-space normal map and roughness map for coastal granite boulders.
 */
export function createRockPbrMaps(maxAnisotropy: number): {
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const size = 512;
  const nCanvas = document.createElement('canvas');
  nCanvas.width = size;
  nCanvas.height = size;
  const nCtx = nCanvas.getContext('2d');

  const rCanvas = document.createElement('canvas');
  rCanvas.width = size;
  rCanvas.height = size;
  const rCtx = rCanvas.getContext('2d');

  if (nCtx && rCtx) {
    const nImg = nCtx.createImageData(size, size);
    const rImg = rCtx.createImageData(size, size);

    const heights = new Float32Array(size * size);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const u = x / size;
        const v = y / size;
        // Chiseled angular facets
        const f1 = Math.abs(Math.sin(u * 12.0 + Math.sin(v * 8.0) * 1.5)) * 0.45;
        const f2 = Math.abs(Math.cos(v * 16.0 + u * 6.0)) * 0.35;
        const n = Math.sin(x * 37.1 + y * 91.7) * 43758.5453;
        const crack = (n - Math.floor(n)) * 0.2;
        heights[y * size + x] = f1 + f2 + crack;
      }
    }

    for (let y = 0; y < size; y += 1) {
      const ym = (y - 1 + size) % size;
      const yp = (y + 1) % size;
      for (let x = 0; x < size; x += 1) {
        const xm = (x - 1 + size) % size;
        const xp = (x + 1) % size;

        const idx = y * size + x;
        const dx = (heights[y * size + xp] - heights[y * size + xm]) * 2.4;
        const dy = (heights[yp * size + x] - heights[ym * size + x]) * 2.4;
        const len = Math.hypot(dx, dy, 1.0);

        const nx = -dx / len;
        const ny = -dy / len;
        const nz = 1.0 / len;

        const pIdx = idx * 4;
        nImg.data[pIdx] = Math.floor((nx * 0.5 + 0.5) * 255);
        nImg.data[pIdx + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
        nImg.data[pIdx + 2] = Math.floor((nz * 0.5 + 0.5) * 255);
        nImg.data[pIdx + 3] = 255;

        // Rock roughness 0.78 - 0.92
        const rVal = Math.floor(198 + heights[idx] * 36);
        rImg.data[pIdx] = rVal;
        rImg.data[pIdx + 1] = rVal;
        rImg.data[pIdx + 2] = rVal;
        rImg.data[pIdx + 3] = 255;
      }
    }

    nCtx.putImageData(nImg, 0, 0);
    rCtx.putImageData(rImg, 0, 0);
  }

  const normalMap = new THREE.CanvasTexture(nCanvas);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(3, 3);
  normalMap.anisotropy = maxAnisotropy;

  const roughnessMap = new THREE.CanvasTexture(rCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(3, 3);
  roughnessMap.anisotropy = maxAnisotropy;

  return { normalMap, roughnessMap };
}

/**
 * Procedural brushed rose-gold metal maps for Cat Island cat-ear monument arch.
 */
export function createArchMetalMaps(maxAnisotropy: number): {
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const size = 512;
  const nCanvas = document.createElement('canvas');
  nCanvas.width = size;
  nCanvas.height = size;
  const nCtx = nCanvas.getContext('2d');

  const rCanvas = document.createElement('canvas');
  rCanvas.width = size;
  rCanvas.height = size;
  const rCtx = rCanvas.getContext('2d');

  if (nCtx && rCtx) {
    nCtx.fillStyle = '#8080ff'; // Flat tangent normal
    nCtx.fillRect(0, 0, size, size);

    rCtx.fillStyle = '#444444'; // Base smooth metallic roughness ~0.27
    rCtx.fillRect(0, 0, size, size);

    // Fine circumferential brushed metal grain
    for (let y = 0; y < size; y += 1) {
      const n = Math.sin(y * 42.123) * 43758.5453;
      const frac = n - Math.floor(n);
      const rShade = Math.floor(52 + frac * 28);
      rCtx.fillStyle = `rgb(${rShade},${rShade},${rShade})`;
      rCtx.fillRect(0, y, size, 1);

      // Micro scratch normal displacement
      const dy = (frac - 0.5) * 0.18;
      const ny = Math.floor((dy * 0.5 + 0.5) * 255);
      nCtx.fillStyle = `rgb(128,${ny},255)`;
      nCtx.fillRect(0, y, size, 1);
    }
  }

  const normalMap = new THREE.CanvasTexture(nCanvas);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(2, 8);
  normalMap.anisotropy = maxAnisotropy;

  const roughnessMap = new THREE.CanvasTexture(rCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(2, 8);
  roughnessMap.anisotropy = maxAnisotropy;

  return { normalMap, roughnessMap };
}

/**
 * Soft radial cloud puff alpha mask with organic feathered edges for volumetric billboard clouds.
 */
export function createCloudBillboardTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const cx = size / 2;
    const cy = size / 2;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.48);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.88)');
    grad.addColorStop(0.72, 'rgba(255, 255, 255, 0.42)');
    grad.addColorStop(0.92, 'rgba(255, 255, 255, 0.08)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
