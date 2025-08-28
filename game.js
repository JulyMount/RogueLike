const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameContainer = document.getElementById('game-container');

// HUD Elements
const healthDisplay = document.getElementById('health');
const xpTextDisplay = document.getElementById('xp-text');
const powerUpDisplay = document.getElementById('power-up');
const bossHud = document.getElementById('boss-hud');
const bossHealthBar = document.getElementById('boss-health-bar');
const bossPhaseIcons = document.getElementById('boss-phase-icons');

// Screen Elements
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const finalScoreDisplay = document.getElementById('final-score');

let gameLoopId;
let gameRunning = false;

// Game constants
const GRAVITY = 0.6;
const JUMP_FORCE = -14;
const PLAYER_SPEED = 5;
const STOMP_BOUNCE = -7;
const TILE_SIZE = 50;
const COYOTE_TIME_FRAMES = 8;
const JUMP_BUFFER_FRAMES = 8;
const MAX_FALL_SPEED = 18;

// --- SISTEMA DE BOSS E BATALHA ---
const BOSS_SCORE_MINIMUM = 20;
const CHUNK_SIZE = 15;
let isBossEligible;
let roomsGeneratedThisChunk;
let canEnterDoor = false;
let isBossFightActive = false;
let transitionState = 'none';
let transitionAlpha = 0;
let transitionColor = 'black'; // Novo: controla a cor da transição

let player, keys, camera, platforms, items, enemies, projectiles, particles, hudParticles, gravestones, decorations, boss;
let circularShockwaves;
let generationCursor;
let xpShakeTimer = 0;

const defaultBgColor = { r: 13, g: 26, b: 46 };
let currentBgColor = { ...defaultBgColor };
let targetBgColor = { ...defaultBgColor };
let bgFlashTimer = 0;

const roomTemplates = { 'start': {width: 4 * TILE_SIZE, platforms: [{ x: 0, y: 0, width: 4 * TILE_SIZE }], exit: { x: 4 * TILE_SIZE, y: 0 }}, 'corridor': {width: 8 * TILE_SIZE, platforms: [{ x: 0, y: 0, width: 8 * TILE_SIZE }], exit: { x: 8 * TILE_SIZE, y: 0 }}, 'gap': {width: 8 * TILE_SIZE, platforms: [{ x: 0, y: 0, width: 3 * TILE_SIZE }, { x: 5 * TILE_SIZE, y: 0, width: 3 * TILE_SIZE }], exit: { x: 8 * TILE_SIZE, y: 0 }}, 'multi_level': {width: 12 * TILE_SIZE, platforms: [{ x: 0, y: 0, width: 12 * TILE_SIZE }, { x: 2 * TILE_SIZE, y: -4 * TILE_SIZE, width: 8 * TILE_SIZE }], exit: { x: 12 * TILE_SIZE, y: 0 }}, 'climb': {width: 10 * TILE_SIZE, platforms: [{ x: 0, y: 0, width: 3 * TILE_SIZE }, { x: 4 * TILE_SIZE, y: -2.5 * TILE_SIZE, width: 2 * TILE_SIZE }, { x: 7 * TILE_SIZE, y: -5 * TILE_SIZE, width: 3 * TILE_SIZE }], exit: { x: 10 * TILE_SIZE, y: -5 * TILE_SIZE }}, 'shaft': {width: 10 * TILE_SIZE, platforms: [{ x: 0, y: 0, width: 3 * TILE_SIZE }, { x: 1 * TILE_SIZE, y: 2 * TILE_SIZE, width: 2 * TILE_SIZE }, { x: 7 * TILE_SIZE, y: 4 * TILE_SIZE, width: 2 * TILE_SIZE }, { x: 1 * TILE_SIZE, y: 6 * TILE_SIZE, width: 2 * TILE_SIZE }, { x: 0, y: 8 * TILE_SIZE, width: 10 * TILE_SIZE }], exit: { x: 10 * TILE_SIZE, y: 8 * TILE_SIZE }}, 'staircase_down': {width: 12 * TILE_SIZE, platforms: [{ x: 0, y: 0, width: 3 * TILE_SIZE }, { x: 3 * TILE_SIZE, y: 1.5 * TILE_SIZE, width: 3 * TILE_SIZE }, { x: 6 * TILE_SIZE, y: 3 * TILE_SIZE, width: 3 * TILE_SIZE }, { x: 9 * TILE_SIZE, y: 4.5 * TILE_SIZE, width: 3 * TILE_SIZE }], exit: { x: 12 * TILE_SIZE, y: 4.5 * TILE_SIZE }}, 'pillar_room': {width: 15 * TILE_SIZE, platforms: [{ x: 0, y: 0, width: 15 * TILE_SIZE }, { x: 3 * TILE_SIZE, y: -3 * TILE_SIZE, width: 1.5 * TILE_SIZE }, { x: 8 * TILE_SIZE, y: -4 * TILE_SIZE, width: 1.5 * TILE_SIZE }, { x: 12 * TILE_SIZE, y: -2 * TILE_SIZE, width: 1.5 * TILE_SIZE }], exit: { x: 15 * TILE_SIZE, y: 0 }}, 'chain_jump': {width: 14 * TILE_SIZE, platforms: [{ x: 0, y: 0, width: 3 * TILE_SIZE }, { x: 4.5 * TILE_SIZE, y: -0.5 * TILE_SIZE, width: 1 * TILE_SIZE }, { x: 7 * TILE_SIZE, y: 0 * TILE_SIZE, width: 1 * TILE_SIZE }, { x: 9.5 * TILE_SIZE, y: -0.5 * TILE_SIZE, width: 1 * TILE_SIZE }, { x: 11 * TILE_SIZE, y: 0, width: 3 * TILE_SIZE }], exit: { x: 14 * TILE_SIZE, y: 0 }}, 'boss_arena': {width: 18 * TILE_SIZE, platforms: [{ x: 0, y: 0, width: 18 * TILE_SIZE }], decorations: [{ emoji: '🚪', x: (18 * TILE_SIZE / 2) - 25, y: -50 }], exit: { x: 18 * TILE_SIZE, y: 0 }} };

function resizeCanvas() { canvas.width = gameContainer.clientWidth; canvas.height = gameContainer.clientHeight; }

function init() {
    resizeCanvas();
    player = { x: 150, y: canvas.height - 200, width: 50, height: 50, vx: 0, vy: 0, speed: PLAYER_SPEED, onGround: false, facingRight: true, health: 5, maxHealth: 5, xp: 0, powerUp: null, powerUpTimer: 0, isImmune: false, canDoubleJump: false, doubleJumpUsed: false, speedMultiplier: 1, isDying: false, rotation: 0, coyoteTimeCounter: 0, jumpBufferCounter: 0 };
    keys = { right: false, left: false, jump: false };
    camera = { x: player.x, y: player.y, zoom: 1.0, targetZoom: 1.0, shakeDuration: 0, shakeMagnitude: 0, zoomOverrideTimer: 0 };
    platforms = []; items = []; enemies = []; projectiles = []; particles = []; hudParticles = []; gravestones = []; decorations = []; circularShockwaves = [];
    boss = null;
    isBossEligible = false;
    roomsGeneratedThisChunk = 0;
    isBossFightActive = false;
    canEnterDoor = false;
    transitionState = 'none';
    transitionAlpha = 0;
    transitionColor = 'black';
    generationCursor = { x: 50, y: canvas.height - 100 };
    stampRoom('start');
    for(let i = 0; i < 4; i++) { stampRoom(); }
}

function updateBossEligibility() { if (!isBossEligible && player.xp >= BOSS_SCORE_MINIMUM) { isBossEligible = true; } }
function stampRoom(roomName, canSpawnEntities = true) { // Parâmetro para controlar spawn
    let chosenRoomName; roomsGeneratedThisChunk++; if (isBossEligible && roomsGeneratedThisChunk === 1) { chosenRoomName = 'boss_arena'; } else { const templateNames = Object.keys(roomTemplates).filter(name => name !== 'start' && name !== 'boss_arena'); chosenRoomName = roomName || templateNames[Math.floor(Math.random() * templateNames.length)]; } if (roomsGeneratedThisChunk >= CHUNK_SIZE) { roomsGeneratedThisChunk = 0; } const template = roomTemplates[chosenRoomName];
    template.platforms.forEach(p_template => {
        const newPlatform = { x: generationCursor.x + p_template.x, y: generationCursor.y + p_template.y, width: p_template.width, height: 20 };
        platforms.push(newPlatform);
        if (canSpawnEntities && chosenRoomName !== 'boss_arena') {
            if (Math.random() < 0.2) spawnItem(newPlatform);
            if (Math.random() < 0.25) spawnEnemy(newPlatform);
        }
    });
    if (template.decorations) { template.decorations.forEach(d_template => { decorations.push({ emoji: d_template.emoji, x: generationCursor.x + d_template.x, y: generationCursor.y + d_template.y, width: 50, height: 100 }); }); }
    generationCursor.x += template.exit.x;
    generationCursor.y += template.exit.y;
}

function spawnItem(platform) { const itemTypes = ['xp', 'health', 'star', 'boots', 'bolt']; const weights = [0.6, 0.2, 0.05, 0.075, 0.075]; let rand = Math.random(); let type = 'xp'; let cumulativeWeight = 0; for (let i = 0; i < itemTypes.length; i++) { cumulativeWeight += weights[i]; if (rand < cumulativeWeight) { type = itemTypes[i]; break; } } if (type === 'health' && player.health >= player.maxHealth) type = 'xp'; items.push({ x: platform.x + Math.random() * (platform.width - 30), y: platform.y - 40, width: 30, height: 30, type: type }); }
function spawnEnemy(platform) { let type = ['ghost', 'flyer', 'dragon'][Math.floor(Math.random() * 3)]; if (type === 'dragon' && platform.width < TILE_SIZE * 2.5) { type = 'ghost'; } const yPos = platform.y - 45; enemies.push({ x: platform.x + Math.random() * (platform.width - 40), y: yPos, width: 40, height: 40, type: type, vx: type === 'ghost' ? (Math.random() > 0.5 ? 1 : -1) * 1.5 : 0, vy: 0, platform: platform, initialY: yPos, shootCooldown: type === 'dragon' ? 180 : 0, isWarning: false, facingDirection: -1 }); }

function startBossTransition() { transitionColor = 'black'; if (transitionState === 'none') { transitionState = 'fadingOut'; } }

// --- TRANSIÇÃO PÓS-CHEFE ---
function startEndGameTransition() {
    transitionColor = 'white';
    if (transitionState === 'none') {
        transitionState = 'fadingOut';
    }
}

function setupBossArena() {
    isBossFightActive = true;
    endPowerUp();
    const arenaCenterX = player.x; const arenaCenterY = player.y - 100;
    camera.x = arenaCenterX; camera.y = arenaCenterY; camera.targetZoom = 1.0;
    platforms = []; items = []; enemies = []; projectiles = []; particles = []; gravestones = []; decorations = [];
    const arenaWidth = canvas.width / camera.zoom; const arenaHeight = canvas.height / camera.zoom;
    const floor = { x: arenaCenterX - arenaWidth / 2, y: arenaCenterY + arenaHeight / 2 - 20, width: arenaWidth, height: 20 };
    const ceiling = { x: arenaCenterX - arenaWidth / 2, y: arenaCenterY - arenaHeight / 2, width: arenaWidth, height: 20 };
    const leftWall = { x: arenaCenterX - arenaWidth / 2, y: arenaCenterY - arenaHeight / 2, width: 20, height: arenaHeight };
    const rightWall = { x: arenaCenterX + arenaWidth / 2 - 20, y: arenaCenterY - arenaHeight / 2, width: 20, height: arenaHeight };
    platforms.push(floor, ceiling, leftWall, rightWall);
    player.x = leftWall.x + leftWall.width + 20;
    player.y = floor.y - player.height;
    player.vy = 0;
    setTimeout(spawnBoss, 2000);
}

// --- NOVA FUNÇÃO PARA RETORNAR AO JOGO ---
function setupReturnToLevel() {
    isBossFightActive = false;
    platforms = []; // Limpa a arena
    
    // Posiciona o cursor de geração na frente do jogador
    generationCursor.x = camera.x + canvas.width / 2;
    generationCursor.y = camera.y;

    // Gera um caminho seguro sem inimigos
    stampRoom(null, false);
    stampRoom(null, false);
    
    // Reposiciona o jogador na nova plataforma
    if (platforms.length > 0) {
        player.x = platforms[0].x + 50;
        player.y = platforms[0].y - player.height;
        player.vy = 0;
    }

    transitionColor = 'black'; // Reseta a cor para a próxima transição
}

function spawnBoss() {
    if (!isBossFightActive) return;
    const bossWidth = 80; const bossHeight = 80;
    const floor = platforms[0];
    boss = {
        x: camera.x + (canvas.width / 2) - bossWidth - 50,
        y: floor.y - bossHeight,
        width: bossWidth, height: bossHeight, emoji: '🦍',
        phase: 'easy',
        health: 3, maxHealthForPhase: 3,
        state: 'idle', stateTimer: 120,
        isVulnerable: false, invulnerabilityTimer: 0,
        vx: 0, vy: 0,
        targetX: 0, targetY: 0,
        groundY: floor.y - bossHeight,
        hasDoneSecondJump: false
    };
    spawnExplosionParticles(boss.x + boss.width / 2, boss.y + boss.height / 2);
}

function spawnJumpParticles(x, y) { for (let i = 0; i < 8; i++) { particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() * -3) - 1, size: Math.random() * 5 + 3, life: 30 + Math.random() * 20, color: `rgba(200, 200, 200, ${Math.random() * 0.5 + 0.3})` }); } }
function spawnExplosionParticles(x, y) { for (let i = 0; i < 20; i++) { particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, size: Math.random() * 8 + 4, life: 25 + Math.random() * 15, color: `rgba(50, 50, 50, ${Math.random() * 0.5 + 0.4})` }); } }
function spawnSpeedParticles(x, y) { particles.push({ x: x, y: y + (Math.random() - 0.5) * player.height * 0.8, vx: -player.vx * 0.2, vy: (Math.random() - 0.5) * 2, size: Math.random() * 4 + 2, life: 15 + Math.random() * 10, color: `rgba(255, 220, 0, ${Math.random() * 0.5 + 0.5})` }); }
function spawnHudParticles(x, y, color) { for (let i = 0; i < 15; i++) { hudParticles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5, size: Math.random() * 4 + 2, life: 40 + Math.random() * 20, color: `rgba(${color}, ${Math.random() * 0.6 + 0.4})` }); } }
function spawnGroundParticles(x, y) { const groundColor = { r: 74, g: 74, b: 74 }; for (let i = 0; i < 10; i++) { particles.push({ x: x + (Math.random() - 0.5) * boss.width, y: y, vx: (Math.random() - 0.5) * 3, vy: (Math.random() * -2), size: Math.random() * 4 + 2, life: 25 + Math.random() * 15, color: `rgba(${groundColor.r + Math.floor(Math.random() * 20)}, ${groundColor.g + Math.floor(Math.random() * 20)}, ${groundColor.b + Math.floor(Math.random() * 20)}, ${Math.random() * 0.5 + 0.4})` }); } }
function updateParticles(particleArray) { for (let i = particleArray.length - 1; i >= 0; i--) { const p = particleArray[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--; p.size *= 0.98; if (p.life <= 0 || p.size < 0.5) { particleArray.splice(i, 1); } } }

function updateBoss() {
    if (!boss) return;
    if (boss.stateTimer > 0) boss.stateTimer--;
    if (boss.invulnerabilityTimer > 0) boss.invulnerabilityTimer--;
    if (boss.state !== 'climbing' && boss.state !== 'on_wall' && boss.state !== 'on_ceiling') { boss.vy += GRAVITY; boss.vy = Math.min(boss.vy, MAX_FALL_SPEED); }
    boss.y += boss.vy;
    boss.x += boss.vx;
    if (boss.y > boss.groundY) {
        boss.y = boss.groundY;
        boss.vy = 0;
        if (boss.state === 'jumping' || boss.state === 'falling') {
            spawnGroundParticles(boss.x + boss.width / 2, boss.groundY + boss.height);
            boss.state = (boss.phase === 'hard' && boss.state === 'falling') ? 'landing_hard' : 'landing';
            boss.stateTimer = 30;
        }
    }
    if (boss.state === 'climbing') { if (boss.x <= camera.x - canvas.width / 2 + 20 || boss.x + boss.width >= camera.x + canvas.width / 2 - 20) { boss.vx = 0; boss.vy = -PLAYER_SPEED; boss.state = 'on_wall'; } }
    if (boss.state === 'on_wall' && boss.y <= camera.y - canvas.height / 2) { boss.vy = 0; boss.state = 'on_ceiling'; }
    switch (boss.phase) {
        case 'easy': handleBossEasyPhase(); break;
        case 'medium': handleBossMediumPhase(); break;
        case 'hard': handleBossHardPhase(); break;
    }
}

function handleBossEasyPhase() { switch (boss.state) { case 'idle': if (boss.stateTimer <= 0) { if (Math.random() < 0.5) { boss.state = 'jump_charge'; boss.stateTimer = 45; } else { boss.state = 'throw_charge'; boss.targetX = player.x; boss.stateTimer = 60; } } break; case 'jump_charge': if (boss.stateTimer <= 0) { boss.state = 'jumping'; boss.vy = JUMP_FORCE * 1.8; } break; case 'jumping': triggerBackgroundFlash({r: 100, g: 0, b: 0}, 5); break; case 'landing': if (boss.stateTimer === 29) { camera.shakeDuration = 40; camera.shakeMagnitude = 12; if (player.onGround) { takeDamage(1); } } if (boss.stateTimer <= 0) { boss.state = 'vulnerable'; boss.stateTimer = 180; boss.isVulnerable = true; } break; case 'throw_charge': if(boss.stateTimer <= 0){ boss.state = 'throw_attack'; boss.stateTimer = 30; } break; case 'throw_attack': if (boss.stateTimer === 29) { const dx = boss.targetX - (boss.x + boss.width / 2); const launchAngleRad = Math.PI / 3; const g_effective = GRAVITY * 0.5; const range = Math.max(1, Math.abs(dx)); const v0 = Math.sqrt((range * g_effective) / Math.sin(2 * launchAngleRad)); let vx = v0 * Math.cos(launchAngleRad); let vy = -v0 * Math.sin(launchAngleRad); if (dx < 0) vx *= -1; projectiles.push({ x: boss.x + boss.width / 2, y: boss.y + boss.height / 2, width: 30, height: 30, vx: vx, vy: vy, type: 'barrel' }); } if (boss.stateTimer <= 0) { boss.state = 'idle'; boss.stateTimer = 90; } break; case 'vulnerable': if (boss.stateTimer <= 0) { boss.isVulnerable = false; boss.state = 'idle'; boss.stateTimer = 120; } break; case 'transitioning': boss.health = 1; boss.maxHealthForPhase = 1; boss.phase = 'medium'; boss.state = 'idle'; boss.stateTimer = 120; camera.shakeDuration = 60; camera.shakeMagnitude = 10; spawnExplosionParticles(boss.x + boss.width / 2, boss.y + boss.height / 2); break; } }
function handleBossMediumPhase() { switch (boss.state) { case 'idle': if (boss.stateTimer <= 0) { const rand = Math.random(); if (rand < 0.4) { boss.state = 'jump_charge'; boss.stateTimer = 35; } else if (rand < 0.8) { boss.state = 'throw_charge_1'; boss.targetX = player.x; boss.stateTimer = 45; } else { boss.state = 'climb_charge'; boss.stateTimer = 60; } } break; case 'jump_charge': if (boss.stateTimer <= 0) { boss.state = 'jumping'; boss.vy = JUMP_FORCE * 1.9; } break; case 'jumping': triggerBackgroundFlash({r: 100, g: 0, b: 0}, 5); break; case 'landing': if (boss.stateTimer === 29) { camera.shakeDuration = 45; camera.shakeMagnitude = 14; if (player.onGround) { takeDamage(1); } } if (boss.stateTimer <= 0) { if (Math.random() < 0.4) { boss.state = 'jump_charge'; boss.stateTimer = 35; } else { boss.state = 'vulnerable'; boss.stateTimer = 120; boss.isVulnerable = true; } } break; case 'throw_charge_1': if(boss.stateTimer <= 0){ boss.state = 'throw_attack_1'; boss.stateTimer = 20; } break; case 'throw_attack_1': if (boss.stateTimer === 19) { const dx = player.x - (boss.x + boss.width / 2); const distance = Math.abs(dx); let initialVy = -10 - (distance * 0.015); const timeToPeak = -initialVy / (GRAVITY * 0.5); const flightTime = timeToPeak * 2.2; const vx = dx / flightTime; projectiles.push({ x: boss.x + boss.width / 2, y: boss.y + boss.height / 2, width: 30, height: 30, vx: vx, vy: initialVy, type: 'barrel' }); } if (boss.stateTimer <= 0) { boss.state = 'throw_attack_2'; boss.stateTimer = 20; } break; case 'throw_attack_2': if (boss.stateTimer === 19) { const dx = player.x - (boss.x + boss.width / 2); const distance = Math.abs(dx); let initialVy = -12 - (distance * 0.01); const timeToPeak = -initialVy / (GRAVITY * 0.5); const flightTime = timeToPeak * 2; const vx = dx / flightTime; projectiles.push({ x: boss.x + boss.width / 2, y: boss.y + boss.height / 2, width: 30, height: 30, vx: vx, vy: initialVy, type: 'barrel' }); } if (boss.stateTimer <= 0) { boss.state = 'idle'; boss.stateTimer = 75; } break; case 'climb_charge': if(boss.stateTimer <= 0){ boss.state = 'climbing'; const leftWall = platforms[2]; const rightWall = platforms[3]; const leftWallDist = Math.abs(boss.x - leftWall.x); const rightWallDist = Math.abs(boss.x - rightWall.x); boss.vx = (leftWallDist < rightWallDist) ? -PLAYER_SPEED : PLAYER_SPEED; } break; case 'climbing': boss.vx = boss.vx; break; case 'on_wall': boss.vy = -PLAYER_SPEED; break; case 'on_ceiling': boss.vx = player.x > boss.x ? PLAYER_SPEED * 0.8 : -PLAYER_SPEED * 0.8; if(Math.abs(player.x - boss.x) < 20) { boss.vx = 0; boss.state = 'falling'; } break; case 'falling': break; case 'vulnerable': if (boss.stateTimer <= 0) { boss.isVulnerable = false; boss.state = 'idle'; boss.stateTimer = 120; } break; case 'transitioning': boss.health = 2; boss.maxHealthForPhase = 2; boss.phase = 'hard'; boss.state = 'idle'; boss.stateTimer = 120; camera.shakeDuration = 60; camera.shakeMagnitude = 10; spawnExplosionParticles(boss.x + boss.width / 2, boss.y + boss.height / 2); break; } }
function handleBossHardPhase() { switch (boss.state) { case 'idle': if (boss.stateTimer <= 0) { const rand = Math.random(); if (rand < 0.33) { boss.state = 'jump_charge'; boss.stateTimer = 25; boss.hasDoneSecondJump = false; } else if (rand < 0.66) { boss.state = 'throw_charge_1'; boss.targetX = player.x; boss.stateTimer = 30; } else { boss.state = 'climb_charge'; boss.stateTimer = 50; } } break; case 'jump_charge': if (boss.stateTimer <= 0) { boss.state = 'jumping'; boss.vy = JUMP_FORCE * 2.0; } break; case 'jumping': triggerBackgroundFlash({r: 100, g: 0, b: 0}, 5); break; case 'landing': if (boss.stateTimer <= 0) { if (!boss.hasDoneSecondJump) { boss.state = 'jump_charge_2'; boss.stateTimer = 25; boss.hasDoneSecondJump = true; } else { boss.state = 'idle'; boss.stateTimer = 90; } } break; case 'jump_charge_2': if (boss.stateTimer <= 0) { boss.state = 'jumping'; boss.vy = JUMP_FORCE * 2.0; } break; case 'throw_charge_1': if(boss.stateTimer <= 0){ boss.state = 'throw_attack_1'; boss.stateTimer = 15; } break; case 'throw_attack_1': if (boss.stateTimer === 14) { const dx = player.x - 100 - (boss.x + boss.width / 2); const distance = Math.abs(dx); let initialVy = -12 - (distance * 0.01); const timeToPeak = -initialVy / (GRAVITY * 0.5); const flightTime = timeToPeak * 2; const vx = dx / flightTime; projectiles.push({ x: boss.x + boss.width / 2, y: boss.y + boss.height / 2, width: 30, height: 30, vx: vx, vy: initialVy, type: 'barrel' }); } if (boss.stateTimer <= 0) { boss.state = 'throw_attack_2'; boss.stateTimer = 15; } break; case 'throw_attack_2': if (boss.stateTimer === 14) { const dx = player.x - (boss.x + boss.width / 2); const distance = Math.abs(dx); let initialVy = -14 - (distance * 0.01); const timeToPeak = -initialVy / (GRAVITY * 0.5); const flightTime = timeToPeak * 2; const vx = dx / flightTime; projectiles.push({ x: boss.x + boss.width / 2, y: boss.y + boss.height / 2, width: 30, height: 30, vx: vx, vy: initialVy, type: 'barrel' }); } if (boss.stateTimer <= 0) { boss.state = 'throw_attack_3'; boss.stateTimer = 15; } break; case 'throw_attack_3': if (boss.stateTimer === 14) { const dx = player.x + 100 - (boss.x + boss.width / 2); const distance = Math.abs(dx); let initialVy = -12 - (distance * 0.01); const timeToPeak = -initialVy / (GRAVITY * 0.5); const flightTime = timeToPeak * 2; const vx = dx / flightTime; projectiles.push({ x: boss.x + boss.width / 2, y: boss.y + boss.height / 2, width: 30, height: 30, vx: vx, vy: initialVy, type: 'barrel' }); } if (boss.stateTimer <= 0) { boss.state = 'idle'; boss.stateTimer = 60; } break; case 'climb_charge': if(boss.stateTimer <= 0){ boss.state = 'climbing'; const leftWall = platforms[2]; const rightWall = platforms[3]; const leftWallDist = Math.abs(boss.x - leftWall.x); const rightWallDist = Math.abs(boss.x - rightWall.x); boss.vx = (leftWallDist < rightWallDist) ? -PLAYER_SPEED * 1.2 : PLAYER_SPEED * 1.2; } break; case 'climbing': boss.vx = boss.vx; break; case 'on_wall': boss.vy = -PLAYER_SPEED * 1.2; break; case 'on_ceiling': boss.vx = player.x > boss.x ? PLAYER_SPEED : -PLAYER_SPEED; if(Math.abs(player.x - boss.x) < 20) { boss.vx = 0; boss.state = 'falling'; } break; case 'falling': break; case 'landing_hard': if (boss.stateTimer === 29) { camera.shakeDuration = 60; camera.shakeMagnitude = 20; if (player.onGround) { takeDamage(2); } circularShockwaves.push({ x: boss.x + boss.width/2, y: boss.groundY + boss.height - 10, radius: 20, maxRadius: canvas.width/2, speed: 6}); } if (boss.stateTimer <= 0) { boss.state = 'vulnerable'; boss.stateTimer = 120; boss.isVulnerable = true; } break; case 'vulnerable': if (boss.stateTimer <= 0) { boss.isVulnerable = false; boss.state = 'idle'; boss.stateTimer = 90; } break; case 'defeated': boss.y += 2; boss.vy = 0; boss.vx = 0; if(boss.stateTimer % 10 === 0) spawnExplosionParticles(boss.x + Math.random() * boss.width, boss.y + Math.random() * boss.height); if(boss.stateTimer <= 0) { boss = null; startEndGameTransition(); } break; } }
function updateCircularShockwaves() { for (let i = circularShockwaves.length - 1; i >= 0; i--) { const sw = circularShockwaves[i]; sw.radius += sw.speed; const dist = Math.abs((player.x + player.width / 2) - sw.x); if (player.onGround && Math.abs(dist - sw.radius) < (sw.speed + player.width/2) ) { takeDamage(2); circularShockwaves.splice(i,1); continue; } if (sw.radius > sw.maxRadius) { circularShockwaves.splice(i, 1); } } }

function update() {
    // --- LÓGICA DE TRANSIÇÃO ATUALIZADA ---
    if (transitionState === 'fadingOut') {
        transitionAlpha = Math.min(1, transitionAlpha + 0.03);
        if (transitionAlpha >= 1) {
            if (!isBossFightActive) { setupBossArena(); } 
            else { setupReturnToLevel(); }
            transitionState = 'fadingIn';
        }
        return;
    }
    if (transitionState === 'fadingIn') { transitionAlpha = Math.max(0, transitionAlpha - 0.03); if (transitionAlpha <= 0) { transitionState = 'none'; } }
    if (player.isDying) { player.vy += GRAVITY * 0.8; player.y += player.vy; player.rotation += 15; if (player.y > camera.y + canvas.height + 100) { showGameOverScreen(); } updateParticles(particles); updateParticles(hudParticles); return; }
    if (!isBossFightActive) { canEnterDoor = false; const door = decorations.find(d => d.emoji === '🚪'); if (door) { const checkBuffer = 20; if (player.x < door.x + door.width + checkBuffer && player.x + player.width > door.x - checkBuffer && player.y < door.y + door.height && player.y + player.height > door.y) { canEnterDoor = true; } } }
    player.vx = 0; if (keys.left) { player.vx = -player.speed * player.speedMultiplier; player.facingRight = false; } if (keys.right) { player.vx = player.speed * player.speedMultiplier; player.facingRight = true; } player.x += player.vx;
    player.vy += GRAVITY; player.vy = Math.min(player.vy, MAX_FALL_SPEED); player.y += player.vy;
    const wasOnGround = player.onGround; player.onGround = false;
    
    if (isBossFightActive) {
        platforms.forEach(platform => {
             if (player.x + player.width > platform.x && player.x < platform.x + platform.width && player.y + player.height > platform.y && player.y < platform.y + platform.height) {
                if (player.vy >= 0 && (player.y + player.height - player.vy) <= platform.y) { player.y = platform.y - player.height; player.vy = 0; player.onGround = true; player.doubleJumpUsed = false; }
                if (player.vy < 0 && (player.y - player.vy) >= (platform.y + platform.height)) { player.y = platform.y + platform.height; player.vy = 0; }
                if (player.vx > 0 && (player.x + player.width - player.vx) <= platform.x) { player.x = platform.x - player.width; }
                if (player.vx < 0 && (player.x - player.vx) >= (platform.x + platform.width)) { player.x = platform.x + platform.width; }
            }
        });
    } else {
        const nearbyPlatforms = platforms.filter(p => p.x < player.x + canvas.width && p.x + p.width > player.x - canvas.width);
        nearbyPlatforms.forEach(platform => {
            if (player.x + player.width > platform.x && player.x < platform.x + platform.width && player.vy >= 0) {
                const previousPlayerBottom = (player.y + player.height) - player.vy;
                if (previousPlayerBottom <= platform.y && (player.y + player.height) >= platform.y) { player.y = platform.y - player.height; player.vy = 0; player.onGround = true; player.doubleJumpUsed = false; }
            }
        });
    }

    if (player.onGround) { player.coyoteTimeCounter = COYOTE_TIME_FRAMES; } else { if (wasOnGround) { player.coyoteTimeCounter = COYOTE_TIME_FRAMES; } else { player.coyoteTimeCounter--; } }
    if (player.jumpBufferCounter > 0) { if (player.onGround) { player.vy = JUMP_FORCE; player.onGround = false; spawnJumpParticles(player.x + player.width / 2, player.y + player.height); player.jumpBufferCounter = 0; } else { player.jumpBufferCounter--; } }
    
    if (isBossFightActive) {
        updateBoss();
        updateCircularShockwaves();
        if (boss && boss.invulnerabilityTimer <= 0 && boss.state !== 'defeated' && player.x < boss.x + boss.width && player.x + player.width > boss.x && player.y < boss.y + boss.height && player.y + player.height > boss.y) {
            if (boss.isVulnerable && player.vy > 0) {
                boss.health--;
                boss.isVulnerable = false;
                boss.invulnerabilityTimer = 120;
                player.vy = STOMP_BOUNCE;
                camera.shakeDuration = 15; camera.shakeMagnitude = 6;
                if (boss.health <= 0) {
                     if (boss.phase === 'hard') { boss.state = 'defeated'; boss.stateTimer = 180; } 
                     else { boss.state = 'transitioning'; }
                }
            } else { takeDamage(2); }
        }
    } else {
        items.forEach((item, index) => { if (player.x < item.x + item.width && player.x + player.width > item.x && player.y < item.y + item.height && player.y + player.height > item.y) { collectItem(item.type); items.splice(index, 1); } });
        enemies.forEach((enemy, index) => { if (player.x < enemy.x + enemy.width && player.x + player.width > enemy.x && player.y < enemy.y + enemy.height && player.y + player.height > enemy.y) { const isStomp = player.vy > 0 && (player.y + player.height - player.vy) <= enemy.y + 10; const isStarKill = player.isImmune && player.powerUp === 'star'; if (isStomp || isStarKill) { let isOverVoid = true; const checkDistance = 50; for (const p of platforms) { if (enemy.x + enemy.width > p.x && enemy.x < p.x + p.width && enemy.y < p.y && p.y < enemy.y + enemy.height + checkDistance) { isOverVoid = false; break; } } if (isOverVoid) { let closestPlatformAbove = null; let minDistance = Infinity; for (const p of platforms) { if (enemy.x + enemy.width > p.x && enemy.x < p.x + p.width && p.y < enemy.y) { const distance = enemy.y - (p.y + p.height); if (distance < minDistance) { minDistance = distance; closestPlatformAbove = p; } } } if (closestPlatformAbove) { const jumpHeight = minDistance + player.height; player.vy = -Math.sqrt(2 * GRAVITY * jumpHeight) * 1.1; } else { player.vy = JUMP_FORCE * 1.2; } } else if (isStomp) { player.vy = STOMP_BOUNCE; } spawnExplosionParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2); enemies.splice(index, 1); player.xp += 10; xpShakeTimer = 20; triggerKillEffects(); updateBossEligibility(); } else if (!player.isImmune) { takeDamage(enemy.type === 'ghost' ? 1 : 2); } } });
        const despawnX = camera.x - canvas.width; platforms = platforms.filter(p => p.x + p.width > despawnX); items = items.filter(i => i.x + i.width > despawnX); enemies = enemies.filter(e => e.x + e.width > despawnX); gravestones = gravestones.filter(g => g.x > despawnX); decorations = decorations.filter(d => d.x + 200 > despawnX);
    }
    
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.x += p.vx;
        if (p.type === 'barrel') { p.vy += GRAVITY * 0.5; p.y += p.vy; }
        if (player.x < p.x + p.width && player.x + player.width > p.x && player.y < p.y + p.height && player.y + player.height > p.y) { if (!player.isImmune) takeDamage(p.type === 'barrel' ? 2 : 3); projectiles.splice(i, 1); continue; }
        if (p.y > camera.y + canvas.height / 2) { projectiles.splice(i, 1); continue; }
    }

    if (!isBossFightActive) { if (camera.zoomOverrideTimer > 0) { camera.zoomOverrideTimer--; } else { camera.targetZoom = player.vx !== 0 ? 1.1 : 1.0; } camera.x += (player.x - camera.x) * 0.05; camera.y += (player.y - camera.y) * 0.05; if (player.x > generationCursor.x - canvas.width * 2) { stampRoom(null, transitionState === 'none'); } } else { camera.zoom += (1.0 - camera.zoom) * 0.04; }
    
    updateEnemies(); updatePowerUp(); updateParticles(particles); updateParticles(hudParticles);
    if (player.powerUp === 'bolt' && player.vx !== 0) { if (Math.random() < 0.7) { spawnSpeedParticles(player.x + player.width / 2, player.y + player.height / 2); } }
    if (xpShakeTimer > 0) { const shakeX = (Math.random() - 0.5) * 8; const shakeY = (Math.random() - 0.5) * 8; xpTextDisplay.style.transform = `translate(${shakeX}px, ${shakeY}px) scale(1.5) rotate(10deg)`; xpTextDisplay.style.color = 'yellow'; xpTextDisplay.style.fontWeight = 'bold'; xpShakeTimer--; } else { xpTextDisplay.style.transform = 'translate(0, 0) scale(1) rotate(0deg)'; xpTextDisplay.style.color = 'white'; xpTextDisplay.style.fontWeight = 'normal'; }
    const bottomOfScreen = camera.y + (canvas.height / 2) / camera.zoom; if (!isBossFightActive && player.y > bottomOfScreen) { startDeathSequence(); }
    if (bgFlashTimer > 0) { bgFlashTimer--; } else { targetBgColor = { ...defaultBgColor }; } currentBgColor.r += (targetBgColor.r - currentBgColor.r) * 0.1; currentBgColor.g += (targetBgColor.g - currentBgColor.g) * 0.1; currentBgColor.b += (targetBgColor.b - currentBgColor.b) * 0.1;
}

function draw() { const bgR = Math.round(currentBgColor.r); const bgG = Math.round(currentBgColor.g); const bgB = Math.round(currentBgColor.b); canvas.style.backgroundColor = `rgb(${bgR}, ${bgG}, ${bgB})`; ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.save(); let shakeX = 0; let shakeY = 0; if (camera.shakeDuration > 0) { shakeX = (Math.random() - 0.5) * camera.shakeMagnitude; shakeY = (Math.random() - 0.5) * camera.shakeMagnitude; camera.shakeDuration--; } ctx.translate(canvas.width / 2, canvas.height / 2); ctx.scale(camera.zoom, camera.zoom); ctx.translate(-camera.x - shakeX, -camera.y - shakeY); ctx.fillStyle = '#4a4a4a'; platforms.forEach(p => { ctx.fillRect(p.x, p.y, p.width, p.height); }); particles.forEach(p => { ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); }); ctx.fillStyle = '#FFFFFF'; ctx.font = '40px sans-serif'; gravestones.forEach(g => { ctx.save(); if (g.facingRight) { ctx.translate(g.x + 40, g.y); ctx.scale(-1, 1); ctx.fillText('🦽', 0, 0); } else { ctx.fillText('🦽', g.x, g.y); } ctx.restore(); }); ctx.font = '50px sans-serif'; decorations.forEach(d => { ctx.fillText(d.emoji, d.x, d.y + 50); if (canEnterDoor) { ctx.font = '30px sans-serif'; ctx.fillStyle = 'yellow'; ctx.fillText('W', d.x + 10, d.y); } }); ctx.font = '30px sans-serif'; items.forEach(item => { let emoji = ''; switch(item.type) { case 'xp': emoji = '🔆'; break; case 'health': emoji = '💊'; break; case 'star': emoji = '⭐'; break; case 'boots': emoji = '👣'; break; case 'bolt': emoji = '⚡'; break; } ctx.fillText(emoji, item.x, item.y + item.height); }); enemies.forEach(enemy => { ctx.save(); ctx.font = '40px sans-serif'; let emoji = ''; switch(enemy.type) { case 'ghost': emoji = '👻'; break; case 'flyer': emoji = '👾'; break; case 'dragon': emoji = '🐉'; if (enemy.facingDirection > 0) { ctx.translate(enemy.x + enemy.width, enemy.y); ctx.scale(-1, 1); ctx.fillText(emoji, 0, enemy.height); } else { ctx.fillText(emoji, enemy.x, enemy.y + enemy.height); } break; } if (enemy.type !== 'dragon') { ctx.fillText(emoji, enemy.x, enemy.y + enemy.height); } if (enemy.isWarning) { ctx.font = '20px sans-serif'; let warningX = enemy.facingDirection > 0 ? enemy.x + enemy.width : enemy.x - 25; if (enemy.type === 'dragon' && enemy.facingDirection > 0) { warningX = -25; } ctx.fillText('♨️', warningX, enemy.y + enemy.height - 15); } ctx.restore(); });
    ctx.font = '30px sans-serif'; projectiles.forEach(p => { if (p.type === 'barrel') { ctx.fillText('📦', p.x, p.y + p.height); } else { ctx.fillStyle = 'orange'; ctx.fillText('🔥', p.x, p.y + p.height); } });
    if (isBossFightActive) { 
        if(boss && boss.state === 'falling') {
            ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(boss.x + boss.width / 2, boss.groundY + boss.height, boss.width / 2.5, 10, 0, 0, 2 * Math.PI); ctx.fill();
        }
        circularShockwaves.forEach(sw => {
            ctx.strokeStyle = 'cyan'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2); ctx.stroke();
        });
        if (boss) {
            ctx.save(); if (boss.isVulnerable) { ctx.globalAlpha = 0.7 + Math.sin(Date.now() / 100) * 0.3; } if (boss.state === 'defeated') { ctx.globalAlpha = boss.stateTimer / 180; } ctx.font = '80px sans-serif'; ctx.fillText(boss.emoji, boss.x, boss.y + boss.height); ctx.restore(); 
        }
    }
    ctx.save(); if (player.isDying) { ctx.font = '50px sans-serif'; ctx.translate(player.x + player.width / 2, player.y + player.height / 2); ctx.rotate(player.rotation * Math.PI / 180); ctx.fillText('🤸', -player.width / 2, player.height / 2); } else { if (player.isImmune) { ctx.globalAlpha = (Math.sin(Date.now() / 50) + 1) / 2 * 0.5 + 0.5; if (player.powerUp === 'star') { ctx.shadowColor = 'yellow'; ctx.shadowBlur = 20; } } ctx.font = '50px sans-serif'; if (player.facingRight) { ctx.translate(player.x + player.width, player.y); ctx.scale(-1, 1); ctx.fillText('👨‍🦼', 0, player.height); } else { ctx.fillText('👨‍🦼', player.x, player.y + player.height); } } ctx.restore();
    ctx.restore();
    ctx.save(); if (transitionState !== 'none') { const color = transitionColor === 'white' ? '255,255,255' : '0,0,0'; ctx.fillStyle = `rgba(${color}, ${transitionAlpha})`; ctx.fillRect(0, 0, canvas.width, canvas.height); } ctx.restore();
    hudParticles.forEach(p => { ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); });
}

function drawHUD() {
    healthDisplay.innerHTML = '❤️'.repeat(player.health); xpTextDisplay.textContent = player.xp;
    if (isBossFightActive && boss) {
        bossHud.style.display = 'block';
        const healthPercent = (boss.health / boss.maxHealthForPhase) * 100;
        bossHealthBar.style.width = `${healthPercent}%`;
        if(boss.phase === 'easy') { bossPhaseIcons.textContent = '🦍🦍🦍'; }
        else if (boss.phase === 'medium') { bossPhaseIcons.textContent = '🦍🦍'; }
        else if (boss.phase === 'hard') { bossPhaseIcons.textContent = '🦍'; }
    } else {
        bossHud.style.display = 'none';
    }
    let powerUpHTML = ''; if (player.powerUp) { switch(player.powerUp) { case 'star': powerUpHTML = '⭐'; break; case 'boots': powerUpHTML = '👣'; break; case 'bolt': powerUpHTML = '⚡'; break; } } powerUpDisplay.innerHTML = powerUpHTML; if (player.powerUpTimer > 0 && player.powerUpTimer < 300) { powerUpDisplay.classList.toggle('blinking', Math.floor(player.powerUpTimer / 30) % 2 === 0); } else { powerUpDisplay.classList.remove('blinking'); }
}

function gameLoop() { if (!gameRunning && !player.isDying) { cancelAnimationFrame(gameLoopId); return; } update(); draw(); drawHUD(); gameLoopId = requestAnimationFrame(gameLoop); }
window.addEventListener('keydown', e => { if (!gameRunning) return; if (e.code === 'KeyW' && canEnterDoor && !isBossFightActive) { startBossTransition(); return; } switch (e.code) { case 'KeyA': case 'ArrowLeft': keys.left = true; break; case 'KeyD': case 'ArrowRight': keys.right = true; break; case 'Space': if (player.coyoteTimeCounter > 0) { player.vy = JUMP_FORCE; player.onGround = false; player.coyoteTimeCounter = 0; spawnJumpParticles(player.x + player.width / 2, player.y + player.height); } else if (player.canDoubleJump && !player.doubleJumpUsed) { player.vy = JUMP_FORCE * 0.9; player.doubleJumpUsed = true; spawnJumpParticles(player.x + player.width / 2, player.y + player.height); } else { player.jumpBufferCounter = JUMP_BUFFER_FRAMES; } break; case 'KeyS': case 'ArrowDown': if (player.onGround && !isBossFightActive) { player.y += 5; player.onGround = false; } break; } });
window.addEventListener('keyup', e => { if (!gameRunning) return; switch (e.code) { case 'KeyA': case 'ArrowLeft': keys.left = false; break; case 'KeyD': case 'ArrowRight': keys.right = false; break; } });
startButton.addEventListener('click', () => { startScreen.style.display = 'none'; init(); gameRunning = true; gameLoop(); });
restartButton.addEventListener('click', () => { gameOverScreen.style.display = 'none'; init(); gameRunning = true; gameLoop(); });
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
function collectItem(type) { switch (type) { case 'xp': player.xp += 5; xpShakeTimer = 20; updateBossEligibility(); break; case 'health': if (player.health < player.maxHealth) { const heartX = 15 + (player.health * 24) + 12; const heartY = 15 + 12; player.health++; spawnHudParticles(heartX, heartY, '255, 255, 0'); triggerBackgroundFlash({ r: 13, g: 50, b: 46 }, 20); } break; case 'star': case 'boots': case 'bolt': startPowerUp(type, type === 'star' ? 15*60 : type === 'boots' ? 30*60 : 25*60); triggerBackgroundFlash({ r: 30, g: 50, b: 80 }, 20); break; } }
function takeDamage(amount) { if (player.isImmune || player.isDying) return; if(isBossFightActive && boss && boss.isVulnerable) return; let finalDamage = amount; if (amount === 3 && player.health <= 3) { finalDamage = player.health - 1; } const heartX = 15 + ((player.health - 1) * 24) + 12; const heartY = 15 + 12; player.health -= finalDamage; spawnHudParticles(heartX, heartY, '255, 50, 50'); camera.shakeDuration = 20; camera.shakeMagnitude = 8; triggerBackgroundFlash({ r: 0, g: 0, b: 0 }, 15); if (player.health <= 0) { player.health = 0; startDeathSequence(); } else { player.isImmune = true; setTimeout(() => { if (player.powerUp !== 'star') { player.isImmune = false; } }, 2000); } }
function startPowerUp(type, duration) { endPowerUp(); player.powerUp = type; player.powerUpTimer = duration; switch(type) { case 'star': player.isImmune = true; break; case 'boots': player.canDoubleJump = true; break; case 'bolt': player.speedMultiplier = 1.5; break; } }
function endPowerUp() { if (!player.powerUp) return; switch(player.powerUp) { case 'star': player.isImmune = false; break; case 'boots': player.canDoubleJump = false; break; case 'bolt': player.speedMultiplier = 1; break; } player.powerUp = null; player.powerUpTimer = 0; }
function startDeathSequence() { if (player.isDying) return; player.isDying = true; player.vy = JUMP_FORCE * 0.8; const gravestoneX = player.x; const gravestoneY = player.y + player.height - 20; gravestones.push({ x: gravestoneX, y: gravestoneY, facingRight: player.facingRight }); spawnHudParticles(gravestoneX, gravestoneY, '255, 50, 50'); targetBgColor = { r: 0, g: 0, b: 0 }; }
function showGameOverScreen() { if (!gameRunning && !player.isDying) return; gameRunning = false; player.isDying = false; cancelAnimationFrame(gameLoopId); bossHud.style.display = 'none'; finalScoreDisplay.textContent = `Sua pontuação final: ${player.xp} 🔆`; gameOverScreen.style.display = 'flex'; }
function triggerBackgroundFlash(color, duration) { targetBgColor = color; bgFlashTimer = duration; }
function triggerKillEffects() { camera.shakeDuration = 10; camera.shakeMagnitude = 4; camera.targetZoom = 1.15; camera.zoomOverrideTimer = 15; }
function updatePowerUp() { if (player.powerUpTimer > 0) { player.powerUpTimer--; if (player.powerUpTimer <= 0) { endPowerUp(); } } }
function updateEnemies() { enemies.forEach(enemy => { switch(enemy.type) { case 'ghost': enemy.x += enemy.vx; if (enemy.x < enemy.platform.x || enemy.x + enemy.width > enemy.platform.x + enemy.platform.width) { enemy.vx *= -1; } break; case 'flyer': let targetX = player.x; enemy.x += (targetX - enemy.x) * 0.01; enemy.y = enemy.initialY + Math.sin(Date.now() / 500) * 20; break; case 'dragon': enemy.facingDirection = (player.x < enemy.x) ? -1 : 1; if (enemy.shootCooldown > 0) { enemy.shootCooldown--; enemy.isWarning = enemy.shootCooldown < 60; } else { projectiles.push({ x: enemy.x + (enemy.facingDirection > 0 ? enemy.width : 0), y: enemy.y + enemy.height / 2, width: 20, height: 10, vx: 8 * enemy.facingDirection, type: 'fireball' }); enemy.shootCooldown = 180 + Math.random() * 60; enemy.isWarning = false; } break; } }); }