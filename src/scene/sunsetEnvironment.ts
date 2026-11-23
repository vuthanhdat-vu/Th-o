import * as THREE from 'three';

export interface SunsetEnvironmentRig {
  root: THREE.Group;
  sunDirection: THREE.Vector3;
  update: (elapsed: number, submerged?: number) => void;
  dispose: () => void;
}

/**
 * Shared analytical GLSL noise & sunset sky evaluation functions.
 * Evaluated continuously per fragment (vector-analytic, resolution-independent at 2K/4K).
 */
const SUNSET_SKY_GLSL = /* glsl */ `
float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

const mat2 ROT_M = mat2(0.80, -0.60, 0.60, 0.80);

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.52;
  for (int i = 0; i < 6; i++) {
    v += a * valueNoise(p);
    p = ROT_M * p * 2.03 + vec2(17.1, 31.7);
    a *= 0.49;
  }
  return v;
}

float cloudDensity(vec2 uv, float t) {
  vec2 drift = vec2(t * 0.011, -t * 0.004);
  vec2 q = uv + drift;

  // Domain-warped sweeping stratocumulus + dappled mackerel altocumulus clusters
  float warpA = fbm(q * 0.55 + vec2(3.2, 1.7));
  float warpB = fbm(q * 0.85 - vec2(warpA * 1.15, warpA * 0.72));

  // Diagonal luminous rift cutting across the upper-mid sky like the reference photo
  float diagCoord = uv.x * 0.48 - uv.y * 0.88;
  float rift = exp(-pow((diagCoord + 0.55 + (warpA - 0.5) * 0.65) * 2.4, 2.0));

  // Fine dappled mackerel puffs (altocumulus cells)
  float cells = fbm(q * 2.15 + vec2(warpB * 1.35, -warpA * 0.95));
  float micro = valueNoise(q * 5.8 + vec2(warpB * 2.1, t * 0.02));

  float base = warpB * 0.58 + cells * 0.34 + micro * 0.14;
  float density = smoothstep(0.36, 0.76, base);

  // Carve open the sunlit diagonal sky break
  density *= (1.0 - rift * 0.78);
  return clamp(density, 0.0, 1.0);
}

vec3 evaluateSunsetSky(vec3 dir, vec3 sunDir, float t, bool includeIslands) {
  float h = clamp(dir.y, -0.2, 1.0);
  float sunDot = max(dot(dir, sunDir), 0.0);
  vec2 horizDir = dir.xz;
  float horizLen = length(horizDir);
  vec2 safeHorizDir = horizLen > 1e-4 ? horizDir / horizLen : vec2(0.0, -1.0);
  vec2 safeSunHoriz = normalize(sunDir.xz + vec2(1e-5, 0.0));
  float sunAzimuth = pow(max(dot(safeHorizDir, safeSunHoriz), 0.0), 2.2);

  // 1. Rich realistic twilight-to-sunset base atmosphere:
  // Deep blue-violet / purple-blue celestial atmosphere (indigo-cobalt zenith -> royal blue-violet -> romantic purple lavender -> dusk rose)
  vec3 zenithCobalt   = vec3(0.07, 0.10, 0.40);
  vec3 upperBlue      = vec3(0.16, 0.22, 0.64);
  vec3 midLavender    = vec3(0.42, 0.26, 0.70);
  vec3 lowerCoral     = vec3(0.60, 0.30, 0.50);
  vec3 horizonAmber   = vec3(0.70, 0.42, 0.30);
  vec3 horizonCream   = vec3(0.76, 0.54, 0.38);

  // Extend the deep purple-blue & lavender gradient deeper down into the view
  vec3 sky = mix(horizonAmber, lowerCoral, smoothstep(0.002, 0.045, h));
  sky = mix(sky, midLavender, smoothstep(0.02, 0.11, h));
  sky = mix(sky, upperBlue, smoothstep(0.08, 0.26, h));
  sky = mix(sky, zenithCobalt, smoothstep(0.22, 0.60, h));

  // Crisp realistic sunset sun disk & gentle atmospheric glow (subdued brightness):
  float sunAtmosphere = pow(sunDot, 10.0) * 0.06;
  float horizonBand = exp(-abs(h - 0.012) * 20.0);
  sky = mix(sky, horizonAmber, clamp(sunAtmosphere + sunAzimuth * horizonBand * 0.14, 0.0, 0.22));

  // Soft warm corona immediately around the sun (gentle, non-glaring)
  sky += vec3(0.30, 0.20, 0.12) * pow(sunDot, 84.0) * 0.06;

  // Romantic sunset sun disk resting at horizon level without burning out bloom
  float sunDisk = smoothstep(0.9986, 0.9998, sunDot);
  sky += vec3(0.38, 0.26, 0.18) * sunDisk * 0.12;

  // 2. Analytical multi-layered altocumulus clouds above the horizon
  if (h > 0.004) {
    // Perspective projection onto curved sky dome cloud ceiling
    vec2 cloudUv = dir.xz / (h + 0.19) * 1.15;
    float d = cloudDensity(cloudUv, t);

    // Directional sunset lighting through cloud thickness (self-shadowing along sun vector)
    vec2 sunStep = normalize(sunDir.xz + vec2(0.0001)) * 0.14;
    float dTowardSun = cloudDensity(cloudUv + sunStep, t);
    float silverLining = clamp((d - dTowardSun) * 2.4 + 0.42, 0.0, 1.0);

    // Moody twilight cloud palette with deep blue-violet shadows & soft pearl highlights
    vec3 cloudShadowBase    = vec3(0.25, 0.20, 0.42); // deep twilight purple-slate
    vec3 cloudShadowMid     = vec3(0.36, 0.26, 0.56); // rich lavender-violet
    vec3 cloudBodyWhite     = vec3(0.66, 0.60, 0.76); // soft pearl-violet cloud body
    vec3 cloudSunlitGold    = vec3(0.76, 0.56, 0.44); // gentle warm golden rim
    vec3 cloudPureWhiteRim  = vec3(0.78, 0.72, 0.84); // soft crest highlight

    // Height & sun proximity govern cloud lighting
    float lowWarmth = smoothstep(0.46, 0.04, h);
    float sunProximity = pow(sunDot, 2.2);

    vec3 shadowCol = mix(cloudShadowBase, cloudShadowMid, lowWarmth * 0.65 + sunProximity * 0.35);
    vec3 midLitCol = mix(cloudShadowMid, cloudBodyWhite, clamp(0.30 + lowWarmth * 0.35 + sunProximity * 0.45, 0.0, 1.0));
    vec3 rimLitCol = mix(cloudSunlitGold, cloudPureWhiteRim, clamp(0.35 + sunProximity * 0.60, 0.0, 1.0));

    float litFactor = clamp(silverLining * (0.50 + 0.65 * lowWarmth + 0.50 * sunProximity), 0.0, 1.0);
    vec3 cloudCol = mix(shadowCol, midLitCol, smoothstep(0.15, 0.60, litFactor));
    cloudCol = mix(cloudCol, rimLitCol, smoothstep(0.55, 0.95, litFactor));

    // Subtle sunlit bloom on thin cloud edges
    float edgeGlow = pow(clamp(1.0 - abs(d - 0.42) * 2.6, 0.0, 1.0), 2.0);
    cloudCol += vec3(0.78, 0.66, 0.54) * edgeGlow * (0.05 + 0.16 * sunProximity);

    // Smooth atmospheric haze fade toward the distant horizon so clouds never clip harshly
    float horizonFade = smoothstep(0.008, 0.10, h);
    sky = mix(sky, cloudCol, d * horizonFade * 0.75);

    // Horizontal warm sunset cloud streaks right above the ocean horizon
    float lowStreakNoise = fbm(vec2(dir.x * 6.0 + t * 0.008, h * 38.0));
    float lowStreakMask = smoothstep(0.42, 0.74, lowStreakNoise) * exp(-pow((h - 0.055) / 0.048, 2.0));
    vec3 lowStreakCol = mix(vec3(0.56, 0.34, 0.46), vec3(0.68, 0.42, 0.44), sunAzimuth);
    sky = mix(sky, lowStreakCol, lowStreakMask * 0.22);
  }

  // Soft global mood calibration: richer, deeper blue-violet twilight
  sky *= 0.82;

  // 3. Distant misty coastal islands resting softly along the ocean horizon
  if (includeIslands && h >= -0.003 && h < 0.065) {
    float az = atan(dir.x, -dir.z);
    // Two gentle volcanic island silhouettes on the right-center horizon (echoing the photo)
    float island1 = 0.024 * exp(-pow((az - 0.24) / 0.048, 2.0));
    float island2 = 0.011 * exp(-pow((az - 0.14) / 0.042, 2.0));
    float island3 = 0.018 * exp(-pow((az - 0.58) / 0.075, 2.0));
    float island4 = 0.012 * exp(-pow((az + 0.52) / 0.085, 2.0));
    float silhouetteH = max(max(island1, island2), max(island3, island4));
    if (silhouetteH > 0.001) {
      float ridgeDetail = (valueNoise(vec2(az * 42.0, 1.5)) - 0.5) * 0.0035;
      float mask = smoothstep(silhouetteH + ridgeDetail + 0.0025, silhouetteH + ridgeDetail - 0.001, h);
      vec3 islandMist = mix(vec3(0.32, 0.24, 0.38), vec3(0.55, 0.34, 0.42), sunAzimuth);
      sky = mix(sky, islandMist, mask * 0.72);
    }
  }

  return sky;
}
`;

export function createSunsetEnvironment(): SunsetEnvironmentRig {
  const root = new THREE.Group();
  // Sunset sits softly right at the ocean horizon line behind the centerpiece
  const sunDirection = new THREE.Vector3(0.16, 0.014, -0.987).normalize();

  // 1. Analytical 2K+ Resolution-Independent Sunset Sky Dome
  const skyGeo = new THREE.SphereGeometry(82, 64, 40);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uSunDir: { value: sunDirection.clone() },
      uSubmerged: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldDir;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(worldPos.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uSunDir;
      uniform float uSubmerged;
      varying vec3 vWorldDir;
      ${SUNSET_SKY_GLSL}

      void main() {
        vec3 dir = normalize(vWorldDir);
        vec3 col = evaluateSunsetSky(dir, uSunDir, uTime, true);

        // Below horizon smoothly reflects deep warm dusk sea color so no harsh seam ever shows
        if (dir.y < 0.0) {
          vec3 refDir = normalize(vec3(dir.x, abs(dir.y) * 0.45 + 0.02, dir.z));
          vec3 seaBase = evaluateSunsetSky(refDir, uSunDir, uTime, false) * vec3(0.62, 0.52, 0.58);
          col = mix(col, seaBase, smoothstep(0.0, -0.06, dir.y));
        }

        // When submerged underwater, seamlessly transform the sky dome into an infinite deep ocean horizon!
        // Synchronizes the background palette perfectly with the underwater ocean context
        vec3 oceanHorizon = mix(
          vec3(0.04, 0.14, 0.22), // deep abyssal navy
          vec3(0.12, 0.42, 0.56), // serene turquoise water column
          clamp(dir.y * 1.8 + 0.55, 0.0, 1.0)
        );
        col = mix(col, oceanHorizon, uSubmerged);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  skyDome.renderOrder = -10;
  root.add(skyDome);

  // 1.1 High-altitude Celestial Meteor Shower & Blue Comets in upper sky dome
  // Models: meteor-shower-background (14914.jpg) & falling-comets-asteroids-meteors-with-blue-flame-trail-cosmos (4407.jpg)
  const texLoader = new THREE.TextureLoader();
  const globalMeteorTex = texLoader.load('/models/meteor-shower-background/14914.jpg');
  globalMeteorTex.colorSpace = THREE.SRGBColorSpace;

  const globalCometTex = texLoader.load('/models/falling-comets-asteroids-meteors-with-blue-flame-trail-cosmos/4407.jpg');
  globalCometTex.colorSpace = THREE.SRGBColorSpace;

  const globalShowerMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uMap: { value: globalMeteorTex },
      uTime: { value: 0 },
      uSubmerged: { value: 0 },
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
      uniform float uSubmerged;
      varying vec2 vUv;

      void main() {
        if (vUv.y < 0.22) discard;
        vec4 tex = texture2D(uMap, vUv);
        vec3 glow = max(tex.rgb - vec3(0.045, 0.04, 0.075), vec3(0.0));
        float lum = dot(glow, vec3(0.299, 0.587, 0.114));
        if (lum < 0.015) discard;

        float edgeFade = smoothstep(0.0, 0.14, vUv.x) * smoothstep(1.0, 0.86, vUv.x) *
                         smoothstep(0.22, 0.32, vUv.y) * smoothstep(1.0, 0.86, vUv.y);

        float twinkle = 0.88 + 0.12 * sin(uTime * 2.0 + vUv.x * 20.0);
        vec3 col = glow * twinkle * 2.45 * (1.0 - uSubmerged);
        col.b *= 1.35;
        col.r *= 1.20;
        gl_FragColor = vec4(col, clamp(lum * edgeFade * 0.98 * (1.0 - uSubmerged), 0.0, 1.0));
      }
    `,
  });

  const globalCometMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uMap: { value: globalCometTex },
      uTime: { value: 0 },
      uSubmerged: { value: 0 },
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
      uniform float uSubmerged;
      varying vec2 vUv;

      void main() {
        vec4 tex = texture2D(uMap, vUv);
        vec3 glow = max(tex.rgb - vec3(0.035, 0.045, 0.08), vec3(0.0));
        float lum = dot(glow, vec3(0.299, 0.587, 0.114));
        if (lum < 0.012) discard;

        float edgeFade = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x) *
                         smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.88, vUv.y);

        glow.b *= 1.45;
        glow.g *= 1.25;
        float shimmer = 0.88 + 0.12 * sin(uTime * 3.2 - vUv.x * 12.0);
        vec3 col = glow * shimmer * 2.35 * (1.0 - uSubmerged);
        gl_FragColor = vec4(col, clamp(lum * edgeFade * 0.98 * (1.0 - uSubmerged), 0.0, 1.0));
      }
    `,
  });

  const celestialQuadGeo = new THREE.PlaneGeometry(1, 1);

  // High celestial meteor shower backdrop visible across all realms
  const highShowerMesh = new THREE.Mesh(celestialQuadGeo, globalShowerMat);
  highShowerMesh.position.set(0, 36.0, -42.0);
  highShowerMesh.scale.set(64.0, 36.0, 1.0);
  highShowerMesh.rotation.set(-0.68, 0, 0);
  highShowerMesh.renderOrder = -8;
  root.add(highShowerMesh);

  // High celestial blue comet streaking across the upper sky dome
  const highCometMesh = new THREE.Mesh(celestialQuadGeo, globalCometMat);
  highCometMesh.position.set(16.0, 42.0, -36.0);
  highCometMesh.scale.set(42.0, 19.0, 1.0);
  highCometMesh.rotation.set(-0.72, 0.18, -0.35);
  highCometMesh.renderOrder = -7;
  root.add(highCometMesh);

  // 2. Analytical Shimmering Sunset Ocean Surface (mirrors sky bands + golden sun path)
  const oceanGeo = new THREE.PlaneGeometry(160, 160, 128, 128);
  oceanGeo.rotateX(-Math.PI / 2);

  const oceanMat = new THREE.ShaderMaterial({
    transparent: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uSunDir: { value: sunDirection.clone() },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vWorldPos;
      varying vec3 vWaveNormal;

      vec3 computeGerstner(vec2 p, float t, out vec3 waveNorm) {
        vec3 displaced = vec3(0.0);
        vec3 n = vec3(0.0, 1.0, 0.0);

        // Wave 1: primary gentle coastal swell
        vec2 d1 = normalize(vec2(0.35, 0.93));
        float k1 = 0.34;
        float w1 = 0.82;
        float a1 = 0.075;
        float phi1 = dot(d1, p) * k1 + t * w1;
        float s1 = sin(phi1);
        float c1 = cos(phi1);

        // Wave 2: diagonal cross-swell
        vec2 d2 = normalize(vec2(-0.75, 0.65));
        float k2 = 0.58;
        float w2 = 1.12;
        float a2 = 0.042;
        float phi2 = dot(d2, p) * k2 + t * w2;
        float s2 = sin(phi2);
        float c2 = cos(phi2);

        // Wave 3: fine ripple
        vec2 d3 = normalize(vec2(0.85, -0.42));
        float k3 = 1.15;
        float w3 = 1.55;
        float a3 = 0.022;
        float phi3 = dot(d3, p) * k3 + t * w3;
        float s3 = sin(phi3);
        float c3 = cos(phi3);

        displaced.y = a1 * s1 + a2 * s2 + a3 * s3;
        displaced.x = - (d1.x * a1 * c1 + d2.x * a2 * c2 + d3.x * a3 * c3) * 0.42;
        displaced.z = - (d1.y * a1 * c1 + d2.y * a2 * c2 + d3.y * a3 * c3) * 0.42;

        float wa1 = a1 * k1;
        float wa2 = a2 * k2;
        float wa3 = a3 * k3;
        n.x -= (d1.x * wa1 * c1 + d2.x * wa2 * c2 + d3.x * wa3 * c3);
        n.z -= (d1.y * wa1 * c1 + d2.y * wa2 * c2 + d3.y * wa3 * c3);
        n.y -= (wa1 * s1 + wa2 * s2 + wa3 * s3) * 0.28;

        waveNorm = normalize(n);
        return displaced;
      }

      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vec3 wNorm;
        vec3 disp = computeGerstner(wp.xz, uTime, wNorm);
        wp.xyz += disp;
        vWorldPos = wp.xyz;
        vWaveNormal = normalize(mat3(modelMatrix) * wNorm);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uSunDir;
      varying vec3 vWorldPos;
      varying vec3 vWaveNormal;
      ${SUNSET_SKY_GLSL}

      // Multi-scale calm coastal sunset wave normal evaluated analytically per pixel
      vec3 computeOceanNormal(vec2 xz, float t, float dist, vec3 baseN) {
        float atten = 1.0 / (1.0 + dist * 0.032);
        vec2 p1 = xz * vec2(0.55, 2.3) + vec2(t * 0.28, t * 0.42);
        vec2 p2 = xz * vec2(1.35, 5.2) + vec2(-t * 0.22, t * 0.65);
        vec2 p3 = xz * vec2(3.1, 11.5) + vec2(t * 0.45, -t * 0.35);

        float e = 0.08;
        float h0 = valueNoise(p1) * 0.55 + valueNoise(p2) * 0.30 + valueNoise(p3) * 0.15;
        float hx = valueNoise(p1 + vec2(e, 0.0)) * 0.55 + valueNoise(p2 + vec2(e, 0.0)) * 0.30 + valueNoise(p3 + vec2(e, 0.0)) * 0.15;
        float hz = valueNoise(p1 + vec2(0.0, e)) * 0.55 + valueNoise(p2 + vec2(0.0, e)) * 0.30 + valueNoise(p3 + vec2(0.0, e)) * 0.15;

        float amp = 0.085 * atten;
        vec3 rippleN = normalize(vec3((h0 - hx) * amp / e, 1.0, (h0 - hz) * amp / e));
        return normalize(baseN + rippleN * 0.75);
      }

      void main() {
        vec3 viewVec = vWorldPos - cameraPosition;
        float dist = length(viewVec);
        vec3 V = normalize(-viewVec);
        vec3 N = computeOceanNormal(vWorldPos.xz, uTime, dist, vWaveNormal);

        // Looking UP at the ocean surface from underwater (Snell's Window via Fresnel formula)
        if (!gl_FrontFacing) {
          vec3 upN = -N;
          float cosTheta = max(dot(upN, V), 0.0);
          // Snell critical angle: sin(theta_c) = 1.0 / 1.333 => cos(theta_c) ~ 0.66
          // Fresnel transmission vs total internal reflection:
          float sinT2 = (1.333 * 1.333) * (1.0 - cosTheta * cosTheta);
          float fresnelTrans;
          if (sinT2 > 1.0) {
            fresnelTrans = 0.0; // Total internal reflection
          } else {
            float cosT = sqrt(1.0 - sinT2);
            float rPerp = (1.333 * cosTheta - cosT) / (1.333 * cosTheta + cosT);
            float rPar = (cosTheta - 1.333 * cosT) / (cosTheta + 1.333 * cosT);
            float rFresnel = 0.5 * (rPerp * rPerp + rPar * rPar);
            fresnelTrans = clamp(1.0 - rFresnel, 0.0, 1.0);
          }

          vec3 refractedDir = refract(-V, upN, 1.333 / 1.0);
          if (length(refractedDir) < 0.1) {
            refractedDir = normalize(vec3(viewVec.x * 0.75, abs(viewVec.y) + 1.2, viewVec.z * 0.75));
          }
          vec3 rawSky = evaluateSunsetSky(refractedDir, uSunDir, uTime, false);
          float skyLum = dot(rawSky, vec3(0.299, 0.587, 0.114));
          // Synchronize transmitted light with ocean environment (deep azure to luminous sunlit aquamarine/cyan)
          vec3 oceanSky = mix(
            vec3(0.06, 0.28, 0.44), // deep ocean azure
            vec3(0.25, 0.72, 0.84), // luminous turquoise sunlit water surface
            clamp(skyLum * 1.05, 0.0, 1.0)
          );
          vec3 deepReflect = vec3(0.03, 0.12, 0.22); // deep ocean base reflection
          vec3 underside = mix(deepReflect, oceanSky, fresnelTrans * 0.88);

          // Rippling cyan-aquamarine caustic glint on underside waves
          float rippleGlint = pow(max(dot(N, normalize(vec3(0.15, 1.0, -0.35))), 0.0), 16.0);
          underside += vec3(0.48, 0.88, 0.96) * rippleGlint * 0.35 * fresnelTrans;
          float fogOut = smoothstep(12.0, 48.0, dist);
          underside = mix(underside, vec3(0.04, 0.14, 0.24), fogOut);
          gl_FragColor = vec4(underside, 1.0);
          return;
        }

        vec3 R = reflect(-V, N);
        R.y = max(R.y, 0.012);

        // Reflect the exact analytical sunset sky & clouds in the water
        vec3 reflectedSky = evaluateSunsetSky(normalize(R), uSunDir, uTime, false);

        // Deep calm twilight ocean absorption color (rich lavender-tinted navy)
        vec3 deepWater = vec3(0.12, 0.08, 0.20);

        // Schlick Fresnel reflection (grazing angles reflect vivid pink-violet sunset sky)
        float ndotv = max(dot(N, V), 0.0);
        float fresnel = 0.08 + 0.92 * pow(1.0 - ndotv, 3.6);
        vec3 waterCol = mix(deepWater, reflectedSky * 0.94, clamp(fresnel * 1.12, 0.18, 0.96));

        // Shimmering golden-coral & rose-pink sunset glitter ribbon across the waves
        vec3 H = normalize(uSunDir + V);
        float specTight = pow(max(dot(N, H), 0.0), 160.0);
        float specBroad = pow(max(dot(N, H), 0.0), 18.0);
        waterCol += vec3(1.0, 0.82, 0.48) * specTight * 0.62;
        waterCol += vec3(0.98, 0.42, 0.45) * specBroad * 0.22;

        // Soft ambient occlusion shadow grounding directly beneath the central marble pedestal
        float radialFromCenter = length(vWorldPos.xz);
        float pedestalShadow = smoothstep(1.65, 3.8, radialFromCenter);
        waterCol *= mix(0.46, 1.0, pedestalShadow);

        // Soft shoreline shallows around Cat Island at (15.5, -7.5)
        float distCatIsland = length(vWorldPos.xz - vec2(15.5, -7.5));
        float islandFoam = exp(-pow((distCatIsland - 5.25) / 0.38, 2.0)) * 0.22;
        waterCol += vec3(0.95, 0.82, 0.76) * islandFoam;

        // Blend distant ocean edge seamlessly into the misty golden-rose horizon
        vec3 horizonDir = normalize(vec3(viewVec.x, 0.018, viewVec.z));
        vec3 horizonMist = evaluateSunsetSky(horizonDir, uSunDir, uTime, false);
        float distFade = smoothstep(28.0, 74.0, dist);
        waterCol = mix(waterCol, horizonMist, distFade);

        gl_FragColor = vec4(waterCol, 1.0);
      }
    `,
  });

  const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
  oceanMesh.position.y = -2.4;
  root.add(oceanMesh);

  return {
    root,
    sunDirection,
    update: (elapsed: number, submerged = 0) => {
      skyMat.uniforms.uTime.value = elapsed;
      skyMat.uniforms.uSubmerged.value = submerged;
      globalShowerMat.uniforms.uTime.value = elapsed;
      globalShowerMat.uniforms.uSubmerged.value = submerged;
      globalCometMat.uniforms.uTime.value = elapsed;
      globalCometMat.uniforms.uSubmerged.value = submerged;
      oceanMat.uniforms.uTime.value = elapsed;
    },
    dispose: () => {
      skyGeo.dispose();
      skyMat.dispose();
      globalMeteorTex.dispose();
      globalCometTex.dispose();
      globalShowerMat.dispose();
      globalCometMat.dispose();
      celestialQuadGeo.dispose();
      oceanGeo.dispose();
      oceanMat.dispose();
    },
  };
}

/**
 * Generates an HDR-style Sunset IBL cubemap using PMREMGenerator directly from the
 * analytical sunset sky dome so crystal refraction & brushed 18K rose gold mirror
 * the authentic cobalt, coral, magenta, and golden-amber sunset bands.
 */
export function buildSunsetEnvTexture(
  renderer: THREE.WebGLRenderer,
  sunDirection: THREE.Vector3,
): THREE.WebGLRenderTarget {
  const envScene = new THREE.Scene();

  // Render a lightweight sky sphere matching the sunset colors + studio specular softboxes
  const skyGeo = new THREE.SphereGeometry(20, 32, 20);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      uTime: { value: 0 },
      uSunDir: { value: sunDirection.clone() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldDir;
      void main() {
        vWorldDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uSunDir;
      varying vec3 vWorldDir;
      ${SUNSET_SKY_GLSL}

      void main() {
        vec3 d = normalize(vWorldDir);
        vec3 col = evaluateSunsetSky(d, uSunDir, uTime, false);
        if (d.y < 0.0) {
          vec3 ref = normalize(vec3(d.x, abs(d.y) * 0.5 + 0.05, d.z));
          col = evaluateSunsetSky(ref, uSunDir, uTime, false) * 0.45;
        }
        // Gentle natural sun warmth in environment reflection (smooth, zero artificial bloom blowout)
        col += vec3(0.65, 0.45, 0.30) * pow(max(dot(d, uSunDir), 0.0), 32.0);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const envSphere = new THREE.Mesh(skyGeo, skyMat);
  envScene.add(envSphere);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(envScene, 0.025);

  skyGeo.dispose();
  skyMat.dispose();
  pmrem.dispose();

  return envRT;
}
