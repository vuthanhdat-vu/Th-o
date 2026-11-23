import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import type { MemoryItem, ShowcaseRealm, TwilightStageHandle } from '../types/showcase';
import { createHeartSculpture, type HeartSculptureRig } from './heartSculpture';
import { createPhotoOrbit, type PhotoOrbitRig } from './photoOrbit';
import { createTwilightParticles, type TwilightParticlesRig } from './particleSystem';
import { createShowcaseRealms, REALM_ANCHORS, type ShowcaseRealmsRig } from './realms';
import { buildSunsetEnvTexture, createSunsetEnvironment } from './sunsetEnvironment';
import { createMeteorTextRig } from './meteorText';

interface TwilightHeartStageProps {
  memories: MemoryItem[];
  activeRealm: ShowcaseRealm;
  selectedMemoryId: string | null;
  autoRotate: boolean;
  onHeartClick: () => void;
  onMemorySelect: (memoryId: string) => void;
  onRealmSelect: (realm: ShowcaseRealm) => void;
  onCanvasBlankClick: () => void;
}

const _desiredCamPos = new THREE.Vector3();
const _desiredTarget = new THREE.Vector3();
const _pointer = new THREE.Vector2();
const _raycaster = new THREE.Raycaster();
_raycaster.layers.set(1);

// Pre-allocated colors for zero-GC atmosphere interpolation (sunset <-> underwater)
const _sunsetSkyColor = new THREE.Color('#635db5');
const _sunsetGroundColor = new THREE.Color('#543144');
const _underwaterSkyColor = new THREE.Color('#58b4cc');
const _underwaterGroundColor = new THREE.Color('#0c2438');
const _sunsetKeyColor = new THREE.Color('#f3cca4');
const _underwaterKeyColor = new THREE.Color('#92e3ef');

function detectSoftwareGl(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

/**
 * Limits DPR to Math.min(window.devicePixelRatio, 2) as required by graphics standards.
 */
function computeCrispPixelRatio(_width: number, isSoftwareGl: boolean): number {
  if (isSoftwareGl) return 1;
  return Math.min(window.devicePixelRatio || 1, 2);
}

export const TwilightHeartStage = forwardRef<TwilightStageHandle, TwilightHeartStageProps>(
  function TwilightHeartStage(
    {
      memories,
      activeRealm,
      selectedMemoryId,
      autoRotate,
      onHeartClick,
      onMemorySelect,
      onRealmSelect,
      onCanvasBlankClick,
    },
    ref,
  ) {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const [webglUnavailable, setWebglUnavailable] = useState(false);

    const propsRef = useRef({
      memories,
      activeRealm,
      selectedMemoryId,
      autoRotate,
      onHeartClick,
      onMemorySelect,
      onRealmSelect,
      onCanvasBlankClick,
    });
    propsRef.current = {
      memories,
      activeRealm,
      selectedMemoryId,
      autoRotate,
      onHeartClick,
      onMemorySelect,
      onRealmSelect,
      onCanvasBlankClick,
    };

    const sceneBridgeRef = useRef<{
      heartRig: HeartSculptureRig | null;
      photoOrbit: PhotoOrbitRig | null;
      particles: TwilightParticlesRig | null;
      realms: ShowcaseRealmsRig | null;
      setCameraTarget: (pos: THREE.Vector3, target: THREE.Vector3) => void;
    }>({
      heartRig: null,
      photoOrbit: null,
      particles: null,
      realms: null,
      setCameraTarget: () => {},
    });

    useEffect(() => {
      sceneBridgeRef.current.photoOrbit?.setMemories(memories);
    }, [memories]);

    useEffect(() => {
      if (!selectedMemoryId) return;
      const orbit = sceneBridgeRef.current.photoOrbit;
      if (!orbit) return;
      if (orbit.getFrameWorldFocus(selectedMemoryId, _desiredTarget, _desiredCamPos)) {
        sceneBridgeRef.current.setCameraTarget(_desiredCamPos.clone(), _desiredTarget.clone());
      }
    }, [selectedMemoryId]);

    useImperativeHandle(ref, () => ({
      triggerHeartbeat: () => {
        sceneBridgeRef.current.heartRig?.triggerImpulse();
        sceneBridgeRef.current.particles?.spawnHeartBurst();
      },
      focusMemory: (memoryId: string | null) => {
        if (!memoryId) {
          const anchor = REALM_ANCHORS[propsRef.current.activeRealm];
          sceneBridgeRef.current.setCameraTarget(
            new THREE.Vector3(...anchor.cameraPos),
            new THREE.Vector3(...anchor.cameraTarget),
          );
          return;
        }
        const orbit = sceneBridgeRef.current.photoOrbit;
        if (orbit && orbit.getFrameWorldFocus(memoryId, _desiredTarget, _desiredCamPos)) {
          sceneBridgeRef.current.setCameraTarget(_desiredCamPos.clone(), _desiredTarget.clone());
        }
      },
      setRealm: (realm: ShowcaseRealm) => {
        const anchor = REALM_ANCHORS[realm];
        sceneBridgeRef.current.setCameraTarget(
          new THREE.Vector3(...anchor.cameraPos),
          new THREE.Vector3(...anchor.cameraTarget),
        );
      },
    }));

    useEffect(() => {
      const container = mountRef.current;
      if (!container) return;

      const isSoftwareGl = detectSoftwareGl();
      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: !isSoftwareGl,
          powerPreference: 'high-performance',
        });
      } catch {
        setWebglUnavailable(true);
        return;
      }

      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;
      const pixelRatio = computeCrispPixelRatio(width, isSoftwareGl);

      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height);
      renderer.shadowMap.enabled = !isSoftwareGl;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.info.autoReset = false;
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#19122c');
      const underwaterFog = new THREE.FogExp2('#0b2940', 0);

      const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 200);
      camera.position.set(...REALM_ANCHORS.heart.cameraPos);

      // Analytical 2K Vector-Shader Sunset Sky Dome, Interwoven Altocumulus Clouds & Calm Shimmering Sea
      const sunsetEnv = createSunsetEnvironment();
      scene.add(sunsetEnv.root);

      // Matched Sunset PMREM Environment Map with gentle intensity (0.50) for natural gemstone IBL reflections
      const envRT = buildSunsetEnvTexture(renderer, sunsetEnv.sunDirection);
      scene.environment = envRT.texture;
      scene.environmentIntensity = 0.50;

      // Photorealistic Coastal Sunset 3-Point Lighting Rig (natural outdoor lighting - ZERO artificial studio glare)
      // 1) Cool twilight cobalt sky / warm coral-amber sea bounce HemisphereLight
      const hemiLight = new THREE.HemisphereLight('#635db5', '#543144', 0.80);
      hemiLight.position.set(0, 18, 0);
      scene.add(hemiLight);

      // 2) Warm golden-hour directional key light angled across the heart & frames (2048px soft shadows)
      const keyLight = new THREE.DirectionalLight('#f5cca4', 1.15);
      keyLight.position.set(6.2, 6.4, 5.8);
      keyLight.castShadow = !isSoftwareGl;
      keyLight.shadow.mapSize.width = 2048;
      keyLight.shadow.mapSize.height = 2048;
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 36;
      const d = 14.0;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0004;
      keyLight.shadow.normalBias = 0.02;
      scene.add(keyLight);

      // 3) Gentle sunset horizon backlight rim aligned with the setting sun at the horizon
      const sunsetRimLight = new THREE.DirectionalLight('#ff8f52', 0.55);
      sunsetRimLight.position.set(
        sunsetEnv.sunDirection.x * 16,
        sunsetEnv.sunDirection.y * 16 + 0.6,
        sunsetEnv.sunDirection.z * 16,
      );
      scene.add(sunsetRimLight);

      // Zero artificial studio softboxes to completely eliminate blinding white reflection flares on the heart
      const rectLights: THREE.RectAreaLight[] = [];

      const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

      const heartRig = createHeartSculpture(isSoftwareGl, maxAnisotropy);
      scene.add(heartRig.root);

      const realms = createShowcaseRealms(isSoftwareGl, maxAnisotropy);
      scene.add(realms.root);

      const photoOrbit = createPhotoOrbit(maxAnisotropy);
      photoOrbit.setMemories(propsRef.current.memories);
      scene.add(photoOrbit.root);

      const particles = createTwilightParticles();
      scene.add(particles.root);

      const meteorText = createMeteorTextRig();
      scene.add(meteorText.root);

      // High-realism Post-Processing EffectComposer
      let composer: EffectComposer | null = null;
      let bloomPass: UnrealBloomPass | null = null;
      let vignettePass: ShaderPass | null = null;
      let outputPass: OutputPass | null = null;
      let smaaPass: SMAAPass | null = null;
      let composerTarget: THREE.WebGLRenderTarget | null = null;
      if (!isSoftwareGl) {
        composerTarget = new THREE.WebGLRenderTarget(
          Math.floor(width * pixelRatio),
          Math.floor(height * pixelRatio),
          {
            type: THREE.HalfFloatType,
          },
        );
        composer = new EffectComposer(renderer, composerTarget);
        composer.setPixelRatio(pixelRatio);
        composer.setSize(width, height);

        // 1. Base Scene Pass
        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);

        // 2. High-threshold Bloom Pass (luminanceThreshold: 1.55, strength: 0.18, radius: 0.12) - strictly for shooting stars, zero glare on the heart
        bloomPass = new UnrealBloomPass(
          new THREE.Vector2(width, height),
          0.18,
          0.12,
          1.55,
        );
        composer.addPass(bloomPass);

        // 3. Subtle Corner Vignette Pass
        vignettePass = new ShaderPass(VignetteShader);
        vignettePass.uniforms['offset'].value = 1.05;
        vignettePass.uniforms['darkness'].value = 1.05;
        composer.addPass(vignettePass);

        // 4. Output Color Management & ACESFilmic Tone Mapping Pass
        outputPass = new OutputPass();
        composer.addPass(outputPass);

        // 5. SMAA Anti-Aliasing Pass
        smaaPass = new SMAAPass();
        composer.addPass(smaaPass);
      }

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = !isSoftwareGl;
      controls.dampingFactor = 0.06;
      controls.enablePan = false;
      controls.minDistance = 2.8;
      controls.maxDistance = 18.0;
      controls.minPolarAngle = Math.PI * 0.16;
      controls.maxPolarAngle = Math.PI * 0.51;
      controls.target.set(...REALM_ANCHORS.heart.cameraTarget);

      let camFlightActive = false;
      const flightCamPos = new THREE.Vector3(...REALM_ANCHORS.heart.cameraPos);
      const flightTarget = new THREE.Vector3(...REALM_ANCHORS.heart.cameraTarget);

      controls.addEventListener('start', () => {
        camFlightActive = false;
      });

      sceneBridgeRef.current = {
        heartRig,
        photoOrbit,
        particles,
        realms,
        setCameraTarget: (pos, target) => {
          flightCamPos.copy(pos);
          flightTarget.copy(target);
          camFlightActive = true;
        },
      };

      if (!isSoftwareGl) {
        renderer.compile(scene, camera);
      }

      let hoveredHeart = false;
      let hoveredMemoryId: string | null = null;
      let lastHoverCheck = 0;
      let pointerDownX = 0;
      let pointerDownY = 0;
      let pointerDownTime = 0;

      const updatePointerNdc = (clientX: number, clientY: number) => {
        const rect = renderer.domElement.getBoundingClientRect();
        _pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        _pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      };

      const performRaycast = () => {
        _raycaster.setFromCamera(_pointer, camera);
        const activeRealm = propsRef.current.activeRealm;
        // Never allow the current realm's boundary hit sphere to intercept clicks intended for photo frames
        const otherRealmProxies = realms.hitProxies.filter(
          (p) => (p.userData as { realm?: ShowcaseRealm })?.realm !== activeRealm,
        );
        const targets: THREE.Object3D[] = [
          heartRig.hitProxy,
          ...photoOrbit.getHitPlanes(),
          ...otherRealmProxies,
        ];
        return _raycaster.intersectObjects(targets, false);
      };

      const handlePointerMove = (e: PointerEvent) => {
        const now = performance.now();
        if (now - lastHoverCheck < 45) return;
        lastHoverCheck = now;

        updatePointerNdc(e.clientX, e.clientY);
        const hits = performRaycast();
        if (hits.length > 0) {
          // Always prioritize memory hit if intersected
          const memoryHit = hits.find(
            (h) => (h.object.userData as { interactType?: string })?.interactType === 'memory',
          );
          const topHit = memoryHit || hits[0];
          const data = topHit.object.userData as {
            interactType?: string;
            memoryId?: string;
            realm?: ShowcaseRealm;
          };
          if (data.interactType === 'heart') {
            hoveredHeart = true;
            hoveredMemoryId = null;
            renderer.domElement.style.cursor = 'pointer';
          } else if (data.interactType === 'memory' && data.memoryId) {
            hoveredHeart = false;
            hoveredMemoryId = data.memoryId;
            renderer.domElement.style.cursor = 'pointer';
          } else if (data.interactType === 'realm' && data.realm) {
            hoveredHeart = false;
            hoveredMemoryId = null;
            renderer.domElement.style.cursor =
              data.realm !== propsRef.current.activeRealm ? 'pointer' : 'grab';
          }
        } else {
          hoveredHeart = false;
          hoveredMemoryId = null;
          renderer.domElement.style.cursor =
            propsRef.current.activeRealm === 'sky' && propsRef.current.selectedMemoryId === null
              ? 'default'
              : 'grab';
        }
      };

      const handlePointerDown = (e: PointerEvent) => {
        pointerDownX = e.clientX;
        pointerDownY = e.clientY;
        pointerDownTime = performance.now();
      };

      const handlePointerUp = (e: PointerEvent) => {
        const dx = e.clientX - pointerDownX;
        const dy = e.clientY - pointerDownY;
        const dt = performance.now() - pointerDownTime;
        if (Math.hypot(dx, dy) > 7 || dt > 420) return;

        updatePointerNdc(e.clientX, e.clientY);
        const hits = performRaycast();
        if (hits.length > 0) {
          // Prioritize memory hit if intersected
          const memoryHit = hits.find(
            (h) => (h.object.userData as { interactType?: string })?.interactType === 'memory',
          );
          const topHit = memoryHit || hits[0];
          const data = topHit.object.userData as {
            interactType?: string;
            memoryId?: string;
            realm?: ShowcaseRealm;
          };
          if (data.interactType === 'memory' && data.memoryId) {
            propsRef.current.onMemorySelect(data.memoryId);
            return;
          }
          if (data.interactType === 'heart') {
            heartRig.triggerImpulse();
            particles.spawnHeartBurst();
            propsRef.current.onHeartClick();
            return;
          }
          if (
            data.interactType === 'realm' &&
            data.realm &&
            data.realm !== propsRef.current.activeRealm
          ) {
            propsRef.current.onRealmSelect(data.realm);
            return;
          }
        } else {
          propsRef.current.onCanvasBlankClick();
        }
      };

      renderer.domElement.addEventListener('pointermove', handlePointerMove);
      renderer.domElement.addEventListener('pointerdown', handlePointerDown);
      renderer.domElement.addEventListener('pointerup', handlePointerUp);

      const handleContextLost = (e: Event) => {
        e.preventDefault();
      };
      const handleContextRestored = () => {
        setWebglUnavailable(false);
      };
      renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

      const handleResize = () => {
        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || window.innerHeight;
        const pr = computeCrispPixelRatio(w, isSoftwareGl);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(pr);
        renderer.setSize(w, h);
        if (composer) {
          composer.setPixelRatio(pr);
          composer.setSize(w, h);
        }
        if (bloomPass) bloomPass.resolution.set(w, h);
        if (smaaPass) smaaPass.setSize(w * pr, h * pr);
      };
      window.addEventListener('resize', handleResize);

      const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      let prefersReducedMotion = reducedMotionQuery.matches;
      const handleMotionPref = (e: MediaQueryListEvent) => {
        prefersReducedMotion = e.matches;
      };
      reducedMotionQuery.addEventListener('change', handleMotionPref);

      let disposed = false;
      let frameId = 0;
      let lastTime = performance.now();
      const startTime = performance.now();
      let perfLastTime = performance.now();
      let perfFrameCount = 0;
      let smoothedFps = 60;
      let skyFlightElapsed = 0;

      function afterDraw(cb: () => void) {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        if (!gl || typeof gl.fenceSync !== 'function') {
          frameId = window.setTimeout(cb, 80);
          return;
        }
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      }

      const tick = () => {
        if (disposed) return;

        renderer.info.reset();

        const now = performance.now();
        const rawDelta = (now - lastTime) / 1000;
        lastTime = now;
        const delta = Math.min(rawDelta, 0.08);
        const motionScale = prefersReducedMotion ? 0.15 : 1.0;
        const elapsed = (now - startTime) / 1000;
        const currentRealm = propsRef.current.activeRealm;

        const isSkyConvoyPaused = currentRealm === 'sky' && propsRef.current.selectedMemoryId !== null;
        if (!isSkyConvoyPaused) {
          skyFlightElapsed += delta * motionScale;
        }

        const isSkyRealm = currentRealm === 'sky';
        controls.enableRotate = !isSkyRealm;
        controls.enableZoom = !isSkyRealm;

        const allowAuto =
          !isSoftwareGl &&
          !prefersReducedMotion &&
          propsRef.current.autoRotate &&
          currentRealm === 'heart' &&
          propsRef.current.selectedMemoryId === null &&
          !camFlightActive;
        controls.autoRotate = allowAuto;
        controls.autoRotateSpeed = 0.34;

        if (camFlightActive) {
          // Relax polar bounds mid-flight so diving underwater or climbing to the sky never snaps
          controls.minPolarAngle = 0.05;
          controls.maxPolarAngle = Math.PI - 0.05;

          camera.position.x = THREE.MathUtils.damp(camera.position.x, flightCamPos.x, 3.6, delta);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, flightCamPos.y, 3.6, delta);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, flightCamPos.z, 3.6, delta);

          controls.target.x = THREE.MathUtils.damp(controls.target.x, flightTarget.x, 4.0, delta);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, flightTarget.y, 4.0, delta);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, flightTarget.z, 4.0, delta);

          if (
            camera.position.distanceToSquared(flightCamPos) < 0.004 &&
            controls.target.distanceToSquared(flightTarget) < 0.004
          ) {
            camera.position.copy(flightCamPos);
            controls.target.copy(flightTarget);
            camFlightActive = false;
          }
        } else {
          controls.minPolarAngle = Math.PI * 0.14;
          if (currentRealm === 'underwater' || camera.position.y < -2.6) {
            controls.maxPolarAngle = Math.PI * 0.68;
          } else if (currentRealm === 'sky') {
            controls.maxPolarAngle = Math.PI * 0.62;
          } else {
            controls.maxPolarAngle = Math.PI * 0.51;
          }
        }

        controls.update();

        // Smooth underwater depth atmosphere transition (zero GC)
        const submerged = THREE.MathUtils.smoothstep(-camera.position.y, 2.35, 3.15);
        underwaterFog.density = submerged * 0.032;
        scene.fog = submerged > 0.004 ? underwaterFog : null;
        hemiLight.color.lerpColors(_sunsetSkyColor, _underwaterSkyColor, submerged);
        hemiLight.groundColor.lerpColors(_sunsetGroundColor, _underwaterGroundColor, submerged);
        keyLight.color.lerpColors(_sunsetKeyColor, _underwaterKeyColor, submerged * 0.72);
        scene.environmentIntensity = THREE.MathUtils.lerp(0.50, 0.38, submerged);

        sunsetEnv.update(elapsed * motionScale, submerged);
        const inHeartZone =
          currentRealm === 'heart' ||
          (camFlightActive &&
            camera.position.y > -2.0 &&
            camera.position.y < 5.0 &&
            Math.abs(camera.position.x) < 5.0);
        heartRig.root.visible = inHeartZone;
        if (inHeartZone) {
          heartRig.update(elapsed * motionScale, delta * motionScale, hoveredHeart);
        }
        photoOrbit.update(
          elapsed * motionScale,
          delta * motionScale,
          currentRealm,
          hoveredMemoryId,
          propsRef.current.selectedMemoryId,
          prefersReducedMotion || !propsRef.current.autoRotate,
          skyFlightElapsed,
        );
        realms.update(
          elapsed * motionScale,
          delta * motionScale,
          currentRealm,
          camera.position.y,
          camFlightActive,
          photoOrbit.getFrameWorldPosition,
          skyFlightElapsed,
        );
        particles.update(elapsed * motionScale, delta * motionScale);
        meteorText.update(elapsed * motionScale, delta * motionScale, currentRealm);

        if (composer && !isSoftwareGl) {
          composer.render();
        } else {
          renderer.render(scene, camera);
        }

        // Real-time LookDev performance tracking (FPS, Draw Calls, Triangles)
        perfFrameCount++;
        const perfNow = performance.now();
        const interval = perfNow - perfLastTime;
        if (interval >= 250) {
          const rawFps = Math.round((perfFrameCount * 1000) / interval);
          smoothedFps = Math.round(smoothedFps * 0.65 + rawFps * 0.35);
          const currentFps = THREE.MathUtils.clamp(smoothedFps, 1, 120);
          const calls = renderer.info.render.calls;
          const triangles = renderer.info.render.triangles;
          perfFrameCount = 0;
          perfLastTime = perfNow;

          const fpsEl = document.getElementById('perf-hud-fps');
          const dcEl = document.getElementById('perf-hud-dc');
          const trisEl = document.getElementById('perf-hud-tris');
          if (fpsEl) {
            fpsEl.textContent = `${currentFps} FPS`;
            fpsEl.className = `font-semibold ${
              currentFps >= 50 ? 'text-emerald-400' : currentFps >= 30 ? 'text-amber-300' : 'text-rose-400'
            }`;
          }
          if (dcEl) {
            dcEl.textContent = `DC: ${calls}`;
            dcEl.className = `font-medium ${calls < 100 ? 'text-pink-300' : 'text-rose-400'}`;
          }
          if (trisEl) {
            const triStr = triangles >= 1000 ? `${(triangles / 1000).toFixed(1)}k` : `${triangles}`;
            trisEl.textContent = `Tris: ${triStr}`;
          }
        }

        if (isSoftwareGl) {
          afterDraw(tick);
        } else {
          frameId = requestAnimationFrame(tick);
        }
      };

      tick();

      return () => {
        disposed = true;
        cancelAnimationFrame(frameId);
        clearTimeout(frameId);

        window.removeEventListener('resize', handleResize);
        reducedMotionQuery.removeEventListener('change', handleMotionPref);
        renderer.domElement.removeEventListener('pointermove', handlePointerMove);
        renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
        renderer.domElement.removeEventListener('pointerup', handlePointerUp);
        renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
        renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

        controls.dispose();
        sunsetEnv.dispose();
        heartRig.dispose();
        realms.dispose();
        photoOrbit.dispose();
        particles.dispose();
        meteorText.dispose();
        rectLights.forEach((l) => scene.remove(l));
        envRT.dispose();
        bloomPass?.dispose();
        vignettePass?.dispose();
        outputPass?.dispose();
        smaaPass?.dispose();
        composerTarget?.dispose();
        composer?.dispose();
        renderer.dispose();

        if (renderer.domElement.parentNode === container) {
          container.removeChild(renderer.domElement);
        }
      };
    }, []);

    if (webglUnavailable) {
      return (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center px-6 text-center"
          style={{
            background:
              'linear-gradient(180deg, #2d4a84 0%, #c76c84 48%, #ff8c42 74%, #2a1d35 100%)',
          }}
        >
          <p className="font-editorial text-3xl text-[#FAF3F5]">Hoàng Hôn Của Đôi Mình</p>
          <p className="mt-3 max-w-md text-sm text-[#FAF3F5]/90">
            Trình duyệt hiện tại không hỗ trợ WebGL để hiển thị không gian 3D. Bạn vẫn có thể xem
            thiệp lời nhắn, cột mốc kỷ niệm và ảnh của hai mình bằng thanh điều khiển phía dưới.
          </p>
        </div>
      );
    }

    return (
      <div
        ref={mountRef}
        className="fixed inset-0 h-full w-full select-none"
        aria-label="Không gian trưng bày trái tim 3D trên biển hoàng hôn"
      />
    );
  },
);
