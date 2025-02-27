// script.js

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.126.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.126.0/examples/jsm/loaders/GLTFLoader.js';

// ************************************
// הגדרות ראשוניות וכלים עזר
// ************************************
const randomColor = () => Math.floor(Math.random() * 0xffffff);
const textureLoader = new THREE.TextureLoader();

// ************************************
// ממשק משתמש (UI Overlays)
// ************************************
function createUI() {
  const altitudeDisplay = document.createElement('div');
  altitudeDisplay.id = 'altitude';
  altitudeDisplay.style.cssText = `
        position: absolute; top: 10px; left: 10px; padding: 8px;
        background-color: rgba(0, 0, 0, 0.5); color: #fff;
        font-family: Arial, sans-serif; z-index: 9999;
    `;
  document.body.appendChild(altitudeDisplay);

  const scoreDisplay = document.createElement('div');
  scoreDisplay.id = 'score';
  scoreDisplay.style.cssText = `
        position: absolute; top: 50px; left: 10px; padding: 8px;
        background-color: rgba(0, 0, 0, 0.5); color: #fff;
        font-family: Arial, sans-serif; z-index: 9999;
    `;
  document.body.appendChild(scoreDisplay);

  const crashOverlay = document.createElement('div');
  crashOverlay.id = 'crash';
  crashOverlay.style.cssText = `
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        padding: 20px; background-color: rgba(255, 0, 0, 0.7); color: #fff;
        font-family: Arial, sans-serif; font-size: 24px; z-index: 9999; display: none;
    `;
  crashOverlay.innerHTML = "התרסקת! לחץ R לאיתחול";
  document.body.appendChild(crashOverlay);

  return { altitudeDisplay, scoreDisplay, crashOverlay };
}

const ui = createUI();

// ************************************
// יצירת הסצנה, המצלמה והרנדרר
// ************************************
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ************************************
// תאורה
// ************************************
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 1, 1).normalize();
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

// ************************************
// שחקן (מטוס)
// ************************************
const player = new THREE.Object3D();
player.position.set(0, 0, 0);

scene.add(player);

const loader = new GLTFLoader();
loader.load(
  'assets/planes/747/airplane.gltf',
  (gltf) => {
    const airplane = gltf.scene;
    airplane.scale.set(40, 40, 40);
    airplane.rotation.set(0, Math.PI, 0);
    airplane.rotation.z = 0;
    airplane.rotation.y = Math.PI;
    airplane.position.set(0, 0, 0);
    
    scene.add(airplane);
    player.add(airplane);
    console.log('המודל נטען בהצלחה:', gltf);
  },
  undefined,
  (error) => console.error('שגיאה בטעינת airplane.gltf:', error)
);

// ************************************
// קרקע ומסלול המראה
// ************************************
function createGroundAndRunway() {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(10000, 10000),
    new THREE.MeshBasicMaterial({ color: 0x01af10 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const groundCollision = new THREE.Mesh(
    new THREE.BoxGeometry(10000, 1, 10000),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  groundCollision.position.y = -0.5;
  scene.add(groundCollision);

  const runway = new THREE.Mesh(
    new THREE.BoxGeometry(10, 0.1, 100),
    new THREE.MeshBasicMaterial({ color: 0xaaaaaa })
  );
  runway.position.y = 0.05;
  scene.add(runway);

  const runwayLine = new THREE.Mesh(
    new THREE.PlaneGeometry(0.2, 90),
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
  );
  runwayLine.rotation.x = -Math.PI / 2;
  runwayLine.position.y = 0.06;
  scene.add(runwayLine);

  return { groundCollision, runway };
}

const { groundCollision, runway } = createGroundAndRunway();

// ************************************
// סביבה (כבישים, גבעות, מים, אזורי מגורים)
// ************************************
function populateEnvironment() {
  const roadGeometry = new THREE.PlaneGeometry(10, 60);
  const roadMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });

  for (let i = -10; i <= 10; i++) {
    for (let j = -10; j <= 10; j++) {
      const posX = i * 30;
      const posZ = j * 30;
      if (posX >= -5 && posX <= 5 && posZ >= -50 && posZ <= 50) continue;

      if (Math.random() < 0.5) {
        const height = Math.random() * 45 + 5;
        const building = new THREE.Mesh(
          new THREE.BoxGeometry(8, height, 8),
          new THREE.MeshBasicMaterial({ color: randomColor() })
        );
        building.position.set(posX, height / 2, posZ);
        scene.add(building);
      } else {
        const road = new THREE.Mesh(roadGeometry, roadMaterial);
        road.rotation.x = -Math.PI / 2;
        road.position.set(posX, 0.1, posZ);
        scene.add(road);
      }
    }
  }

  const hillGeometry = new THREE.SphereGeometry(10, 32, 32);
  const hillMaterial = new THREE.MeshBasicMaterial({ color: 0x228B22 });
  for (let i = -10; i <= 10; i++) {
    for (let j = -10; j <= 10; j++) {
      if (Math.random() < 0.1) {
        const hill = new THREE.Mesh(hillGeometry, hillMaterial);
        hill.position.set(i * 30, 5, j * 30);
        scene.add(hill);
      }
    }
  }

  const waterGeometry = new THREE.PlaneGeometry(20, 20);
  const waterMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.5 });
  for (let i = -10; i <= 10; i++) {
    for (let j = -10; j <= 10; j++) {
      if (Math.random() < 0.05) {
        const water = new THREE.Mesh(waterGeometry, waterMaterial);
        water.rotation.x = -Math.PI / 2;
        water.position.set(i * 30, 0.1, j * 30);
        scene.add(water);
      }
    }
  }
}

populateEnvironment();

// ************************************
// גורדי שחקים דינמיים
// ************************************
const buildings = new Map();
const gridSize = 30;
const renderDistance = 25;
const removeDistance = 35;

function updateBuildings() {
  const playerI = Math.floor(player.position.x / gridSize);
  const playerJ = Math.floor(player.position.z / gridSize);

  for (let i = playerI - renderDistance; i <= playerI + renderDistance; i++) {
    for (let j = playerJ - renderDistance; j <= playerJ + renderDistance; j++) {
      const key = `${i},${j}`;
      if (!buildings.has(key) && !(i === 0 && j >= -5 && j <= 5)) {
        if (Math.random() < 0.7) {
          const height = Math.random() * 85 + 5;
          const building = new THREE.Mesh(
            new THREE.BoxGeometry(10, height, 8),
            new THREE.MeshBasicMaterial({ color: randomColor() })
          );
          building.position.set(i * gridSize, height / 2, j * gridSize);
          scene.add(building);
          buildings.set(key, building);
        } else {
          buildings.set(key, null);
        }
      }
    }
  }

  const keysToRemove = [];
  buildings.forEach((building, key) => {
    if (!building) return;
    const [i, j] = key.split(',').map(Number);
    if (Math.abs(i - playerI) > removeDistance || Math.abs(j - playerJ) > removeDistance) {
      scene.remove(building);
      building.geometry.dispose();
      building.material.dispose();
      keysToRemove.push(key);
    }
  });
  keysToRemove.forEach((key) => buildings.delete(key));
}

// ************************************
// שמיים ועננים
// ************************************
let skyDome;
textureLoader.load(
  'assets/images/stars.png',
  (texture) => {
    skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(9000, 32, 32),
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide, transparent: true })
    );
    skyDome.visible = false;
    scene.add(skyDome);
  },
  undefined,
  (error) => console.error('שגיאה בטעינת stars.png:', error)
);

const clouds = [];
textureLoader.load(
  'assets/images/clouds.png',
  (texture) => {
    for (let i = 0; i < 30; i++) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: texture, transparent: true })
      );
      sprite.scale.set(80, 50, 1);
      sprite.position.set(
        (Math.random() - 0.5) * 2000,
        20 + Math.random() * 30,
        (Math.random() - 0.5) * 2000
      );
      clouds.push(sprite);
      scene.add(sprite);
    }
  },
  undefined,
  (error) => console.error('שגיאה בטעינת clouds.png:', error)
);

// ************************************
// מתנות ו-Powerups
// ************************************
let gifts = [];
function createGifts(count = 20) {
  gifts.forEach((gift) => scene.remove(gift));
  gifts = [];
  for (let i = 0; i < count; i++) {
    const gift = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xffff00 })
    );
    gift.position.set(
      (Math.random() - 0.5) * 1000,
      5 + Math.random() * 30,
      (Math.random() - 0.5) * 1000
    );
    scene.add(gift);
    gifts.push(gift);
  }
}

let activePowerup = null;
let powerupTimer = 0;
function applyPowerup() {
  const rand = Math.random();
  activePowerup = rand < 0.5 ? 'speedBoost' : 'doublePoints';
  powerupTimer = 300;
}

createGifts();

// ************************************
// בקרות ומצב
// ************************************
const keys = {};
window.addEventListener('keydown', (e) => (keys[e.key] = true));
window.addEventListener('keyup', (e) => (keys[e.key] = false));

let speed = 0;
const maxSpeed = 0.2;
const minSpeed = 0;
const gravity = 0.01;
let score = 0;
let crashed = false;
let isDay = true;
let timeOfDay = 0;
const cameraModes = ['third', 'first', 'thirdFar'];
let cameraModeIndex = 0;
let lastC = false;
let lastN = false;

// ************************************
// לולאת האנימציה
// ************************************
function animate() {
  requestAnimationFrame(animate);

  if (!crashed) {
    updateBuildings();

    if (keys['a']) player.rotation.z += 0.01;
    if (keys['d']) player.rotation.z -= 0.01;
    if (keys['w']) player.rotation.x -= 0.01;
    if (keys['s']) player.rotation.x += 0.01;
    if (keys['q']) player.rotation.y += 0.01;
    if (keys['e']) player.rotation.y -= 0.01;

    if (keys['ArrowUp']) speed = Math.min(maxSpeed, speed + 0.001);
    if (keys['ArrowDown']) speed = Math.max(minSpeed, speed - 0.001);

    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(player.quaternion);
    player.position.add(direction.multiplyScalar(speed));
    player.position.y -= gravity;
    if (player.position.y < 0.9) player.position.y = 0.9;

    const playerBox = new THREE.Box3().setFromObject(player);
    const nearbyBuildings = [groundCollision, runway, ...Array.from(buildings.values()).filter(Boolean)];
    let collided = false;

    nearbyBuildings.forEach((obj) => {
      const objBox = new THREE.Box3().setFromObject(obj);
      if (playerBox.intersectsBox(objBox) && obj !== groundCollision && obj !== runway) {
        collided = true;
      }
    });

    if (collided) {
      crashed = true;
      speed = 0;
      ui.crashOverlay.style.display = 'block';
    }

    gifts = gifts.filter((gift) => {
      const giftBox = new THREE.Box3().setFromObject(gift);
      if (playerBox.intersectsBox(giftBox)) {
        scene.remove(gift);
        score += activePowerup === 'doublePoints' ? 20 : 10;
        applyPowerup();
        return false;
      }
      return true;
    });

    if (activePowerup) {
      powerupTimer--;
      if (powerupTimer <= 0) activePowerup = null;
      if (activePowerup === 'speedBoost') speed = maxSpeed;
    }
  } else if (keys['r']) {
    resetSimulator();
  }

  timeOfDay += 0.001;
  const cycle = Math.sin(timeOfDay);
  if (cycle > 0 && !isDay) {
    isDay = true;
    scene.background = new THREE.Color(0x87CEEB);
    if (skyDome) skyDome.visible = false;
    directionalLight.intensity = 1;
    ambientLight.intensity = 0.7;
  } else if (cycle <= 0 && isDay) {
    isDay = false;
    scene.background = new THREE.Color(0x000000);
    if (skyDome) skyDome.visible = true;
    directionalLight.intensity = 0.3;
    ambientLight.intensity = 0.2;
  }

  if (keys['n'] && !lastN) {
    isDay = !isDay;
    scene.background = new THREE.Color(isDay ? 0x87CEEB : 0x000000);
    if (skyDome) skyDome.visible = !isDay;
    directionalLight.intensity = isDay ? 1 : 0.3;
    ambientLight.intensity = isDay ? 0.7 : 0.2;
  }
  lastN = keys['n'];

  if (keys['c'] && !lastC) cameraModeIndex = (cameraModeIndex + 1) % cameraModes.length;
  lastC = keys['c'];

  const mode = cameraModes[cameraModeIndex];
  if (mode === 'third') {
    const offset = new THREE.Vector3(4, 5, 10).applyQuaternion(player.quaternion);
    camera.position.copy(player.position).add(offset);
    camera.lookAt(player.position);
  } else if (mode === 'first') {
    camera.position.copy(player.position);
    camera.quaternion.copy(player.quaternion);
  } else {
    const offset = new THREE.Vector3(0, 2, 15).applyQuaternion(player.quaternion);
    camera.position.copy(player.position).add(offset);
    camera.lookAt(player.position);
  }

  scene.fog = new THREE.Fog(0xcccccc, 40, 500);

  ui.altitudeDisplay.innerText = `גובה: ${player.position.y.toFixed(2)} מ'`;
  ui.scoreDisplay.innerText = `ניקוד: ${score}`;

  renderer.render(scene, camera);
}

function resetSimulator() {
  crashed = false;
  speed = 0;
  player.position.set(0, 0.9, 40);
  player.rotation.set(0, 0, 0);
  ui.crashOverlay.style.display = 'none';
  score = 0;
  activePowerup = null;
  powerupTimer = 0;
  createGifts();
}

animate();

// ************************************
// התאמה לגודל חלון
// ************************************
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});