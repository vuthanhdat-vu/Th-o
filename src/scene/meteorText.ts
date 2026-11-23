import * as THREE from 'three';
import type { ShowcaseRealm } from '../types/showcase';

export interface MeteorTextRig {
  root: THREE.Group;
  update: (elapsed: number, delta: number, currentRealm: ShowcaseRealm) => void;
  dispose: () => void;
}

/**
 * Draws a 4-point radiant diamond star flare like a sparkling meteor flare.
 */
function drawStarFlare(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  // Radial diffuse core
  const grad = ctx.createRadialGradient(x, y, 0, x, y, size);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.25, 'rgba(255, 190, 220, 0.90)');
  grad.addColorStop(0.65, 'rgba(215, 165, 255, 0.35)');
  grad.addColorStop(1, 'rgba(200, 150, 255, 0.0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();

  // Primary horizontal & vertical flares
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(x - size * 2.0, y);
  ctx.lineTo(x + size * 2.0, y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x, y - size * 2.0);
  ctx.lineTo(x, y + size * 2.0);
  ctx.stroke();

  // Subtle diagonal micro-rays
  ctx.strokeStyle = 'rgba(255, 220, 240, 0.6)';
  ctx.lineWidth = 1.0;
  const diag = size * 0.95;
  ctx.beginPath();
  ctx.moveTo(x - diag, y - diag);
  ctx.lineTo(x + diag, y + diag);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x - diag, y + diag);
  ctx.lineTo(x + diag, y - diag);
  ctx.stroke();
}

/**
 * Draws a directional shooting-star light streak / tail trailing off a point.
 */
function drawMeteorTail(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  length: number,
  width: number,
  alpha: number,
) {
  const angle = -0.62; // ~ -35.5 degrees diagonal streak
  const endX = startX + Math.cos(angle) * length;
  const endY = startY + Math.sin(angle) * length;

  const grad = ctx.createLinearGradient(startX, startY, endX, endY);
  grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
  grad.addColorStop(0.25, `rgba(255, 185, 225, ${alpha * 0.85})`);
  grad.addColorStop(0.7, `rgba(195, 145, 255, ${alpha * 0.4})`);
  grad.addColorStop(1, 'rgba(175, 120, 245, 0.0)');

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.strokeStyle = grad;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.stroke();
}

/**
 * Generates high-resolution celestial 2K texture for "Happy Birthday Thạch Thảo"
 * rendered with shooting-star luminous filaments and cosmic stardust.
 */
function createMeteorTextCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cx = 1024;
  const line1 = 'HAPPY BIRTHDAY';
  const line2 = 'THẠCH THẢO';
  const line1Y = 250;
  const line2Y = 460;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const executePathPass = (
    blur: number,
    shadowColor: string,
    strokeColor: string,
    lineWidth: number,
  ) => {
    ctx.shadowBlur = blur;
    ctx.shadowColor = shadowColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.font = "italic 600 115px 'Cormorant Garamond', 'Cinzel', serif";
    ctx.strokeText(line1, cx, line1Y);

    ctx.font = "italic 700 170px 'Cormorant Garamond', 'Cinzel', 'Playfair Display', serif";
    ctx.strokeText(line2, cx, line2Y);
  };

  // Pass 1: Broad Lavender/Indigo Cosmic Aurora Bloom
  executePathPass(40, 'rgba(215, 130, 255, 0.75)', 'rgba(180, 110, 245, 0.45)', 24);

  // Pass 2: Celestial Pink-Rose Meteor Streak Flare
  executePathPass(24, 'rgba(255, 140, 195, 0.88)', 'rgba(244, 114, 182, 0.75)', 13);

  // Pass 3: Romantic Rose-Gold/Pearl Shimmer
  executePathPass(11, 'rgba(255, 205, 225, 0.95)', 'rgba(255, 230, 240, 0.92)', 6.0);

  // Pass 4: Incandescent Pure Diamond White Core Filament
  executePathPass(4, 'rgba(255, 255, 255, 1.0)', '#ffffff', 2.8);

  // Soft luminous fill for crisp legibility
  ctx.shadowBlur = 18;
  ctx.shadowColor = 'rgba(255, 180, 210, 0.55)';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';

  ctx.font = "italic 600 115px 'Cormorant Garamond', 'Cinzel', serif";
  ctx.fillText(line1, cx, line1Y);

  ctx.font = "italic 700 170px 'Cormorant Garamond', 'Cinzel', 'Playfair Display', serif";
  ctx.fillText(line2, cx, line2Y);

  ctx.shadowBlur = 0;

  // Meteor Tails streaming diagonally from key strokes
  const meteorTails: Array<[number, number, number, number, number]> = [
    [460, line1Y - 70, 80, 3.0, 0.85],
    [780, line1Y - 75, 70, 2.6, 0.80],
    [1024, line1Y - 80, 85, 3.2, 0.90],
    [1280, line1Y - 75, 75, 2.8, 0.82],
    [1580, line1Y - 70, 85, 3.2, 0.88],
    [480, line2Y - 110, 95, 3.5, 0.92],
    [780, line2Y - 115, 88, 3.2, 0.88],
    [1024, line2Y - 120, 100, 3.6, 0.95],
    [1260, line2Y - 115, 90, 3.3, 0.88],
    [1560, line2Y - 110, 95, 3.5, 0.92],
  ];

  meteorTails.forEach(([x, y, len, w, a]) => {
    drawMeteorTail(ctx, x, y, len, w, a);
  });

  // Radiant 4-Point Diamond Starburst Flares
  const starFlares: Array<[number, number, number]> = [
    [460, line1Y - 75, 14],
    [1024, line1Y - 85, 18],
    [1580, line1Y - 75, 14],
    [480, line2Y - 115, 18],
    [1024, line2Y - 125, 22],
    [1560, line2Y - 115, 18],
  ];

  starFlares.forEach(([x, y, sz]) => {
    drawStarFlare(ctx, x, y, sz);
  });

  // Scattering of Cosmic Stardust Motes around the constellation
  const pseudoRandom = (seed: number) => {
    const x = Math.sin(seed * 9999) * 10000;
    return x - Math.floor(x);
  };

  for (let i = 0; i < 56; i += 1) {
    const rX = 240 + pseudoRandom(i * 3.14 + 1.2) * 1560;
    const rY = 120 + pseudoRandom(i * 2.71 + 4.5) * 420;
    const rSize = 1.0 + pseudoRandom(i * 1.61) * 2.4;
    const rAlpha = 0.35 + pseudoRandom(i * 5.43) * 0.55;

    ctx.fillStyle = i % 2 === 0
      ? `rgba(255, 255, 255, ${rAlpha})`
      : `rgba(255, 195, 225, ${rAlpha * 0.9})`;
    ctx.beginPath();
    ctx.arc(rX, rY, rSize, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

/**
 * Generates high-resolution celestial 3K texture for the birthday quote:
 * "Chúc chị Thạch Thảo tuổi mới luôn rực rỡ, tràn ngập niềm vui và hạnh phúc!"
 */
function createQuoteMeteorTextCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 3072;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cx = 1536;
  const line1 = 'Chúc chị Thạch Thảo tuổi mới luôn rực rỡ,';
  const line2 = 'tràn ngập niềm vui và hạnh phúc!';
  const line1Y = 430;
  const line2Y = 680;
  const fontStyle = "italic 700 155px 'Cormorant Garamond', 'Revival 555', Georgia, serif";

  ctx.font = fontStyle;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const executePathPass = (
    blur: number,
    shadowColor: string,
    strokeColor: string,
    lineWidth: number,
  ) => {
    ctx.shadowBlur = blur;
    ctx.shadowColor = shadowColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.strokeText(line1, cx, line1Y);
    ctx.strokeText(line2, cx, line2Y);
  };

  // Pass 1: Broad Lavender/Indigo Cosmic Aurora Bloom
  executePathPass(40, 'rgba(215, 130, 255, 0.75)', 'rgba(180, 110, 245, 0.45)', 24);

  // Pass 2: Celestial Pink-Rose Meteor Streak Flare
  executePathPass(24, 'rgba(255, 140, 195, 0.88)', 'rgba(244, 114, 182, 0.75)', 13);

  // Pass 3: Romantic Rose-Gold/Pearl Shimmer
  executePathPass(11, 'rgba(255, 205, 225, 0.95)', 'rgba(255, 230, 240, 0.92)', 6.5);

  // Pass 4: Incandescent Pure Diamond White Core Filament
  executePathPass(4, 'rgba(255, 255, 255, 1.0)', '#ffffff', 2.8);

  // Soft luminous fill for crisp legibility
  ctx.shadowBlur = 18;
  ctx.shadowColor = 'rgba(255, 190, 220, 0.55)';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
  ctx.fillText(line1, cx, line1Y);
  ctx.fillText(line2, cx, line2Y);

  ctx.shadowBlur = 0;

  // Meteor Tails streaming diagonally from key letters
  const tailSpecs: Array<[number, number, number, number, number]> = [
    [cx - 750, line1Y - 95, 85, 3.2, 0.88],
    [cx, line1Y - 105, 95, 3.5, 0.90],
    [cx + 750, line1Y - 95, 85, 3.2, 0.88],
    [cx - 500, line2Y - 95, 85, 3.2, 0.88],
    [cx + 500, line2Y - 95, 90, 3.4, 0.90],
  ];

  tailSpecs.forEach(([x, y, len, w, a]) => {
    drawMeteorTail(ctx, x, y, len, w, a);
  });

  // Radiant 4-Point Diamond Starburst Flares
  const starSpecs: Array<[number, number, number]> = [
    [cx - 750, line1Y - 105, 18],
    [cx, line1Y - 115, 22],
    [cx + 750, line1Y - 105, 18],
    [cx - 500, line2Y - 105, 18],
    [cx + 500, line2Y - 105, 18],
  ];

  starSpecs.forEach(([x, y, sz]) => {
    drawStarFlare(ctx, x, y, sz);
  });

  // Cosmic Stardust Motes
  const pseudoRandom = (seed: number) => {
    const x = Math.sin(seed * 9999) * 10000;
    return x - Math.floor(x);
  };

  for (let i = 0; i < 72; i += 1) {
    const rX = 300 + pseudoRandom(i * 3.14 + 1.2) * 2472;
    const rY = 280 + pseudoRandom(i * 2.71 + 4.5) * 500;
    const rSize = 1.0 + pseudoRandom(i * 1.61) * 2.4;
    const rAlpha = 0.35 + pseudoRandom(i * 5.43) * 0.55;

    ctx.fillStyle = i % 3 === 0
      ? `rgba(255, 255, 255, ${rAlpha})`
      : `rgba(255, 195, 225, ${rAlpha * 0.9})`;
    ctx.beginPath();
    ctx.arc(rX, rY, rSize, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

/**
 * Creates the celestial meteor-text rig with instances in Heart & Cat Island skies.
 */
export function createMeteorTextRig(): MeteorTextRig {
  const root = new THREE.Group();

  const canvas = createMeteorTextCanvas();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const quoteCanvas = createQuoteMeteorTextCanvas();
  const quoteTexture = new THREE.CanvasTexture(quoteCanvas);
  quoteTexture.colorSpace = THREE.SRGBColorSpace;
  quoteTexture.minFilter = THREE.LinearFilter;
  quoteTexture.magFilter = THREE.LinearFilter;

  const textMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uMap: { value: texture },
      uTime: { value: 0 },
      uOpacity: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uTime;
      uniform float uOpacity;
      varying vec2 vUv;

      void main() {
        vec4 tex = texture2D(uMap, vUv);
        if (tex.a < 0.008) discard;

        // Luminous shooting-star pulse sweeping through the calligraphy
        float sweep = 0.86 + 0.16 * sin(uTime * 2.2 - vUv.x * 6.8);

        // Starlight micro-twinkle
        float twinkle = 0.92 + 0.08 * sin(uTime * 4.6 + vUv.x * 24.0 + vUv.y * 14.0);

        // Brilliant celestial glow with rich saturation
        vec3 col = tex.rgb * sweep * twinkle * 1.95;

        gl_FragColor = vec4(col, tex.a * uOpacity);
      }
    `,
  });

  const quadGeo = new THREE.PlaneGeometry(1, 1);

  // 1. Heart Realm Celestial Sky Billboard ("Happy Birthday Thạch Thảo")
  const heartMesh = new THREE.Mesh(quadGeo, textMat.clone());
  heartMesh.position.set(0.0, 5.6, -14.5);
  heartMesh.scale.set(14.5, 4.5, 1.0);
  heartMesh.rotation.set(-0.16, 0.0, 0.0);
  heartMesh.renderOrder = -2;
  root.add(heartMesh);

  // 2. Heart Realm Opposite Quote Celestial Sky Billboard
  const quoteMesh = new THREE.Mesh(quadGeo, textMat.clone());
  (quoteMesh.material as THREE.ShaderMaterial).uniforms.uMap.value = quoteTexture;
  quoteMesh.position.set(0.0, 5.8, 14.5);
  quoteMesh.scale.set(20.4, 6.8, 1.0);
  quoteMesh.rotation.set(0.16, Math.PI, 0.0);
  quoteMesh.renderOrder = -2;
  root.add(quoteMesh);

  // 3. Cat Island Realm Celestial Sky Billboard
  const catMat = textMat.clone();
  (catMat as THREE.ShaderMaterial).side = THREE.DoubleSide;
  const catMesh = new THREE.Mesh(quadGeo, catMat);
  catMesh.position.set(21.2, 4.4, -16.5);
  catMesh.scale.set(13.5, 4.2, 1.0);
  catMesh.rotation.set(-0.14, -0.58, 0.0);
  catMesh.renderOrder = -2;
  root.add(catMesh);

  let heartOpacity = 0.0;
  let catOpacity = 0.0;

  return {
    root,
    update: (elapsed: number, delta: number, currentRealm: ShowcaseRealm) => {
      const targetHeart = currentRealm === 'heart' ? 1.0 : 0.0;
      const targetCat = currentRealm === 'cat-island' ? 1.0 : 0.0;

      heartOpacity = THREE.MathUtils.damp(heartOpacity, targetHeart, 4.0, delta);
      catOpacity = THREE.MathUtils.damp(catOpacity, targetCat, 4.0, delta);

      const hMat = heartMesh.material as THREE.ShaderMaterial;
      hMat.uniforms.uTime.value = elapsed;
      hMat.uniforms.uOpacity.value = heartOpacity;
      heartMesh.visible = heartOpacity > 0.005;

      const qMat = quoteMesh.material as THREE.ShaderMaterial;
      qMat.uniforms.uTime.value = elapsed;
      qMat.uniforms.uOpacity.value = heartOpacity;
      quoteMesh.visible = heartOpacity > 0.005;

      const cMat = catMesh.material as THREE.ShaderMaterial;
      cMat.uniforms.uTime.value = elapsed;
      cMat.uniforms.uOpacity.value = catOpacity;
      catMesh.visible = catOpacity > 0.005;
    },
    dispose: () => {
      texture.dispose();
      quoteTexture.dispose();
      quadGeo.dispose();
      (heartMesh.material as THREE.Material).dispose();
      (quoteMesh.material as THREE.Material).dispose();
      (catMesh.material as THREE.Material).dispose();
    },
  };
}
