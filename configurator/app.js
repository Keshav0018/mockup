/* ══════════════════════════════════════════════════════════
   PORSCHE CONFIGURATOR — App Logic
   configurator/app.js
   
   Features:
   ① 3D car viewer with Three.js
   ② Color palette to change car body color live
   ③ Performance stats display
   ④ Smooth camera controls with auto-rotate
   ══════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

console.log('[Configurator] Module loaded, Three.js version:', THREE.REVISION);

/* ── CAR DATA ────────────────────────────────────────── */
const CARS = [
    {
        id: 'car-1',
        name: '911 Turbo S',
        tagline: 'The icon. Reimagined.',
        model: '../models/porsche_911_interior.glb',
        specs: { power: '650', speed: '330', accel: '2.7', engine: 'Twin-Turbo Flat-6' },
        color: '#c0392b',
        cameraPos: { x: 5, y: 2.5, z: 6 },
        targetPos: { x: 0, y: 0.5, z: 0 },
        colors: [
            { name: 'Carmine Red', hex: '#c0392b' },
            { name: 'Arctic White', hex: '#f0f0f0' },
            { name: 'Night Blue Metallic', hex: '#2c3e50' },
            { name: 'GT Silver Metallic', hex: '#95a5a6' },
            { name: 'Black', hex: '#1a1a1a' },
        ],
    },
    {
        id: 'car-2',
        name: '911 Carrera 4S',
        tagline: 'Pure driving pleasure.',
        model: '../models/porsche_911_carrera_4s.glb',
        specs: { power: '450', speed: '308', accel: '3.6', engine: 'Twin-Turbo Flat-6' },
        color: '#e67e22',
        cameraPos: { x: 5, y: 2.2, z: 6 },
        targetPos: { x: 0, y: 0.5, z: 0 },
        colors: [
            { name: 'Lava Orange', hex: '#e67e22' },
            { name: 'Night Blue Metallic', hex: '#2c3e50' },
            { name: 'Ice Grey Metallic', hex: '#bdc3c7' },
            { name: 'Black', hex: '#1a1a1a' },
            { name: 'Racing Yellow', hex: '#f1c40f' },
        ],
    },
    {
        id: 'car-3',
        name: '911 GT3 RS',
        tagline: 'Born on the track.',
        model: '../models/porsche_911_carrera_4s.glb',
        specs: { power: '525', speed: '296', accel: '3.2', engine: 'Naturally Aspirated Flat-6' },
        color: '#27ae60',
        cameraPos: { x: -5, y: 2.5, z: 6 },
        targetPos: { x: 0, y: 0.5, z: 0 },
        colors: [
            { name: 'Python Green', hex: '#27ae60' },
            { name: 'White', hex: '#f5f5f5' },
            { name: 'Signal Yellow', hex: '#f1c40f' },
            { name: 'Guards Red', hex: '#c0392b' },
            { name: 'Shark Blue', hex: '#2980b9' },
        ],
    },
];

/* ── Read car index from URL ─────────────────────────── */
const params = new URLSearchParams(window.location.search);
const carIndex = parseInt(params.get('car') || '0', 10);
const carData = CARS[Math.min(carIndex, CARS.length - 1)];

console.log(`[Configurator] Loading car: ${carData.name}`);

/* ── DRACO LOADER ────────────────────────────────────── */
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

/* ── STATE ───────────────────────────────────────────── */
let carModel = null;
let bodyMeshes = [];
const originalMaterials = new Map();
let currentColor = carData.color;

/* ── THREE.JS SCENE ──────────────────────────────────── */
const canvas = document.getElementById('config-canvas');
const viewerWrap = document.getElementById('viewer-wrap');

const scene = new THREE.Scene();
const pastelBg = '#eef2f7';
scene.background = new THREE.Color(pastelBg);
scene.fog = new THREE.Fog(pastelBg, 12, 35);

const w = viewerWrap.clientWidth || 800;
const h = viewerWrap.clientHeight || 500;

const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
// Start ultra-zoomed on the car body — dramatic reveal
camera.position.set(0.8, 0.6, 1.0);

const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
});
renderer.setSize(w, h);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.4;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

/* ── CONTROLS ────────────────────────────────────────── */
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = false;
controls.enableZoom = true;
controls.minDistance = 1.5;
controls.maxDistance = 14;
controls.target.set(0, 0.8, 0);
controls.maxPolarAngle = Math.PI / 2 + 0.1;
controls.autoRotate = false; // start still, enable after sweep
controls.autoRotateSpeed = 0.5;

/* ── LIGHTING ────────────────────────────────────────── */
// Ambient fill
const hemiLight = new THREE.HemisphereLight(0xffffff, 0xcccccc, 0.8);
scene.add(hemiLight);

// Key light (warm)
const keyLight = new THREE.DirectionalLight(0xffeedd, 3);
keyLight.position.set(5, 10, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 2048;
keyLight.shadow.mapSize.height = 2048;
keyLight.shadow.camera.far = 30;
keyLight.shadow.camera.left = -10;
keyLight.shadow.camera.right = 10;
keyLight.shadow.camera.top = 10;
keyLight.shadow.camera.bottom = -10;
keyLight.shadow.bias = -0.001;
scene.add(keyLight);

// Fill light (cool)
const fillLight = new THREE.DirectionalLight(0xaabbff, 1.5);
fillLight.position.set(-5, 5, -3);
scene.add(fillLight);

// Rim light (warm accent)
const rimLight = new THREE.DirectionalLight(0xff8866, 1);
rimLight.position.set(0, 3, -8);
scene.add(rimLight);

// Top down spot
const topSpot = new THREE.SpotLight(0xffffff, 2, 20, Math.PI / 4, 0.8);
topSpot.position.set(0, 10, 0);
topSpot.target.position.set(0, 0, 0);
topSpot.castShadow = true;
scene.add(topSpot);
scene.add(topSpot.target);

/* ── GROUND PLANE ────────────────────────────────────── */
const groundGeo = new THREE.PlaneGeometry(60, 60);
const groundMat = new THREE.MeshStandardMaterial({
    color: 0xd5dbe3,
    roughness: 0.85,
    metalness: 0.05,
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.01;
ground.receiveShadow = true;
scene.add(ground);

/* ── LOAD MODEL ──────────────────────────────────────── */
const loadingEl = document.getElementById('viewer-loading');
const loadBarFill = document.getElementById('loading-bar-fill');
const loadPct = document.getElementById('loading-pct');

gltfLoader.load(
    carData.model,
    (gltf) => {
        console.log(`[Configurator] ✅ Model loaded: ${carData.name}`);
        carModel = gltf.scene;

        // Center & auto-scale
        const box = new THREE.Box3().setFromObject(carModel);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const idealSize = 4.5;
        const scaleFactor = idealSize / maxDim;
        carModel.scale.setScalar(scaleFactor);

        // Recalculate
        const box2 = new THREE.Box3().setFromObject(carModel);
        const center2 = box2.getCenter(new THREE.Vector3());
        const size2 = box2.getSize(new THREE.Vector3());

        carModel.position.x -= center2.x;
        carModel.position.z -= center2.z;
        carModel.position.y -= box2.min.y;

        // Traverse meshes & find body parts
        carModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material) {
                    originalMaterials.set(child.uuid, child.material.clone());
                }
            }
        });

        // Find body meshes using heuristics
        findBodyMeshes(carModel);

        scene.add(carModel);

        // Update orbit target
        controls.target.set(0, size2.y * 0.4, 0);
        controls.update();

        // Hide loading
        if (loadingEl) {
            loadingEl.style.opacity = '0';
            setTimeout(() => { loadingEl.style.display = 'none'; }, 600);
        }

        console.log(`[Configurator] Body meshes found: ${bodyMeshes.length}`);

        // ── Cinematic camera sweep: close → normal ──
        const sweepFrom = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
        const sweepTo = carData.cameraPos;
        const sweepDuration = 120; // frames — longer for dramatic effect
        let sweepFrame = 0;

        function sweepCamera() {
            sweepFrame++;
            const t = Math.min(1, sweepFrame / sweepDuration);
            const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

            camera.position.x = sweepFrom.x + (sweepTo.x - sweepFrom.x) * ease;
            camera.position.y = sweepFrom.y + (sweepTo.y - sweepFrom.y) * ease;
            camera.position.z = sweepFrom.z + (sweepTo.z - sweepFrom.z) * ease;

            if (sweepFrame < sweepDuration) {
                requestAnimationFrame(sweepCamera);
            } else {
                // Enable auto-rotate once the sweep finishes
                controls.autoRotate = true;
                const rotateBtn = document.getElementById('btn-rotate');
                if (rotateBtn) rotateBtn.classList.add('active');
            }
        }
        // Start sweep after a brief pause
        setTimeout(sweepCamera, 800);
    },
    (progress) => {
        if (progress.total > 0) {
            const pct = Math.round((progress.loaded / progress.total) * 100);
            if (loadBarFill) loadBarFill.style.width = pct + '%';
            if (loadPct) loadPct.textContent = pct + '%';
        }
    },
    (error) => {
        console.error(`[Configurator] ❌ Error loading model:`, error);
        if (loadingEl) {
            loadingEl.innerHTML = '<div style="color:#c0392b;font-size:0.9rem;">Model failed to load</div>';
        }
    }
);

/* ── FIND BODY MESHES ────────────────────────────────── */
function findBodyMeshes(model) {
    bodyMeshes = [];

    // Strategy 1: Find by name (body, paint, chassis, shell, exterior, karosserie)
    const bodyKeywords = ['body', 'paint', 'chassis', 'shell', 'exterior', 'karosserie', 'carrosserie', 'hood', 'fender', 'bumper', 'door_panel', 'trunk', 'roof'];
    model.traverse((child) => {
        if (!child.isMesh) return;
        const name = child.name.toLowerCase();
        if (bodyKeywords.some(keyword => name.includes(keyword))) {
            bodyMeshes.push(child);
        }
    });

    // Strategy 2: Find by material name
    if (bodyMeshes.length === 0) {
        const matKeywords = ['paint', 'body', 'car_paint', 'exterior', 'metal'];
        model.traverse((child) => {
            if (!child.isMesh || !child.material) return;
            const matName = (child.material.name || '').toLowerCase();
            if (matKeywords.some(k => matName.includes(k))) {
                bodyMeshes.push(child);
            }
        });
    }

    // Strategy 3: Find largest meshes with color close to the car's initial color
    if (bodyMeshes.length === 0) {
        const allMeshes = [];
        model.traverse((child) => {
            if (child.isMesh && child.material && child.material.color) {
                const geom = child.geometry;
                const vertexCount = geom.attributes.position ? geom.attributes.position.count : 0;
                allMeshes.push({ mesh: child, vertexCount });
            }
        });

        // Sort by vertex count (largest first) and take top meshes
        allMeshes.sort((a, b) => b.vertexCount - a.vertexCount);

        // Take the top 30% of meshes by size as likely body parts
        const topCount = Math.max(3, Math.ceil(allMeshes.length * 0.3));
        for (let i = 0; i < Math.min(topCount, allMeshes.length); i++) {
            bodyMeshes.push(allMeshes[i].mesh);
        }
    }

    console.log(`[Configurator] Identified ${bodyMeshes.length} body mesh(es):`, bodyMeshes.map(m => m.name));
}

/* ── CHANGE BODY COLOR ───────────────────────────────── */
function changeBodyColor(hexColor) {
    currentColor = hexColor;
    const newColor = new THREE.Color(hexColor);

    bodyMeshes.forEach(mesh => {
        if (mesh.material) {
            // Clone the material so each mesh has its own instance
            if (!mesh.material._isConfigClone) {
                mesh.material = mesh.material.clone();
                mesh.material._isConfigClone = true;
            }
            mesh.material.color.set(newColor);

            // Also update the stored originals so interactions don't revert
            const orig = originalMaterials.get(mesh.uuid);
            if (orig) {
                orig.color.set(newColor);
            }
        }
    });

    // Update the config summary in the stats bar
    const dot = document.getElementById('config-color-dot');
    const nameEl = document.getElementById('config-color-name');
    if (dot) dot.style.background = hexColor;

    const colorEntry = carData.colors.find(c => c.hex === hexColor);
    if (nameEl && colorEntry) nameEl.textContent = colorEntry.name;
}

/* ── ANIMATION LOOP ──────────────────────────────────── */
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

/* ── RESIZE ──────────────────────────────────────────── */
function onResize() {
    const nw = viewerWrap.clientWidth || 800;
    const nh = viewerWrap.clientHeight || 500;
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    renderer.setSize(nw, nh);
}

window.addEventListener('resize', onResize);
requestAnimationFrame(() => {
    onResize();
    setTimeout(onResize, 300);
});

/* ── POPULATE UI ─────────────────────────────────────── */
function initUI() {
    // Set page info
    document.getElementById('car-name').textContent = carData.name;
    document.getElementById('car-tagline').textContent = carData.tagline;
    document.getElementById('nav-model-name').textContent = carData.name;
    document.title = `Porsche ${carData.name} — Configurator`;

    // Stats
    document.getElementById('stat-speed').textContent = carData.specs.speed;
    document.getElementById('stat-accel').textContent = carData.specs.accel + ' sec';
    document.getElementById('stat-engine').textContent = carData.specs.engine;
    document.getElementById('stat-hp').textContent = carData.specs.power;
    document.getElementById('config-model').textContent = carData.name;

    // Power bar (650hp = ~87%, scale relative)
    const maxHp = 700;
    const hpPct = Math.min(100, Math.round((parseInt(carData.specs.power) / maxHp) * 100));
    document.getElementById('power-bar').style.width = hpPct + '%';

    // Color options
    const colorContainer = document.getElementById('color-options');
    carData.colors.forEach((c, i) => {
        const div = document.createElement('div');
        div.className = 'color-option' + (i === 0 ? ' active' : '');
        div.setAttribute('data-color', c.hex);
        div.innerHTML = `
            <span class="color-swatch" style="background: ${c.hex};${c.hex === '#f0f0f0' || c.hex === '#f5f5f5' || c.hex === '#ffffff' ? ' border: 1px solid rgba(0,0,0,0.15);' : ''}"></span>
            <span class="color-label">${c.name}</span>
        `;

        div.addEventListener('click', () => {
            // Update active state
            colorContainer.querySelectorAll('.color-option').forEach(el => el.classList.remove('active'));
            div.classList.add('active');

            // Change the 3D model color
            changeBodyColor(c.hex);
        });

        colorContainer.appendChild(div);
    });

    // Config summary defaults
    document.getElementById('config-color-dot').style.background = carData.colors[0].hex;
    document.getElementById('config-color-name').textContent = carData.colors[0].name;

    // Auto-rotate button
    const rotateBtn = document.getElementById('btn-rotate');
    rotateBtn.addEventListener('click', () => {
        controls.autoRotate = !controls.autoRotate;
        rotateBtn.classList.toggle('active', controls.autoRotate);
    });

    // Reset button
    const resetBtn = document.getElementById('btn-reset');
    resetBtn.addEventListener('click', () => {
        // Smoothly reset camera
        const targetPos = carData.cameraPos;
        const duration = 60; // frames
        const startPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
        let frame = 0;

        function animateReset() {
            frame++;
            const t = Math.min(1, frame / duration);
            const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

            camera.position.x = startPos.x + (targetPos.x - startPos.x) * ease;
            camera.position.y = startPos.y + (targetPos.y - startPos.y) * ease;
            camera.position.z = startPos.z + (targetPos.z - startPos.z) * ease;

            if (frame < duration) {
                requestAnimationFrame(animateReset);
            }
        }
        animateReset();
    });

    // AR button
    const arBtn = document.getElementById('btn-ar');
    arBtn.addEventListener('click', () => {
        const arModel = document.getElementById('ar-model');
        
        if (arModel && arModel.canActivateAR) {
            // Device supports AR — activate it
            arModel.activateAR();
            console.log('[Configurator] AR session activated');
        } else {
            // Show unsupported modal
            const modal = document.getElementById('ar-modal');
            if (modal) {
                modal.style.display = 'flex';
            }
            console.log('[Configurator] AR not supported on this device');
        }
    });
}

initUI();

/* ── CLICK-TO-ENTER INTERIOR ────────────────────────── */
let isInterior = false;
let isAnimatingView = false;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Interior camera position (inside the cockpit)
const interiorPos = { x: 0, y: 1.1, z: 0.3 };
const interiorTarget = { x: 0, y: 1.0, z: -2 }; // looking forward through windshield

// Create exit button (hidden initially)
const exitBtn = document.createElement('button');
exitBtn.id = 'exit-interior-btn';
exitBtn.textContent = '← Exit Interior';
exitBtn.style.cssText = `
    position: fixed;
    bottom: 120px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 200;
    padding: 0.7em 1.8em;
    font-family: 'Barlow', sans-serif;
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #fff;
    background: rgba(192, 57, 43, 0.85);
    border: 1px solid rgba(192, 57, 43, 0.6);
    border-radius: 30px;
    cursor: pointer;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.4s ease, background 0.3s ease;
    backdrop-filter: blur(8px);
`;
document.body.appendChild(exitBtn);

exitBtn.addEventListener('mouseenter', () => { exitBtn.style.background = 'rgba(192, 57, 43, 1)'; });
exitBtn.addEventListener('mouseleave', () => { exitBtn.style.background = 'rgba(192, 57, 43, 0.85)'; });

function animateCameraTo(targetCamPos, targetLookAt, duration, onComplete) {
    if (isAnimatingView) return;
    isAnimatingView = true;

    const startPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
    const startTarget = { x: controls.target.x, y: controls.target.y, z: controls.target.z };
    let frame = 0;

    function step() {
        frame++;
        const t = Math.min(1, frame / duration);
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        camera.position.x = startPos.x + (targetCamPos.x - startPos.x) * ease;
        camera.position.y = startPos.y + (targetCamPos.y - startPos.y) * ease;
        camera.position.z = startPos.z + (targetCamPos.z - startPos.z) * ease;

        controls.target.x = startTarget.x + (targetLookAt.x - startTarget.x) * ease;
        controls.target.y = startTarget.y + (targetLookAt.y - startTarget.y) * ease;
        controls.target.z = startTarget.z + (targetLookAt.z - startTarget.z) * ease;

        if (frame < duration) {
            requestAnimationFrame(step);
        } else {
            isAnimatingView = false;
            if (onComplete) onComplete();
        }
    }
    step();
}

// Click on canvas → raycast → enter interior
canvas.addEventListener('click', (e) => {
    if (isInterior || isAnimatingView || !carModel) return;

    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObject(carModel, true);

    if (hits.length > 0) {
        isInterior = true;
        controls.autoRotate = false;
        const rotateBtn = document.getElementById('btn-rotate');
        if (rotateBtn) rotateBtn.classList.remove('active');

        // Animate into the cockpit
        animateCameraTo(interiorPos, interiorTarget, 75, () => {
            controls.minDistance = 0.1;
            controls.maxDistance = 2;
            controls.enablePan = true;
            // Show exit button
            exitBtn.style.opacity = '1';
            exitBtn.style.pointerEvents = 'auto';
        });
    }
});

// Exit interior
exitBtn.addEventListener('click', () => {
    if (!isInterior || isAnimatingView) return;

    exitBtn.style.opacity = '0';
    exitBtn.style.pointerEvents = 'none';

    const exteriorTarget = { x: 0, y: carModel ? new THREE.Box3().setFromObject(carModel).getSize(new THREE.Vector3()).y * 0.4 : 0.8, z: 0 };

    animateCameraTo(carData.cameraPos, exteriorTarget, 75, () => {
        isInterior = false;
        controls.minDistance = 1.5;
        controls.maxDistance = 14;
        controls.enablePan = false;
        controls.autoRotate = true;
        const rotateBtn = document.getElementById('btn-rotate');
        if (rotateBtn) rotateBtn.classList.add('active');
    });
});

