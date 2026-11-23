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
  grad.addColorStop(0.25, 'rgba(165, 225, 255, 0.85)');
  grad.addColorStop(0.65, 'rgba(215, 165, 255, 0.32)');
  grad.addColorStop(1, 'rgba(200, 150, 255, 0.0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();

  // Primary horizontal & vertical flares
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(x - size * 1.9, y);
  ctx.lineTo(x + size * 1.9, y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x, y - size * 1.9);
  ctx.lineTo(x, y + size * 1.9);
  ctx.stroke();

  // Subtle diagonal micro-rays
  ctx.strokeStyle = 'rgba(215, 240, 255, 0.55)';
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
  grad.addColorStop(0.25, `rgba(135, 215, 255, ${alpha * 0.75})`);
  grad.addColorStop(0.7, `rgba(195, 145, 255, ${alpha * 0.35})`);
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
 * Traces a sculpted, romantic bezier heart path centered at (cx, cy).
 */
function traceHeartPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
) {
  const topCleftY = cy - h * 0.20;
  const bottomTipY = cy + h * 0.48;
  const leftApexX = cx - w * 0.48;
  const rightApexX = cx + w * 0.48;
  const topLobeY = cy - h * 0.52;

  ctx.beginPath();
  ctx.moveTo(cx, topCleftY);
  // Left lobe
  ctx.bezierCurveTo(
    cx - w * 0.22,
    topLobeY,
    leftApexX,
    topLobeY + h * 0.14,
    leftApexX,
    cy - h * 0.04,
  );
  ctx.bezierCurveTo(
    leftApexX,
    cy + h * 0.24,
    cx - w * 0.2,
    bottomTipY - h * 0.14,
    cx,
    bottomTipY,
  );
  // Right lobe
  ctx.bezierCurveTo(
    cx + w * 0.2,
    bottomTipY - h * 0.14,
    rightApexX,
    cy + h * 0.24,
    rightApexX,
    cy - h * 0.04,
  );
  ctx.bezierCurveTo(
    rightApexX,
    topLobeY + h * 0.14,
    cx + w * 0.22,
    topLobeY,
    cx,
    topCleftY,
  );
  ctx.closePath();
}

/**
 * Generates high-resolution celestial 2K texture for "MĐ ♡ BA"
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
  const cy = 320;
  const textBaselineY = 372;
  const fontStyle = "italic 700 178px 'Cormorant Garamond', 'Cinzel', 'Playfair Display', serif";

  ctx.font = fontStyle;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const leftTextX = 540;
  const rightTextX = 1500;
  const heartW = 190;
  const heartH = 180;
  const heartCy = 308;

  // Helper to execute drawing commands across both letters and heart for each glow pass
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

    // 1. Text "MĐ"
    ctx.strokeText('MĐ', leftTextX, textBaselineY);

    // 2. Heart vector outline
    traceHeartPath(ctx, cx, heartCy, heartW, heartH);
    ctx.stroke();

    // 3. Text "BA"
    ctx.strokeText('BA', rightTextX, textBaselineY);
  };

  // Pass 1: Broad Lavender/Indigo Cosmic Aurora Bloom
  executePathPass(38, 'rgba(170, 130, 255, 0.70)', 'rgba(150, 110, 245, 0.42)', 22);

  // Pass 2: Celestial Cyan-Blue Meteor Streak Flare
  executePathPass(22, 'rgba(120, 215, 255, 0.85)', 'rgba(100, 205, 255, 0.72)', 12);

  // Pass 3: Romantic Rose-Gold/Pearl Shimmer
  executePathPass(10, 'rgba(255, 195, 220, 0.95)', 'rgba(255, 220, 235, 0.90)', 6.0);

  // Pass 4: Incandescent Pure Diamond White Core Filament
  executePathPass(4, 'rgba(255, 255, 255, 1.0)', '#ffffff', 2.6);

  // Subtle interior celestial shimmer inside the heart
  ctx.shadowBlur = 18;
  ctx.shadowColor = 'rgba(255, 180, 210, 0.45)';
  ctx.fillStyle = 'rgba(255, 200, 225, 0.12)';
  traceHeartPath(ctx, cx, heartCy, heartW, heartH);
  ctx.fill();

  // Reset shadow for details
  ctx.shadowBlur = 0;

  // 5. Shooting Star Meteor Tails streaming diagonally from key strokes
  const meteorTails: Array<[number, number, number, number, number]> = [
    // [x, y, length, width, alpha]
    [410, 215, 85, 3.2, 0.85],   // Apex of M
    [495, 260, 68, 2.6, 0.75],   // Middle fold of M
    [600, 215, 95, 3.4, 0.90],   // Right peak of M
    [695, 255, 78, 2.8, 0.80],   // Crossbar of Đ
    [760, 310, 62, 2.4, 0.70],   // Curve of Đ
    [965, 220, 92, 3.5, 0.90],   // Left lobe of Heart
    [1082, 220, 96, 3.5, 0.90],  // Right lobe of Heart
    [1024, 385, 75, 2.8, 0.82],  // Bottom tip of Heart
    [1395, 215, 82, 3.0, 0.82],  // Top of B
    [1485, 290, 65, 2.5, 0.72],  // Center waist of B
    [1575, 215, 98, 3.6, 0.92],  // Apex of A
    [1545, 305, 72, 2.8, 0.78],  // Crossbar of A
    [1635, 370, 88, 3.2, 0.86],  // Right leg of A
  ];

  meteorTails.forEach(([x, y, len, w, a]) => {
    drawMeteorTail(ctx, x, y, len, w, a);
  });

  // 6. Radiant 4-Point Diamond Starburst Flares
  const starFlares: Array<[number, number, number]> = [
    [410, 215, 14],   // Apex of M
    [600, 215, 16],   // Right peak of M
    [710, 255, 13],   // Crossbar of Đ
    [965, 220, 18],   // Left crest of Heart
    [1082, 220, 18],  // Right crest of Heart
    [1024, 395, 16],  // Tip of Heart
    [1395, 215, 14],  // Top of B
    [1575, 215, 18],  // Apex of A
    [1635, 370, 15],  // Terminal of A
  ];

  starFlares.forEach(([x, y, sz]) => {
    drawStarFlare(ctx, x, y, sz);
  });

  // 7. Scattering of Cosmic Stardust Motes around the constellation
  const pseudoRandom = (seed: number) => {
    const x = Math.sin(seed * 9999) * 10000;
    return x - Math.floor(x);
  };

  for (let i = 0; i < 48; i += 1) {
    const rX = 260 + pseudoRandom(i * 3.14 + 1.2) * 1520;
    const rY = 170 + pseudoRandom(i * 2.71 + 4.5) * 310;
    const rSize = 1.0 + pseudoRandom(i * 1.61) * 2.2;
    const rAlpha = 0.35 + pseudoRandom(i * 5.43) * 0.55;

    ctx.fillStyle = i % 2 === 0
      ? `rgba(255, 255, 255, ${rAlpha})`
      : `rgba(165, 225, 255, ${rAlpha * 0.9})`;
    ctx.beginPath();
    ctx.arc(rX, rY, rSize, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

/**
 * Generates high-resolution celestial 3K texture for the romantic quote:
 * "My night has become a sunny dawn because of you."
 * Rendered in 2 balanced lines with font size 178px matching the front text "MĐ ♡ BA".
 */
function createQuoteMeteorTextCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 3072;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cx = 1536;
  const line1 = 'My night has become a sunny dawn';
  const line2 = 'because of you.';
  const line1Y = 430;
  const line2Y = 680;
  const fontStyle = "italic 700 178px 'Cormorant Garamond', 'Revival 555', 'Playfair Display', Georgia, serif";

  ctx.font = fontStyle;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Helper to execute drawing commands across both lines for each luminous glow pass
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
  executePathPass(40, 'rgba(170, 130, 255, 0.72)', 'rgba(150, 110, 245, 0.44)', 24);

  // Pass 2: Celestial Cyan-Blue Meteor Streak Flare
  executePathPass(24, 'rgba(120, 215, 255, 0.85)', 'rgba(100, 205, 255, 0.72)', 13);

  // Pass 3: Romantic Rose-Gold/Pearl Shimmer
  executePathPass(11, 'rgba(255, 195, 220, 0.95)', 'rgba(255, 220, 235, 0.90)', 6.5);

  // Pass 4: Incandescent Pure Diamond White Core Filament
  executePathPass(4, 'rgba(255, 255, 255, 1.0)', '#ffffff', 2.8);

  // Soft luminous fill for crisp legibility
  ctx.shadowBlur = 18;
  ctx.shadowColor = 'rgba(255, 200, 225, 0.52)';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.fillText(line1, cx, line1Y);
  ctx.fillText(line2, cx, line2Y);

  // Reset shadow for detail strokes
  ctx.shadowBlur = 0;

  // Measure text to place meteor tails and diamond flares precisely
  const m1 = ctx.measureText(line1);
  const m2 = ctx.measureText(line2);
  const w1 = m1.width;
  const w2 = m2.width;
  const startX1 = cx - w1 / 2;
  const startX2 = cx - w2 / 2;

  const charPos1 = (idx: number) => {
    return startX1 + ctx.measureText(line1.substring(0, idx)).width;
  };

  const charPos2 = (idx: number) => {
    return startX2 + ctx.measureText(line2.substring(0, idx)).width;
  };

  // Meteor Tails streaming diagonally from key letters
  const tailSpecs: Array<[number, number, number, number, number]> = [
    // Line 1: "My night has become a sunny dawn"
    [charPos1(0) + 24,  line1Y - 110, 85, 3.2, 0.88],  // Apex of 'M' in My
    [charPos1(4) + 18,  line1Y - 105, 75, 2.8, 0.82],  // Top of 'h' in night
    [charPos1(7) + 16,  line1Y - 88,  65, 2.5, 0.76],  // Cross of 't' in night
    [charPos1(13) + 18, line1Y - 108, 78, 2.9, 0.84],  // Top of 'b' in become
    [charPos1(22) + 16, line1Y - 95,  70, 2.6, 0.80],  // Crest of 's' in sunny
    [charPos1(28) + 20, line1Y - 112, 88, 3.4, 0.90],  // Top of 'd' in dawn
    // Line 2: "because of you."
    [charPos2(0) + 18,  line2Y - 108, 78, 2.9, 0.84],  // Top of 'b' in because
    [charPos2(8) + 16,  line2Y - 105, 72, 2.7, 0.80],  // Top of 'f' in of
    [charPos2(11) + 18, line2Y - 92,  68, 2.6, 0.78],  // Top of 'y' in you
    [charPos2(14) + 24, line2Y - 20,  70, 2.8, 0.86],  // Period '.' flare tail
  ];

  tailSpecs.forEach(([x, y, len, w, a]) => {
    drawMeteorTail(ctx, x, y, len, w, a);
  });

  // Radiant 4-Point Diamond Starburst Flares
  const starSpecs: Array<[number, number, number]> = [
    [charPos1(0) + 24,  line1Y - 115, 18], // Apex of 'M' in My
    [charPos1(5) + 10,  line1Y - 122, 14], // Dot of 'i' in night
    [charPos1(13) + 18, line1Y - 110, 15], // Top of 'b' in become
    [charPos1(28) + 20, line1Y - 115, 19], // Top of 'd' in dawn
    [charPos2(0) + 18,  line2Y - 110, 16], // Top of 'b' in because
    [charPos2(11) + 18, line2Y - 95,  15], // Top of 'y' in you
    [charPos2(14) + 20, line2Y - 18,  16], // Period '.'
  ];

  starSpecs.forEach(([x, y, sz]) => {
    drawStarFlare(ctx, x, y, sz);
  });

  // Cosmic Stardust Motes scattered around both lines
  const pseudoRandom = (seed: number) => {
    const x = Math.sin(seed * 9999) * 10000;
    return x - Math.floor(x);
  };

  for (let i = 0; i < 72; i += 1) {
    const isLine1 = i % 2 === 0;
    const baseW = isLine1 ? w1 : w2;
    const startX = isLine1 ? startX1 : startX2;
    const baseY = isLine1 ? line1Y : line2Y;

    const rX = startX - 80 + pseudoRandom(i * 3.14 + 1.2) * (baseW + 160);
    const rY = baseY - 140 + pseudoRandom(i * 2.71 + 4.5) * 180;
    const rSize = 1.0 + pseudoRandom(i * 1.61) * 2.2;
    const rAlpha = 0.35 + pseudoRandom(i * 5.43) * 0.55;

    ctx.fillStyle = i % 3 === 0
      ? `rgba(255, 255, 255, ${rAlpha})`
      : `rgba(165, 225, 255, ${rAlpha * 0.9})`;
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

  // 1. Heart Realm Celestial Sky Billboard ("MĐ ♡ BA")
  // Positioned high in the northern twilight sky facing south towards the center
  const heartMesh = new THREE.Mesh(quadGeo, textMat.clone());
  heartMesh.position.set(0.0, 5.6, -14.5);
  heartMesh.scale.set(13.8, 4.3, 1.0);
  heartMesh.rotation.set(-0.16, 0.0, 0.0);
  heartMesh.renderOrder = -2;
  root.add(heartMesh);

  // 2. Heart Realm Opposite Quote Celestial Sky Billboard
  // "My night has become a sunny dawn because of you."
  // Positioned symmetrically opposite in the southern twilight sky facing north towards the center
  const quoteMesh = new THREE.Mesh(quadGeo, textMat.clone());
  (quoteMesh.material as THREE.ShaderMaterial).uniforms.uMap.value = quoteTexture;
  quoteMesh.position.set(0.0, 5.8, 14.5);
  quoteMesh.scale.set(20.4, 6.8, 1.0);
  quoteMesh.rotation.set(0.16, Math.PI, 0.0);
  quoteMesh.renderOrder = -2;
  root.add(quoteMesh);

  // 3. Cat Island Realm Celestial Sky Billboard
  // Positioned in the twilight sky above Cat Island along camera sightline
  const catMat = textMat.clone();
  (catMat as THREE.ShaderMaterial).side = THREE.DoubleSide; // Cat island billboard viewable from flight angles
  const catMesh = new THREE.Mesh(quadGeo, catMat);
  catMesh.position.set(21.2, 4.4, -16.5);
  catMesh.scale.set(13.2, 4.1, 1.0);
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
