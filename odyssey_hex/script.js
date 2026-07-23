const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayDesc = document.getElementById('overlay-desc');
const restartBtn = document.getElementById('restart-btn');
const eventToast = document.getElementById('event-toast');
const turnVal = document.getElementById('turn-val');
const compassArrow = document.getElementById('compass-arrow');
const staminaText = document.getElementById('stamina-text');
const staminaBar = document.getElementById('stamina-bar');
const healthText = document.getElementById('health-text');
const healthBar = document.getElementById('health-bar');
const crewText = document.getElementById('crew-text');
const crewBar = document.getElementById('crew-bar');

const gridRadius = 20;
const hexRadius = 25;
let hexes = new Map();
let player = { q: 0, r: 0 };
let goal = { q: 0, r: 0 };
let entities = new Map();

let state = {
    turn: 1,
    stamina: 150,
    health: 100,
    crew: 50,
    maxStamina: 150,
    maxHealth: 100,
    maxCrew: 50,
    windDir: 0,
    windTimer: 3,
    gameOver: false,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0
};

const hexDirs = [
    { q: 1, r: 0 },
    { q: 0, r: 1 },
    { q: -1, r: 1 },
    { q: -1, r: 0 },
    { q: 0, r: -1 },
    { q: 1, r: -1 }
];

const colors = {
    ocean: '#0f2c44',
    hex: '#153959',
    hover: '#1f507a',
    island: '#4a6c40',
    bigisland: '#35522c',
    cliff: '#6b6b6b',
    danger: '#c0392b',
    monster: '#5b2c6f',
    whirlpool: '#1abc9c',
    goal: '#f39c12',
    ship: '#e67e22'
};

function getNeighbors(q, r) {
    let neighbors = [];
    for (let d of hexDirs) {
        let nq = q + d.q;
        let nr = r + d.r;
        if (Math.abs(nq) <= gridRadius && Math.abs(nr) <= gridRadius && Math.abs(nq + nr) <= gridRadius) {
            neighbors.push({ q: nq, r: nr });
        }
    }
    return neighbors;
}

function initGame() {
    state = { 
        turn: 1, stamina: 150, health: 100, crew: 50, maxStamina: 150, maxHealth: 100, maxCrew: 50, 
        windDir: Math.floor(Math.random() * 6), windTimer: Math.floor(Math.random() * 3) + 3, gameOver: false,
        offsetX: 0, offsetY: 0, isDragging: false, lastMouseX: 0, lastMouseY: 0
    };
    hexes.clear();
    entities.clear();
    player = { q: 0, r: 0 };
    
    for (let q = -gridRadius; q <= gridRadius; q++) {
        let r1 = Math.max(-gridRadius, -q - gridRadius);
        let r2 = Math.min(gridRadius, -q + gridRadius);
        for (let r = r1; r <= r2; r++) {
            hexes.set(`${q},${r}`, { q, r });
        }
    }

    let seeds = [];
    for (let i = 0; i < 30; i++) {
        let sq = Math.floor(Math.random() * (gridRadius * 2 + 1)) - gridRadius;
        let sr = Math.floor(Math.random() * (gridRadius * 2 + 1)) - gridRadius;
        if (Math.abs(sq + sr) <= gridRadius) {
            seeds.push({ q: sq, r: sr, type: Math.random() > 0.4 ? 'cliff' : 'bigisland' });
        }
    }

    seeds.forEach(seed => {
        let curr = { q: seed.q, r: seed.r };
        let walkLen = Math.floor(Math.random() * 15) + 10;
        for (let w = 0; w < walkLen; w++) {
            if (Math.abs(curr.q) <= gridRadius && Math.abs(curr.r) <= gridRadius && Math.abs(curr.q + curr.r) <= gridRadius) {
                if (Math.abs(curr.q) > 2 || Math.abs(curr.r) > 2) { 
                    entities.set(`${curr.q},${curr.r}`, { type: seed.type });
                }
            }
            let ns = getNeighbors(curr.q, curr.r);
            if (ns.length > 0) {
                curr = ns[Math.floor(Math.random() * ns.length)];
            }
        }
    });

    let edgeHexes = [];
    hexes.forEach(hex => {
        const key = `${hex.q},${hex.r}`;
        const isEdge = Math.abs(hex.q) === gridRadius || Math.abs(hex.r) === gridRadius || Math.abs(hex.q + hex.r) === gridRadius;
        
        if (isEdge && !entities.has(key)) {
            edgeHexes.push(hex);
        } else if (!entities.has(key) && (Math.abs(hex.q) > 2 || Math.abs(hex.r) > 2)) {
            let rand = Math.random();
            if (rand < 0.02) entities.set(key, { type: 'island' });
            else if (rand < 0.05) entities.set(key, { type: 'whirlpool' });
            else if (rand < 0.08) entities.set(key, { type: 'monster' });
        }
    });

    if (edgeHexes.length > 0) {
        goal = edgeHexes[Math.floor(Math.random() * edgeHexes.length)];
    } else {
        goal = { q: gridRadius, r: 0 };
        entities.delete(`${goal.q},${goal.r}`);
    }

    overlay.classList.add('hidden');
    resize();
    updateHUD();
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw();
}

function hexToPixel(q, r) {
    const x = hexRadius * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
    const y = hexRadius * (3 / 2 * r);
    return { x: x + canvas.width / 2 + state.offsetX, y: y + canvas.height / 2 + state.offsetY };
}

function pixelToHex(x, y) {
    const cx = x - canvas.width / 2 - state.offsetX;
    const cy = y - canvas.height / 2 - state.offsetY;
    const q = (Math.sqrt(3) / 3 * cx - 1 / 3 * cy) / hexRadius;
    const r = (2 / 3 * cy) / hexRadius;
    return hexRound(q, r, -q - r);
}

function hexRound(q, r, s) {
    let rq = Math.round(q);
    let rr = Math.round(r);
    let rs = Math.round(s);
    const qDiff = Math.abs(rq - q);
    const rDiff = Math.abs(rr - r);
    const sDiff = Math.abs(rs - s);
    if (qDiff > rDiff && qDiff > sDiff) {
        rq = -rr - rs;
    } else if (rDiff > sDiff) {
        rr = -rq - rs;
    }
    return { q: rq, r: rr };
}

function drawHex(ctx, x, y, size, fillStr, strokeStr) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const hx = x + size * Math.cos(angle);
        const hy = y + size * Math.sin(angle);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.fillStyle = fillStr;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = strokeStr;
    ctx.stroke();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    hexes.forEach(hex => {
        const pos = hexToPixel(hex.q, hex.r);
        
        if (pos.x < -hexRadius * 2 || pos.x > canvas.width + hexRadius * 2 || pos.y < -hexRadius * 2 || pos.y > canvas.height + hexRadius * 2) {
            return;
        }

        let color = colors.hex;
        let stroke = 'rgba(212, 175, 55, 0.1)';

        if (hex.q === goal.q && hex.r === goal.r) {
            color = colors.goal;
            stroke = colors.goal;
        } else if (entities.has(`${hex.q},${hex.r}`)) {
            const ent = entities.get(`${hex.q},${hex.r}`);
            if (ent.type === 'island') color = colors.island;
            if (ent.type === 'whirlpool') color = colors.whirlpool;
            if (ent.type === 'monster') color = colors.monster;
            if (ent.type === 'cliff') color = colors.cliff;
            if (ent.type === 'bigisland') color = colors.bigisland;
        }
        
        drawHex(ctx, pos.x, pos.y, hexRadius - 1, color, stroke);
    });

    const pPos = hexToPixel(player.q, player.r);
    if (pPos.x >= -hexRadius * 2 && pPos.x <= canvas.width + hexRadius * 2 && pPos.y >= -hexRadius * 2 && pPos.y <= canvas.height + hexRadius * 2) {
        ctx.beginPath();
        ctx.arc(pPos.x, pPos.y, hexRadius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = colors.ship;
        ctx.fill();
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function getMoveDirIndex(dq, dr) {
    for (let i = 0; i < 6; i++) {
        if (hexDirs[i].q === dq && hexDirs[i].r === dr) return i;
    }
    return -1;
}

function calculateCost(dq, dr) {
    const moveIdx = getMoveDirIndex(dq, dr);
    if (moveIdx === -1) return 0;
    
    let diff = Math.abs(moveIdx - state.windDir) % 6;
    if (diff > 3) diff = 6 - diff;
    
    let baseCost = 0;
    if (diff === 0) baseCost = 1;
    else if (diff === 1 || diff === 2) baseCost = 3;
    else if (diff === 3) baseCost = 8;
    
    const multiplier = state.maxCrew / Math.max(1, state.crew);
    return Math.ceil(baseCost * multiplier);
}

function showToast(msg) {
    eventToast.textContent = msg;
    eventToast.classList.remove('hidden');
    setTimeout(() => {
        eventToast.classList.add('hidden');
    }, 2500);
}

function endGame(win, msg) {
    state.gameOver = true;
    overlayTitle.textContent = win ? "VICTORY" : "TRAGEDY";
    overlayTitle.style.color = win ? "#d4af37" : "#c0392b";
    overlayDesc.textContent = msg;
    overlay.classList.remove('hidden');
}

function updateHUD() {
    turnVal.textContent = state.turn;
    
    const angle = state.windDir * 60;
    compassArrow.style.transform = `rotate(${angle}deg)`;
    
    staminaText.textContent = `${state.stamina}/${state.maxStamina}`;
    staminaBar.style.width = `${(state.stamina / state.maxStamina) * 100}%`;
    
    healthText.textContent = `${state.health}/${state.maxHealth}`;
    healthBar.style.width = `${(state.health / state.maxHealth) * 100}%`;
    
    crewText.textContent = `${state.crew}/${state.maxCrew}`;
    crewBar.style.width = `${(state.crew / state.maxCrew) * 100}%`;
    
    if (state.stamina <= 0 || state.health <= 0 || state.crew <= 0) {
        if (!state.gameOver) endGame(false, "The sea claims another vessel. Your epic ends here.");
    }
}

canvas.addEventListener('contextmenu', e => e.preventDefault());

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 2) {
        state.isDragging = true;
        state.lastMouseX = e.clientX;
        state.lastMouseY = e.clientY;
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (state.isDragging) {
        state.offsetX += e.clientX - state.lastMouseX;
        state.offsetY += e.clientY - state.lastMouseY;
        state.lastMouseX = e.clientX;
        state.lastMouseY = e.clientY;
        draw();
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (e.button === 2) {
        state.isDragging = false;
    }
});

canvas.addEventListener('mouseleave', () => {
    state.isDragging = false;
});

canvas.addEventListener('click', (e) => {
    if (state.gameOver) return;
    
    const hex = pixelToHex(e.clientX, e.clientY);
    const key = `${hex.q},${hex.r}`;
    
    if (!hexes.has(key)) return;
    
    if (entities.has(key)) {
        const ent = entities.get(key);
        if (ent.type === 'cliff' || ent.type === 'bigisland') {
            return;
        }
    }
    
    const dq = hex.q - player.q;
    const dr = hex.r - player.r;
    
    if (Math.abs(dq) <= 1 && Math.abs(dr) <= 1 && Math.abs(dq + dr) <= 1) {
        if (dq === 0 && dr === 0) return;
        
        const cost = calculateCost(dq, dr);
        state.stamina -= cost;
        player.q = hex.q;
        player.r = hex.r;
        state.turn++;
        state.windTimer--;
        
        if (state.windTimer <= 0) {
            state.windDir = Math.floor(Math.random() * 6);
            state.windTimer = Math.floor(Math.random() * 3) + 3;
            showToast("The winds of Aeolus shift!");
        }

        if (player.q === goal.q && player.r === goal.r) {
            updateHUD();
            draw();
            endGame(true, "You have reached Ithaca. The Odyssey is complete.");
            return;
        }

        if (entities.has(key)) {
            const ent = entities.get(key);
            if (ent.type === 'island') {
                if (Math.random() > 0.5) {
                    const gain = Math.floor(Math.random() * 11) + 10;
                    state.stamina = Math.min(state.maxStamina, state.stamina + gain);
                    showToast(`Scavenged supplies! +${gain} Stamina`);
                } else {
                    showToast("The isle was barren.");
                }
                entities.delete(key);
            } else if (ent.type === 'whirlpool') {
                const hDmg = Math.floor(Math.random() * 11) + 10;
                const cDmg = Math.floor(Math.random() * 4) + 2;
                state.health -= hDmg;
                state.crew -= cDmg;
                showToast(`Charybdis! -${hDmg} Health, -${cDmg} Crew`);
                entities.delete(key);
            } else if (ent.type === 'monster') {
                const cDmg = Math.floor(Math.random() * 6) + 5;
                state.crew -= cDmg;
                showToast(`Scylla strikes! -${cDmg} Crew`);
                entities.delete(key);
            }
        }
        
        updateHUD();
        draw();
    }
});

restartBtn.addEventListener('click', () => {
    initGame();
});

window.addEventListener('resize', resize);

initGame();
