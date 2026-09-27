const range = document.querySelector('#range');
const targetLayer = document.querySelector('#targetLayer');
const scoreValue = document.querySelector('#score');
const targetsValue = document.querySelector('#targets');
const timeValue = document.querySelector('#time');
const startButton = document.querySelector('#startButton');
const roundLabel = document.querySelector('#roundLabel');
const message = document.querySelector('#message');
const hitFlash = document.querySelector('#hitFlash');
const crosshair = document.querySelector('#crosshair');
const footerHint = document.querySelector('#footerHint');
const imageButton = document.querySelector('#imageButton');
const imagePanel = document.querySelector('#imagePanel');
const imageInput = document.querySelector('#imageInput');
const imagePreview = document.querySelector('#imagePreview');
const imageStatus = document.querySelector('#imageStatus');
const resetImageButton = document.querySelector('#resetImageButton');
const music = new Audio('assets/jafi.mp3');
const soundFiles = {
	gunshot: 'assets/gunshot.mp3',
	hit1: 'assets/hit-sound-1.mp3',
	hit2: 'assets/hit-sound-2.mp3',
	death: 'assets/death-sound.mp3'
};

const maxEnemies = 3;
const targetHealthPoints = 3;
const targetSpawnDelay = 1300;
const targetLifetime = 7500;
let score = 0;
let targetsDown = 0;
let secondsLeft = 45;
let gameActive = false;
let countdown;
let spawnLoop;
let lastSound = 0;
let nextTargetId = 0;
let enemies = [];
let soundIndex = 0;

music.loop = true;
music.volume = 1;
music.preload = 'auto';

const soundPools = Object.fromEntries(Object.entries(soundFiles).map(([name, file]) => [name, Array.from({ length: 4 }, () => {
	const sound = new Audio(file);
	sound.preload = 'auto';
	sound.volume = name === 'gunshot' ? 0.25 : 0.35;
	sound.load();
	return sound;
})]));

const DEFAULT_TARGET_IMAGE = 'assets/enemy.png';
const TARGET_IMAGE_KEY = 'hakla-hunt-target-image';
const MAX_IMAGE_SIZE = 512;
let targetImageSrc = DEFAULT_TARGET_IMAGE;

function setStatus(text, ok) {
	imageStatus.textContent = text;
	imageStatus.classList.toggle('ok', Boolean(ok));
	if (text) setTimeout(() => { if (imageStatus.textContent === text) imageStatus.textContent = ''; }, 2600);
}

function syncTargetImage() {
	targetLayer.querySelectorAll('.target > img:not(.blood)').forEach((img) => { img.src = targetImageSrc; });
	imagePreview.src = targetImageSrc;
}

function saveTargetImage(dataUrl) {
	try {
		localStorage.setItem(TARGET_IMAGE_KEY, dataUrl);
		setStatus('Saved', true);
	} catch (error) {
		setStatus('Too large for storage', false);
	}
}

function applyTargetImage(dataUrl) {
	targetImageSrc = dataUrl;
	syncTargetImage();
	saveTargetImage(dataUrl);
}

function resizeImage(dataUrl, done) {
	const img = new Image();
	img.onload = () => {
		const scale = Math.min(1, MAX_IMAGE_SIZE / Math.max(img.width, img.height));
		const width = Math.max(1, Math.round(img.width * scale));
		const height = Math.max(1, Math.round(img.height * scale));
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d');
		ctx.drawImage(img, 0, 0, width, height);
		let output = canvas.toDataURL('image/png');
		if (output.length > 900000) output = canvas.toDataURL('image/jpeg', 0.85);
		done(output);
	};
	img.onerror = () => setStatus('Could not read image', false);
	img.src = dataUrl;
}

function handleImageFile(file) {
	if (!file) return;
	if (!file.type.startsWith('image/')) { setStatus('Not an image', false); return; }
	setStatus('Loading...');
	const reader = new FileReader();
	reader.onerror = () => setStatus('Could not read file', false);
	reader.onload = () => resizeImage(reader.result, (output) => { applyTargetImage(output); setStatus('Applied', true); });
	reader.readAsDataURL(file);
}

function resetTargetImage() {
	targetImageSrc = DEFAULT_TARGET_IMAGE;
	syncTargetImage();
	try { localStorage.removeItem(TARGET_IMAGE_KEY); } catch (error) {}
	imageInput.value = '';
	setStatus('Default restored', true);
}

function loadTargetImage() {
	try {
		const saved = localStorage.getItem(TARGET_IMAGE_KEY);
		if (saved && saved.startsWith('data:image/')) targetImageSrc = saved;
	} catch (error) {}
	syncTargetImage();
}

imageButton.addEventListener('click', () => {
	const open = imagePanel.hidden;
	imagePanel.hidden = !open;
	imageButton.setAttribute('aria-expanded', String(open));
});
document.addEventListener('pointerdown', (event) => {
	if (imagePanel.hidden || imagePanel.contains(event.target) || imageButton.contains(event.target)) return;
	imagePanel.hidden = true;
	imageButton.setAttribute('aria-expanded', 'false');
});
imageInput.addEventListener('change', () => handleImageFile(imageInput.files[0]));
resetImageButton.addEventListener('click', resetTargetImage);
loadTargetImage();

function setText(element, value) { element.textContent = String(value).padStart(2, '0'); }

function playSound(name) {
	const pool = soundPools[name];
	const sound = pool[soundIndex % pool.length];
	soundIndex += 1;
	sound.pause();
	sound.currentTime = 0;
	sound.play().catch(() => {});
}

function moveTarget(target) {
	const bounds = range.getBoundingClientRect();
	const targetSize = target.element.getBoundingClientRect().width;
	const x = targetSize / 2 + Math.random() * (bounds.width - targetSize);
	const y = 90 + Math.random() * Math.max(40, bounds.height - targetSize - 115);
	target.element.style.left = `${x}px`;
	target.element.style.top = `${y}px`;
}

function updateHealth(target) {
	[...target.element.querySelectorAll('.health i')].forEach((bar, index) => {
		bar.classList.toggle('empty', index >= target.health);
	});
}

function removeTarget(target) {
	const index = enemies.indexOf(target);
	if (index === -1) return;
	enemies.splice(index, 1);
	target.element.remove();
	if (gameActive) createTarget();
}

function createTarget() {
	if (!gameActive || enemies.length >= maxEnemies) return;
	const target = { id: nextTargetId++, health: targetHealthPoints, element: document.createElement('div') };
	target.element.className = 'target';
	target.element.setAttribute('role', 'button');
	target.element.setAttribute('aria-label', 'Shoot enemy');
	target.element.tabIndex = 0;
	target.element.innerHTML = `<div class="health" aria-label="Target health"><i></i><i></i><i></i></div><img src="${targetImageSrc}" alt="Enemy target"><img class="blood" src="assets/blood.png" alt="">`;
	targetLayer.append(target.element);
	enemies.push(target);
	moveTarget(target);
	setTimeout(() => removeTarget(target), targetLifetime);
}

function resetRound() {
	enemies.forEach((target) => target.element.remove());
	enemies = [];
	score = 0;
	targetsDown = 0;
	secondsLeft = 45;
	setText(scoreValue, score);
	setText(targetsValue, targetsDown);
	timeValue.textContent = secondsLeft;
}

function startRound() {
	clearInterval(countdown);
	clearInterval(spawnLoop);
	resetRound();
	gameActive = true;
	roundLabel.textContent = 'Round in progress';
	document.body.classList.add('is-live');
	startButton.textContent = 'Restart round';
	footerHint.textContent = 'Tap or click an enemy';
	message.classList.add('hidden');
	createTarget();
	createTarget();
	spawnLoop = setInterval(createTarget, targetSpawnDelay);
	music.currentTime = 0;
	music.play().catch(() => { footerHint.textContent = 'Tap or click to enable sound'; });
	countdown = setInterval(() => {
		secondsLeft -= 1;
		timeValue.textContent = secondsLeft;
		if (secondsLeft <= 0) endRound();
	}, 1000);
}

function endRound() {
	gameActive = false;
	clearInterval(countdown);
	clearInterval(spawnLoop);
	music.pause();
	roundLabel.textContent = 'Round complete';
	document.body.classList.remove('is-live');
	startButton.textContent = 'Play again';
	message.textContent = `Final score ${String(score).padStart(2, '0')} - nice shooting`;
	message.classList.remove('hidden');
}

function registerShot(event, target) {
	if (!gameActive) return;
	const rangeRect = range.getBoundingClientRect();
	crosshair.style.left = `${event.clientX - rangeRect.left}px`;
	crosshair.style.top = `${event.clientY - rangeRect.top}px`;
	hitFlash.style.left = `${event.clientX - rangeRect.left}px`;
	hitFlash.style.top = `${event.clientY - rangeRect.top}px`;
	hitFlash.classList.remove('show');
	void hitFlash.offsetWidth;
	hitFlash.classList.add('show');
	playSound('gunshot');
	if (!target) return;
	target.health -= 1;
	updateHealth(target);
	target.element.classList.remove('hit');
	void target.element.offsetWidth;
	target.element.classList.add('hit');
	playSound(lastSound === 0 ? 'hit1' : 'hit2');
	lastSound = 1 - lastSound;
	if (target.health <= 0) {
		target.element.classList.add('dying');
		score += 1;
		targetsDown += 1;
		setText(scoreValue, score);
		setText(targetsValue, targetsDown);
		playSound('death');
		setTimeout(() => removeTarget(target), 450);
	}
}

range.addEventListener('pointermove', (event) => {
	const bounds = range.getBoundingClientRect();
	crosshair.style.left = `${event.clientX - bounds.left}px`;
	crosshair.style.top = `${event.clientY - bounds.top}px`;
});
range.addEventListener('pointerdown', (event) => registerShot(event, null));
targetLayer.addEventListener('pointerdown', (event) => {
	event.stopPropagation();
	const element = event.target.closest('.target');
	const target = enemies.find((item) => item.element === element);
	if (target) registerShot(event, target);
});
targetLayer.addEventListener('keydown', (event) => {
	if (event.key !== 'Enter' && event.key !== ' ') return;
	const target = enemies.find((item) => item.element === event.target);
	if (target) registerShot({ clientX: target.element.getBoundingClientRect().x, clientY: target.element.getBoundingClientRect().y }, target);
});
startButton.addEventListener('click', startRound);
document.addEventListener('keydown', (event) => { if (event.key === 'Enter' && document.activeElement !== startButton) startRound(); });
window.addEventListener('resize', () => enemies.forEach(moveTarget));
