// === CVI Field Engine v8 — Sons .wav + Effet maladie réaliste + Séquencement strict ===

let scene, camera, renderer, plant, field;
let hasPlanted = false, hasWatered = false, hasFertilized = false, hasCured = false;
let growthStage = 0;
let isDragging = false;
let mouseX = 0, targetRotation = 0, currentRotation = 0;
let isDiseased = false;
let growthInterval = null;
let currentStep = "seed";
const notifications = document.getElementById("notifications");

// 🎵 Préchargement des sons (avec volume équilibré)
const sounds = {
  plant: Object.assign(new Audio("sounds/plant.wav"), { volume: 0.7 }),
  water: Object.assign(new Audio("sounds/water.wav"), { volume: 0.6 }),
  fertilizer: Object.assign(new Audio("sounds/fertilizer.wav"), { volume: 0.7 }),
  disease: Object.assign(new Audio("sounds/disease.wav"), { volume: 0.8 }),
  heal: Object.assign(new Audio("sounds/heal.wav"), { volume: 0.7 }),
  harvest: Object.assign(new Audio("sounds/harvest.wav"), { volume: 0.8 }),
};

init();
animate();

function playSound(name) {
  const sound = sounds[name];
  if (sound) {
    sound.currentTime = 0;
    sound.play().catch(() => {}); // éviter erreur navigateur
  }
}

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xaee1a3);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / (0.7 * window.innerHeight), 0.1, 1000);
  camera.position.set(0, 8, 22);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, 0.7 * window.innerHeight);
  document.getElementById("container").appendChild(renderer.domElement);

  const light = new THREE.DirectionalLight(0xffffff, 1.2);
  light.position.set(15, 30, 10);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xaaaaaa));

  const texture = new THREE.TextureLoader().load('https://i.ibb.co/Sd2dJvP/sandy-soil.jpg');
  const groundGeo = new THREE.PlaneGeometry(30, 30, 32, 32);
  const groundMat = new THREE.MeshStandardMaterial({ map: texture, roughness: 1 });
  field = new THREE.Mesh(groundGeo, groundMat);
  field.rotation.x = -Math.PI / 2;
  scene.add(field);

  const container = document.getElementById("container");
  container.addEventListener("mousedown", e => { isDragging = true; mouseX = e.clientX; });
  container.addEventListener("mouseup", () => { isDragging = false; });
  container.addEventListener("mousemove", e => {
    if (isDragging) {
      targetRotation += (e.clientX - mouseX) * 0.005;
      mouseX = e.clientX;
    }
  });

  // 🖱️ Activation du son au premier clic
  window.addEventListener("click", () => {
    Object.values(sounds).forEach(s => s.play().then(() => s.pause()).catch(()=>{}));
  }, { once: true });

  // 🔧 Gestion des outils
  document.querySelectorAll(".tool").forEach(tool => {
    tool.addEventListener("dragstart", e => e.dataTransfer.setData("tool", tool.id));
  });

  renderer.domElement.addEventListener("dragover", e => e.preventDefault());
  renderer.domElement.addEventListener("drop", e => {
    e.preventDefault();
    const toolId = e.dataTransfer.getData("tool");
    handleTool(toolId);
  });

  showMessage("💡 Glissez la graine 🌱 sur le champ pour planter du maïs !");
}

function handleTool(toolId) {
  if (isDiseased && toolId !== "cureTool") {
    showMessage("⚠️ La plante est malade ! Soignez-la avant de continuer 🧪");
    playSound("disease");
    return;
  }

  switch (toolId) {
    case "seedTool":
      if (currentStep !== "seed") return showMessage("🚫 Ce n'est pas encore le moment de semer !");
      if (hasPlanted) return showMessage("❌ Le maïs est déjà planté !");
      createRealisticCorn();
      playSound("plant");
      hasPlanted = true;
      currentStep = "water";
      showMessage("🌱 Graine plantée ! Patientez quelques secondes...");
      setTimeout(() => showMessage("💧 Maintenant, arrosez la plante !"), 3000);
      break;

    case "waterTool":
      if (currentStep !== "water") return showMessage("🚫 Ce n'est pas encore le moment d'arroser !");
      if (hasWatered) return showMessage("❌ La plante a déjà été arrosée !");
      playSound("water");
      hasWatered = true;
      currentStep = "fertilizer";
      showMessage("💧 Arrosage réussi ! Patientez un moment...");
      setTimeout(() => showMessage("🌿 Vous pouvez maintenant ajouter l'engrais !"), 3000);
      break;

    case "fertilizerTool":
      if (currentStep !== "fertilizer") return showMessage("🚫 Vous ne pouvez pas encore ajouter d'engrais !");
      if (hasFertilized) return showMessage("❌ L'engrais a déjà été ajouté !");
      playSound("fertilizer");
      hasFertilized = true;
      currentStep = "growth";
      showMessage("🌿 Engrais ajouté ! La croissance commence...");
      startGrowth();
      break;

    case "cureTool":
      if (!isDiseased) return showMessage("🧪 Aucun signe de maladie pour le moment !");
      playSound("heal");
      healPlant();
      isDiseased = false;
      hasCured = true;
      currentStep = "growth";
      showMessage("🌱 Traitement appliqué, la plante est de nouveau saine !");
      setTimeout(() => showMessage("🌾 Croissance relancée..."), 2000);
      startGrowth();
      break;

    default:
      showMessage("🤔 Outil inconnu !");
  }
}

function createRealisticCorn() {
  const group = new THREE.Group();

  for (let i = 0; i < 10; i++) {
    const segmentHeight = 0.35;
    const color = new THREE.Color().setHSL(0.33, 0.8, 0.3 + i * 0.04);
    const stalkGeo = new THREE.CylinderGeometry(0.12, 0.14, segmentHeight, 12);
    const stalkMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });
    const segment = new THREE.Mesh(stalkGeo, stalkMat);
    segment.position.y = segmentHeight / 2 + i * segmentHeight;
    group.add(segment);
  }

  for (let i = 0; i < 12; i++) {
    const leafGeo = new THREE.PlaneGeometry(0.4, 1.4, 1, 8);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2ecc71, side: THREE.DoubleSide });
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.rotation.y = (i % 2 === 0 ? 1 : -1) * Math.PI / 2.5;
    leaf.position.set((i % 2 === 0 ? 0.3 : -0.3), 0.5 + i * 0.3, 0);
    const pos = leaf.geometry.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      const y = pos.getY(v);
      pos.setZ(v, Math.sin(y * 2) * 0.2);
    }
    pos.needsUpdate = true;
    group.add(leaf);
  }

  group.position.set(0, 0, 0);
  scene.add(group);
  plant = group;
}

function startGrowth() {
  if (growthInterval) clearInterval(growthInterval);

  growthInterval = setInterval(() => {
    if (isDiseased) {
      clearInterval(growthInterval);
      return;
    }

    if (growthStage >= 5) {
      addCornCobs();
      playSound("harvest");
      showMessage("🌽 Le maïs est mature ! Vous pouvez récolter !");
      clearInterval(growthInterval);
    } else {
      growPlant();
    }
  }, 5000);
}

function growPlant() {
  growthStage++;
  plant.scale.y += 0.5;
  plant.position.y += 0.3;

  if (growthStage === 3 && !hasCured) {
    applyDiseaseEffect();
    playSound("disease");
    isDiseased = true;
    currentStep = "cure";
    showMessage("⚠️ Feuilles jaunissent et rougissent : appliquez le traitement 🧪 !");
    clearInterval(growthInterval);
    return;
  }

  showMessage(`🌱 Croissance : étape ${growthStage}/5`);
}

function applyDiseaseEffect() {
  let intensity = 0;
  const flicker = setInterval(() => {
    if (!isDiseased) return clearInterval(flicker);
    intensity = (intensity + 1) % 2;
    plant.traverse(obj => {
      if (obj.isMesh && obj.material.color) {
        obj.material.color.setRGB(intensity ? 0.9 : 0.8, 0.3, 0.1);
      }
    });
  }, 500);
}

function healPlant() {
  plant.traverse(obj => {
    if (obj.isMesh && obj.material.color) {
      obj.material.color.set(0x2ecc71);
    }
  });
}

function addCornCobs() {
  const cobGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.6, 16);
  const cobMat = new THREE.MeshStandardMaterial({ color: 0xffe066, roughness: 0.3 });
  const cob1 = new THREE.Mesh(cobGeo, cobMat);
  const cob2 = cob1.clone();
  cob1.position.set(0.3, 4.5, 0);
  cob2.position.set(-0.3, 4.3, 0);
  plant.add(cob1, cob2);
}

function showMessage(msg) {
  notifications.textContent = msg;
}

function animate() {
  requestAnimationFrame(animate);
  currentRotation += (targetRotation - currentRotation) * 0.1;
  scene.rotation.y = currentRotation;
  renderer.render(scene, camera);
}
