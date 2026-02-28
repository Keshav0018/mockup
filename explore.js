/* ══════════════════════════════════════════════════════════════
   PORSCHE — Explore Section
   explore.js  |  Three.js + GSAP interactive 3D car showcase
   
   Features:
   ① 3 Porsche model cards with 3D viewers
   ② Mouse-drag rotation via OrbitControls
   ③ Interactive component clicking (doors, lights, etc.)
   ④ GSAP scroll-triggered reveal animations
   ⑤ Cinematic lighting with showroom-quality setup
══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

console.log('[Explore] Module loaded, Three.js version:', THREE.REVISION);

/* ── CAR DATA ─────────────────────────────────────────── */
const CARS = [
    {
        id: 'car-1',
        name: '911 Turbo S',
        tagline: 'The icon. Reimagined.',
        model: 'models/porsche_911_interior.glb',
        specs: { power: '650 hp', speed: '330 km/h', accel: '2.7s', engine: 'Twin-Turbo Flat-6' },
        color: '#c0392b',
        cameraPos: { x: 4, y: 2.5, z: 5 },
        targetPos: { x: 0, y: 0.5, z: 0 },
        scale: 1.0,
    },
    {
        id: 'car-2',
        name: '911 Carrera 4S',
        tagline: 'Pure driving pleasure.',
        model: 'models/porsche_911_carrera_4s.glb',
        specs: { power: '450 hp', speed: '308 km/h', accel: '3.6s', engine: 'Twin-Turbo Flat-6' },
        color: '#e67e22',
        cameraPos: { x: 4, y: 2.2, z: 5 },
        targetPos: { x: 0, y: 0.5, z: 0 },
        scale: 1.0,
    },
    {
        id: 'car-3',
        name: '911 GT3 RS',
        tagline: 'Born on the track.',
        model: 'models/porsche_911_carrera_4s.glb',
        specs: { power: '525 hp', speed: '296 km/h', accel: '3.2s', engine: 'Naturally Aspirated Flat-6' },
        color: '#27ae60',
        cameraPos: { x: -4, y: 2.5, z: 5 },
        targetPos: { x: 0, y: 0.5, z: 0 },
        scale: 1.0,
    },
];

/* ── DRACO LOADER (shared) ────────────────────────────── */
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

/* ── STATE ────────────────────────────────────────────── */
const viewers = [];

/* ── GSAP reference ───────────────────────────────────── */
const gsap = window.gsap;

/* ── CREATE VIEWER ────────────────────────────────────── */
function createViewer(carData, index) {
    const container = document.getElementById(`viewer-${carData.id}`);
    if (!container) {
        console.error(`[Explore] Container not found: viewer-${carData.id}`);
        return null;
    }

    const canvas = container.querySelector('canvas');
    if (!canvas) {
        console.error(`[Explore] Canvas not found in container`);
        return null;
    }

    // Get proper dimensions — use a fallback if offscreen
    let w = container.clientWidth || container.offsetWidth || 400;
    let h = container.clientHeight || container.offsetHeight || 250;

    console.log(`[Explore] Creating viewer for ${carData.name}: ${w}x${h}`);

    // Scene
    const scene = new THREE.Scene();

    // Load realistic background image
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('brand_assets/background_realistic.jpg', (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        scene.background = texture;
    }, undefined, () => {
        // Fallback to light realistic color if image not found
        scene.background = new THREE.Color('#e0e5ec');
    });

    // Soft fog to blend ground into the background
    scene.fog = new THREE.Fog('#e0e5ec', 8, 25);

    // Camera  
    const camera = new THREE.PerspectiveCamera(45, w / h || 1.6, 0.1, 100);
    camera.position.set(carData.cameraPos.x, carData.cameraPos.y, carData.cameraPos.z);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.minDistance = 2;
    controls.maxDistance = 12;
    controls.target.set(carData.targetPos.x, carData.targetPos.y, carData.targetPos.z);
    controls.maxPolarAngle = Math.PI / 2 + 0.15;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;

    // ── Lighting (showroom quality) ──────────────────────
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x222222, 0.6);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffeedd, 3);
    keyLight.position.set(5, 10, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.far = 30;
    keyLight.shadow.bias = -0.001;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xaabbff, 1.2);
    fillLight.position.set(-5, 5, -3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff8866, 1.5);
    rimLight.position.set(0, 3, -8);
    scene.add(rimLight);

    const accentColor = new THREE.Color(carData.color);
    const accentLight = new THREE.SpotLight(accentColor, 2, 20, Math.PI / 6, 0.5);
    accentLight.position.set(-3, 5, 3);
    scene.add(accentLight);

    const groundSpot = new THREE.SpotLight(0xffffff, 1.5, 15, Math.PI / 4, 0.8);
    groundSpot.position.set(0, 8, 0);
    groundSpot.target.position.set(0, 0, 0);
    scene.add(groundSpot);
    scene.add(groundSpot.target);

    // ── Ground plane (clean realistic asphalt/concrete) ───────────────
    const groundGeo = new THREE.PlaneGeometry(50, 50);
    const groundMat = new THREE.MeshStandardMaterial({
        color: 0x999999,
        roughness: 0.8,
        metalness: 0.1,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.01;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // ── Environment ring light ───────────────────────────
    const ringGeo = new THREE.TorusGeometry(6, 0.05, 8, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    ring1.position.y = 4;
    ring1.rotation.x = Math.PI / 2;
    scene.add(ring1);

    // ── Interaction state ────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let carModel = null;
    let interactiveParts = [];
    let hoveredPart = null;
    let highlightedPart = null;
    const originalMaterials = new Map();
    let doorOpen = false;

    const tooltip = container.parentElement.querySelector('.viewer-tooltip');
    const loadingEl = container.querySelector('.viewer-loading');

    // ── Load Model IMMEDIATELY ───────────────────────────
    console.log(`[Explore] Starting model load: ${carData.model}`);

    const loadPromise = new Promise((resolve) => {
        gltfLoader.load(
            carData.model,
            (gltf) => {
                console.log(`[Explore] ✅ Model loaded: ${carData.name}`);
                carModel = gltf.scene;

                // Center & auto-scale
                const box = new THREE.Box3().setFromObject(carModel);
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const idealSize = 4;
                const scaleFactor = idealSize / maxDim;
                carModel.scale.setScalar(scaleFactor);

                // Recalculate after scale
                const box2 = new THREE.Box3().setFromObject(carModel);
                const center2 = box2.getCenter(new THREE.Vector3());
                const size2 = box2.getSize(new THREE.Vector3());

                // Center horizontally (x,z), but place bottom edge at y=0 (on top of ground)
                carModel.position.x -= center2.x;
                carModel.position.z -= center2.z;
                carModel.position.y -= box2.min.y;  // Lift car so its lowest point sits at y=0

                // Traverse meshes
                carModel.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        if (child.material) {
                            originalMaterials.set(child.uuid, child.material.clone());
                        }
                        interactiveParts.push(child);
                    }
                });

                scene.add(carModel);
                console.log(`[Explore] Model added to scene: ${carData.name}, ${interactiveParts.length} interactive parts`);
                console.log(`[Explore] Model bounds — min.y: ${box2.min.y.toFixed(3)}, height: ${size2.y.toFixed(3)}`);

                // Update controls target to the car's vertical center (half its height)
                controls.target.set(0, size2.y * 0.45, 0);
                controls.update();

                // Hide loading
                if (loadingEl) {
                    loadingEl.style.opacity = '0';
                    setTimeout(() => { loadingEl.style.display = 'none'; }, 500);
                }

                resolve(carModel);
            },
            (progress) => {
                if (loadingEl && progress.total > 0) {
                    const pct = Math.round((progress.loaded / progress.total) * 100);
                    const bar = loadingEl.querySelector('.loading-bar-fill');
                    const text = loadingEl.querySelector('.loading-pct');
                    if (bar) bar.style.width = pct + '%';
                    if (text) text.textContent = pct + '%';
                }
            },
            (error) => {
                console.error(`[Explore] ❌ Error loading ${carData.name}:`, error);
                if (loadingEl) {
                    loadingEl.innerHTML = '<div style="color:#c0392b;font-size:0.8rem;">Model failed to load</div>';
                }
                resolve(null);
            }
        );
    });

    // ── Interaction handlers ─────────────────────────────
    function onPointerMove(event) {
        if (!carModel || interactiveParts.length === 0) return;

        const rect = canvas.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(interactiveParts, false);

        // Reset previously hovered
        if (hoveredPart && (!intersects.length || intersects[0].object !== hoveredPart)) {
            if (hoveredPart !== highlightedPart) {
                resetMaterial(hoveredPart);
            }
            hoveredPart = null;
            canvas.style.cursor = 'grab';
            if (tooltip) tooltip.style.opacity = '0';
        }

        if (intersects.length > 0) {
            const obj = intersects[0].object;
            if (obj !== highlightedPart) {
                hoveredPart = obj;
                highlightHover(obj);
                canvas.style.cursor = 'pointer';
                if (tooltip) {
                    const partName = formatPartName(obj.name || 'Component');
                    tooltip.textContent = `🔍 ${partName}`;
                    tooltip.style.opacity = '1';
                    tooltip.style.left = (event.clientX - rect.left) + 'px';
                    tooltip.style.top = (event.clientY - rect.top - 40) + 'px';
                }
            }
        }
    }

    function onClick(event) {
        if (!carModel || interactiveParts.length === 0) return;

        const rect = canvas.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(interactiveParts, false);

        if (intersects.length > 0) {
            const obj = intersects[0].object;
            const partName = (obj.name || '').toLowerCase();

            // Reset previous highlight
            if (highlightedPart && highlightedPart !== obj) {
                resetMaterial(highlightedPart);
            }

            // Toggle
            if (highlightedPart === obj) {
                resetMaterial(obj);
                highlightedPart = null;
                updateInfoPanel(null);
            } else {
                highlightSelect(obj);
                highlightedPart = obj;
                updateInfoPanel(obj);
            }

            // Door interaction
            if (partName.includes('door') || partName.includes('tuer') || partName.includes('porta')) {
                toggleDoor(obj);
            }

            // Camera focus on part
            if (highlightedPart && gsap) {
                const partBox = new THREE.Box3().setFromObject(obj);
                const partCenter = partBox.getCenter(new THREE.Vector3());
                gsap.to(controls.target, {
                    x: partCenter.x, y: partCenter.y, z: partCenter.z,
                    duration: 0.8, ease: 'power2.out',
                });
            } else if (!highlightedPart && gsap && carModel) {
                const modelSize = new THREE.Box3().setFromObject(carModel).getSize(new THREE.Vector3());
                gsap.to(controls.target, {
                    x: 0, y: modelSize.y * 0.45, z: 0,
                    duration: 0.8, ease: 'power2.out',
                });
            }
        } else {
            if (highlightedPart) {
                resetMaterial(highlightedPart);
                highlightedPart = null;
                updateInfoPanel(null);
            }
        }
    }

    function highlightHover(mesh) {
        if (mesh.material && mesh.material.emissive !== undefined) {
            const mat = mesh.material.clone();
            mat.emissive = new THREE.Color('#007bff'); // Blue highlight
            mat.emissiveIntensity = 0.4;
            mesh.material = mat;
        }
    }

    function highlightSelect(mesh) {
        if (mesh.material && mesh.material.emissive !== undefined) {
            const mat = mesh.material.clone();
            mat.emissive = new THREE.Color('#007bff'); // Blue selection
            mat.emissiveIntensity = 0.8;
            mesh.material = mat;
        }
    }

    function resetMaterial(mesh) {
        const orig = originalMaterials.get(mesh.uuid);
        if (orig) {
            mesh.material = orig.clone();
        }
    }

    function toggleDoor(doorMesh) {
        doorOpen = !doorOpen;
        const targetRotation = doorOpen ? Math.PI / 3 : 0;
        if (gsap) {
            gsap.to(doorMesh.rotation, {
                y: targetRotation,
                duration: 0.8,
                ease: 'power2.inOut',
            });
        }
    }

    function formatPartName(name) {
        return name
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
            .replace(/\d+/g, '')
            .trim() || 'Component';
    }

    function updateInfoPanel(mesh) {
        const panel = container.parentElement.querySelector('.part-info-panel');
        if (!panel) return;

        if (!mesh) {
            panel.style.opacity = '0';
            panel.style.transform = 'translateY(10px)';
            return;
        }

        const name = formatPartName(mesh.name || 'Component');
        const geoInfo = mesh.geometry;
        const vertices = geoInfo ? (geoInfo.attributes.position?.count || 0) : 0;
        const material = mesh.material;
        const matType = material ? material.type.replace('Mesh', '').replace('Material', '') : 'Unknown';

        panel.querySelector('.part-name').textContent = name;
        panel.querySelector('.part-vertices').textContent = vertices.toLocaleString() + ' vertices';
        panel.querySelector('.part-material').textContent = matType + ' material';
        panel.style.opacity = '1';
        panel.style.transform = 'translateY(0)';
    }

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('click', onClick);

    // ── Animation loop ───────────────────────────────────
    let isAnimating = false;

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }

    // Start animation loop immediately
    animate();

    // ── Resize handling ──────────────────────────────────
    function onResize() {
        const newW = container.clientWidth || container.offsetWidth || 400;
        const newH = container.clientHeight || container.offsetHeight || 250;
        if (newW > 0 && newH > 0) {
            camera.aspect = newW / newH;
            camera.updateProjectionMatrix();
            renderer.setSize(newW, newH);
        }
    }

    // Schedule an initial resize after layout settles
    requestAnimationFrame(() => {
        onResize();
        // And again a bit later for safety
        setTimeout(onResize, 500);
    });

    const viewer = {
        scene,
        camera,
        renderer,
        controls,
        canvas,
        container,
        carData,
        carModel: null,
        loadPromise,
        onResize,
        setAutoRotate(val) { controls.autoRotate = val; },
    };

    loadPromise.then((model) => {
        viewer.carModel = model;
    });

    return viewer;
}

/* ── INIT ALL VIEWERS ─────────────────────────────────── */
function initExplore() {
    console.log('[Explore] Initializing explore section (viewers will lazy load)...');

    // Initialize array with nulls
    viewers.length = 0;
    for (let i = 0; i < CARS.length; i++) {
        viewers.push(null);
    }

    // Global resize
    window.addEventListener('resize', () => {
        viewers.forEach((v) => { if (v) v.onResize(); });
    });

    // GSAP scroll animations
    initScrollAnimations();

    // Card interactions
    initCardInteractions();

    console.log(`[Explore] Init complete. ${viewers.length} viewers created.`);
}

/* ── GSAP SCROLL ANIMATIONS ──────────────────────────── */
function initScrollAnimations() {
    if (!gsap || !gsap.registerPlugin) {
        console.warn('[Explore] GSAP not available, scroll animations disabled');
        return;
    }

    const ScrollTrigger = window.ScrollTrigger;
    if (ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

    gsap.from('#explore-title', {
        scrollTrigger: {
            trigger: '#explore-section',
            start: 'top 80%',
            toggleActions: 'play none none reverse',
        },
        y: 60, opacity: 0, duration: 1, ease: 'power3.out',
    });

    gsap.from('#explore-subtitle', {
        scrollTrigger: {
            trigger: '#explore-section',
            start: 'top 75%',
            toggleActions: 'play none none reverse',
        },
        y: 40, opacity: 0, duration: 1, delay: 0.2, ease: 'power3.out',
    });

    gsap.from('.explore-card', {
        scrollTrigger: {
            trigger: '.explore-cards-grid',
            start: 'top 80%',
            toggleActions: 'play none none reverse',
        },
        y: 80, opacity: 0, duration: 0.9, stagger: 0.2, ease: 'power3.out',
    });

    gsap.from('.explore-interaction-hint', {
        scrollTrigger: {
            trigger: '.explore-cards-grid',
            start: 'top 60%',
            toggleActions: 'play none none reverse',
        },
        y: 20, opacity: 0, duration: 0.8, delay: 0.8, ease: 'power2.out',
    });
}

/* ── CARD INTERACTIONS ────────────────────────────────── */
function initCardInteractions() {
    const cards = document.querySelectorAll('.explore-card');

    cards.forEach((card, i) => {
        const toggleFull = (e) => {
            e.stopPropagation();
            toggleFullscreen(card, i);
        };

        const fullscreenBtn = card.querySelector('.btn-fullscreen');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', toggleFull);
        }

        const thumbnailBtn = card.querySelector('.card-thumbnail-container');
        if (thumbnailBtn) {
            thumbnailBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const configUrl = thumbnailBtn.getAttribute('data-config-url');
                if (configUrl) {
                    window.location.href = configUrl;
                } else {
                    toggleFullscreen(card, i);
                }
            });
        }

        const resetBtn = card.querySelector('.btn-reset');
        if (resetBtn) {
            resetBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                resetView(i);
            });
        }

        const rotateBtn = card.querySelector('.btn-rotate');
        if (rotateBtn) {
            rotateBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const v = viewers[i];
                if (v) {
                    const isRotating = v.controls.autoRotate;
                    v.setAutoRotate(!isRotating);
                    rotateBtn.classList.toggle('active', !isRotating);
                }
            });
        }
    });
}

function toggleFullscreen(card, index) {
    const isFullscreen = card.classList.contains('fullscreen');

    if (isFullscreen) {
        card.classList.remove('fullscreen');
        document.body.style.overflow = '';
    } else {
        document.querySelectorAll('.explore-card.fullscreen').forEach((c) => c.classList.remove('fullscreen'));
        card.classList.add('fullscreen');
        document.body.style.overflow = 'hidden';

        // Lazy load the 3D viewer if it hasn't been created yet
        if (!viewers[index]) {
            console.log(`[Explore] Lazy loading viewer for index ${index}`);
            viewers[index] = createViewer(CARS[index], index);
        }
    }

    // Resize viewer after CSS transition
    setTimeout(() => {
        if (viewers[index]) viewers[index].onResize();
    }, 100);
}

function resetView(index) {
    const v = viewers[index];
    if (!v) return;

    const car = CARS[index];
    if (gsap) {
        gsap.to(v.camera.position, {
            x: car.cameraPos.x, y: car.cameraPos.y, z: car.cameraPos.z,
            duration: 1, ease: 'power2.inOut',
        });
        gsap.to(v.controls.target, {
            x: 0,
            y: v.carModel ? new THREE.Box3().setFromObject(v.carModel).getSize(new THREE.Vector3()).y * 0.45 : 0.5,
            z: 0,
            duration: 1, ease: 'power2.inOut',
        });
    }
}

/* ── INIT ON DOM READY ────────────────────────────────── */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExplore);
} else {
    // Module scripts are deferred, DOM should be ready
    initExplore();
}
